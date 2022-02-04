import fetch from "cross-fetch";
import EventEmitter from "events";
import type {
  GameClientLobbyPayload,
  GameClientLobbyPayloadStatic,
  PlayerPayload,
  PlayerData,
  TeamTypes,
  LobbyUpdates,
  PlayerTeamsData,
  TeamData,
  LobbyAppSettings,
} from "./utility";
require = require("esm")(module);
var { Combination, Permutation } = require("js-combinatorics");

export class WarLobby extends EventEmitter {
  #appSettings: LobbyAppSettings;
  #refreshing: boolean = false;
  #staleTimer: NodeJS.Timeout | null = null;

  allPlayers: Array<string> = [];
  nonSpecPlayers: Array<string> = [];

  lookupName: string = "";
  eloAvailable: boolean = false;
  #isTargetMap: boolean = true;
  bestCombo: Array<string> | Array<Array<string>> = [];
  region: "us" | "eu" = "eu";
  voteStartVotes: Array<string> = [];
  slots: { [key: string]: PlayerPayload } = {};
  #slotLookup: { [key: string]: number } = {};
  lobbyStatic: GameClientLobbyPayloadStatic | null = null;
  playerData: {
    [key: string]: PlayerData;
  } = {};
  chatMessages: Array<{ name: string; message: string; time: number }> = [];
  teamList: { otherTeams: TeamData; specTeams: TeamData; playerTeams: TeamData } = {
    otherTeams: { data: {}, lookup: {} },
    specTeams: { data: {}, lookup: {} },
    playerTeams: { data: {}, lookup: {} },
  };
  #teamListLookup: {
    [key: string]: { type: TeamTypes; name: string };
  } = {};

  constructor(
    eloType: "wc3stats" | "pyroTD" | "off",
    wc3StatsVariant: string,
    balanceTeams: boolean,
    excludeHostFromSwap: boolean,
    moveToSpec: boolean,
    moveToTeam: string,
    closeSlots: Array<number>,
    mapPath: string
  ) {
    super();
    this.#appSettings = {
      eloType,
      moveToSpec,
      moveToTeam,
      balanceTeams,
      wc3StatsVariant,
      excludeHostFromSwap,
      closeSlots,
      mapPath,
    };
  }

  updateSetting(setting: keyof LobbyAppSettings, value: any) {
    if (this.#appSettings[setting] !== undefined) {
      if (typeof this.#appSettings[setting] === typeof value) {
        // @ts-ignore
        this.#appSettings[setting] = value;
        this.emitInfo(`Updated lobby: ${setting} to ${value}`);
      } else {
        this.emitError(`Lobby update failed. Unrecognized ${setting}, ${value}`);
      }
    }
  }

  clear() {
    this.lookupName = "";
    this.eloAvailable = false;
    this.region = "eu";
    this.voteStartVotes = [];
    this.#slotLookup = {};
    this.lobbyStatic = null;
    this.slots = {};
    this.playerData = {};
    this.chatMessages = [];
    this.teamList = {
      otherTeams: { data: {}, lookup: {} },
      specTeams: { data: {}, lookup: {} },
      playerTeams: { data: {}, lookup: {} },
    };
    this.#teamListLookup = {};
    this.bestCombo = [];
    if (this.#staleTimer) {
      clearTimeout(this.#staleTimer);
      this.#staleTimer = null;
    }
  }

  async cleanMapName(mapName: string) {
    if (this.#appSettings.eloType === "wc3stats" || this.#appSettings.eloType === "off") {
      if (mapName.match(/(HLW)/i)) {
        return { name: "HLW", elo: true };
      } else if (mapName.match(/(pyro\s*td\s*league)/i)) {
        return { name: "Pyro%20TD", elo: true };
      } else if (mapName.match(/(vampirism\s*fire)/i)) {
        return { name: "Vampirism%20Fire", elo: true };
      } else if (mapName.match(/(footmen.*vs.*grunts)/i)) {
        return { name: "Footmen%20Vs%20Grunts", elo: true };
      } else if (mapName.match(/Broken.*Alliances/i)) {
        return { name: "Broken%20Alliances", elo: true };
      } else if (mapName.match(/Reforged.*Footmen.*Frenzy/i)) {
        return { name: "Reforged%20Footmen%20Frenzy", elo: true };
      } else if (mapName.match(/Direct.*Strike.*Reforged/i)) {
        return { name: "Direct%20Strike", elo: true };
      } else if (mapName.match(/WW3.*Diplomacy/i)) {
        return { name: "WW3%20Diplomacy", elo: true };
      } else if (mapName.match(/Legion.*TD/i)) {
        return { name: "Legion%20TD", elo: true };
      } else if (mapName.match(/Tree.*Tag/i)) {
        return { name: "Tree%20Tag", elo: true };
      } else {
        let name = encodeURI(
          encodeURI(mapName.trim().replace(/\s*v?\.?(\d+\.)?(\*|\d+)\w*\s*$/gi, ""))
        );
        let test = await (await fetch(`https://api.wc3stats.com/maps/${name}`)).json();
        return { name, elo: test.status === "ok" };
      }
    } else throw new Error("Unknown or unsupported type");
  }

  staleLobby() {
    if (this.allPlayers.length < 2) {
      this.emitInfo("Try to refresh possibly stale lobby");
      this.emitUpdate({ stale: true });
    } else {
      this.emitInfo("Refreshing possibly stale lobby");
      this.refreshGame();
    }
  }

  initStaleLobbyCheck() {
    if (this.#staleTimer) {
      clearTimeout(this.#staleTimer);
      this.#staleTimer = null;
    }
    this.#staleTimer = setInterval(this.staleLobby.bind(this), 1000 * 60 * 15);
  }

  async processLobby(payload: GameClientLobbyPayload, region: "us" | "eu") {
    const { teamData, availableTeamColors, players, ...staticFields } = payload;
    if (!this.lobbyStatic || this.lobbyStatic.lobbyName !== staticFields.lobbyName) {
      // The fields are changed, must be a new lobby!
      this.clear();
      if (
        staticFields.playerHost &&
        payload.players[0] &&
        Object.values(payload.players).find((slot) => slot.isSelf) !== undefined
      ) {
        this.initStaleLobbyCheck();
        this.lobbyStatic = staticFields;
        if (
          staticFields.mapData.mapPath.split(/\/|\\/).slice(-1)[0] !==
          this.#appSettings.mapPath.split(/\/|\\/).slice(-1)[0]
        ) {
          this.#isTargetMap = false;
        } else {
          this.#isTargetMap = true;
        }
        this.region = region;
        this.lobbyStatic.mapData.mapPath = staticFields.mapData.mapPath.substring(
          staticFields.mapData.mapPath.lastIndexOf("/") + 1
        );
        let lookup = await this.cleanMapName(this.lobbyStatic.mapData.mapPath);
        this.lookupName = lookup.name;
        this.eloAvailable = lookup.elo;
        for (const team of payload.teamData.teams) {
          const teamName = team.name;
          let teamType: TeamTypes = "playerTeams";
          let players = payload.players.filter((player) => player.team === team.team);
          if (this.lobbyStatic.isHost) {
            if (players.filter((player) => player.isObserver).length > 0) {
              teamType = "specTeams";
            } else if (
              players.filter((player) => player.slotTypeChangeEnabled).length === 0
            ) {
              teamType = "otherTeams";
            } else if (this.testTeam(teamName) === "specTeams") {
              teamType = "specTeams";
            }
          } else {
            if (players.filter((player) => player.isObserver).length > 0) {
              teamType = "specTeams";
            } else if (
              players.filter((player) => player.slotStatus === 2 && !player.playerRegion)
                .length === players.length
            ) {
              teamType = "otherTeams";
            } else if (this.testTeam(teamName) === "specTeams") {
              teamType = "specTeams";
            }
          }

          this.teamList[teamType].data[teamName] = team.team;
          this.teamList[teamType].lookup[team.team] = teamName;
          this.#teamListLookup[team.team] = {
            type: teamType,
            name: teamName,
          };
        }
        payload.players.forEach((newPlayer) => {
          this.slots[newPlayer.slot] = newPlayer;
          if (newPlayer.playerRegion) {
            this.playerData[newPlayer.name] = {
              wins: -1,
              losses: -1,
              rating: -1,
              played: -1,
              lastChange: 0,
              rank: -1,
              slot: newPlayer.slot,
            };
            this.fetchStats(newPlayer.name);
          }
        });
        this.emitUpdate({ newLobby: this.export() });
        let specTeams = Object.entries(this.teamList.specTeams.data);
        let selfSlot = this.getSelfSlot();
        if (this.#appSettings.moveToSpec && selfSlot) {
          let target: [string, number] | undefined;
          if (this.#appSettings.moveToTeam) {
            for (const teamList of Object.values(this.teamList)) {
              target = Object.entries(teamList.data).find(
                ([teamName, teamNumber]) =>
                  teamName.match(new RegExp(this.#appSettings.moveToTeam, "i")) &&
                  Object.values(this.slots).find(
                    (player) => player.team === teamNumber && player.slotStatus === 0
                  )
              );
              if (target) break;
            }
            if (!target) {
              this.emitError("Could not find target team to move to");
              return;
            }
          }

          if (!target && specTeams.length > 0) {
            target =
              specTeams.find(
                ([teamName, teamNumber]) =>
                  teamName.match(/host/i) &&
                  Object.values(this.slots).find(
                    (player) => player.team === teamNumber && player.slotStatus === 0
                  )
              ) ??
              specTeams.find(([teamName, teamNumber]) =>
                Object.values(this.slots).find(
                  (player) => player.team === teamNumber && player.slotStatus === 0
                )
              );
          } else {
            this.emitInfo("There are no available spec teams");
          }
          if (target) {
            this.emitInfo("Found spec slot to move to: " + target[0]);
            this.emitMessage("SetTeam", {
              slot: selfSlot.slot,
              team: target[1],
            });
          } else {
            this.emitInfo("No available spec team found");
          }
        }
        setTimeout(() => {
          // Timeout to ensure starting slot is able to be closed
          for (const slot of this.#appSettings.closeSlots) {
            this.closeSlot(slot);
          }
        }, 250);
      }
    } else {
      let playerUpdates: Array<PlayerPayload> = [];

      payload.players.forEach((player: PlayerPayload) => {
        if (JSON.stringify(this.slots[player.slot]) !== JSON.stringify(player)) {
          /*if (player.slotStatus === 0) {
            // Slot is now available
            if (this.slots[player.slot].slotStatus === 1) {
              // Slot opened
              this.emitUpdate({ type: "slotOpened", slot: player.slot });
            } else if (
              payload.players.filter((e) => e.name === this.slots[player.slot].name)
                .length > 0
            ) {
              // User is still in the lobby
              this.emitUpdate({
                type: "playerMoved",
                move: { from: 0, to: player.slot },
              });
            } else {
              // User has left the lobby
              this.playerLeave(player.name);
              this.emitUpdate({ type: "playerLeft", player });
            }
          } else if (player.slotStatus === 1) {
            // Slot closed
            this.emitUpdate({ type: "slotClosed", slot: player.slot });
          } else {
            if (!currentPlayers.includes(player.name)) {
              this.emitUpdate({ type: "playerJoined", player });
            }
          }*/
          if ((player.playerRegion && player.name) || !player.playerRegion) {
            this.slots[player.slot] = player;
            playerUpdates.push(player);
          }
        }
      });
      if (playerUpdates.length > 0) {
        this.allPlayers = Object.values(this.slots)
          .filter((slot) => slot.playerRegion)
          .map((slot) => slot.name);
        this.nonSpecPlayers = Object.values(this.slots)
          .filter(
            (slot) => this.teamList.playerTeams.lookup[slot.team] && slot.playerRegion
          )
          .map((slot) => slot.name);
        let playersChanged = false;
        for (const slot of Object.values(this.slots).filter(
          (slot) => slot.playerRegion && !this.playerData[slot.name]
        )) {
          this.emitUpdate({ playerJoined: slot });
          this.playerData[slot.name] = {
            wins: -1,
            losses: -1,
            rating: -1,
            played: -1,
            lastChange: 0,
            rank: -1,
            slot: slot.slot,
          };
          this.fetchStats(slot.name);
          playersChanged = true;
        }
        for (const player of Object.keys(this.playerData).filter(
          (player) => this.allPlayers.includes(player) === false
        )) {
          this.playerLeave(player);
          playersChanged = true;
        }
        if ((this.#refreshing && playersChanged) || !this.#refreshing) {
          this.initStaleLobbyCheck();
          if (playerUpdates) {
            this.emitUpdate({ playerPayload: playerUpdates });
          }
          if (this.isLobbyReady()) {
            this.autoBalance();
          }
        } else {
          this.emitInfo("Refreshing lobby, ignoring player update");
        }
      } else {
        this.emitInfo("No player updates");
      }
    }
  }

  async fetchStats(name: string) {
    if (this.#appSettings.eloType !== "off") {
      try {
        if (!this.lookupName) {
          this.emitInfo("Waiting for lookup name");
          setTimeout(() => {
            this.fetchStats(name);
          }, 1000);
          return;
        } else if (this.eloAvailable) {
          if (this.#appSettings.eloType === "wc3stats") {
            let buildVariant = "";
            if (this.#isTargetMap && this.#appSettings.wc3StatsVariant) {
              for (const [key, value] of Object.entries(
                JSON.parse(this.#appSettings.wc3StatsVariant)
              )) {
                if (value) buildVariant += "&" + key + "=" + value;
              }
            }
            buildVariant = encodeURI(buildVariant);
            let targetUrl = `https://api.wc3stats.com/leaderboard&map=${
              this.lookupName
            }${buildVariant}&search=${encodeURI(name)}`;
            this.emitInfo(targetUrl);
            let jsonData: { body: Array<PlayerData & { name: string }> };
            try {
              jsonData = await (await fetch(targetUrl)).json();
            } catch (e) {
              this.emitError("Failed to fetch wc3stats data:");
              this.emitError(e as string);
              jsonData = { body: [] };
            }
            let elo = 500;
            let data: PlayerData | undefined;
            if (this.lookupName === "Footmen%20Vs%20Grunts") {
              elo = 1000;
            }
            // If they haven't left, set real ELO
            if (this.playerData[name]) {
              if (jsonData.body.length > 0) {
                let { name, slot, ...desiredData } = jsonData.body[0];
                data = { slot: this.playerData[name].slot, ...desiredData };
              }
              data = data ?? {
                played: 0,
                wins: 0,
                losses: 0,
                rating: elo,
                lastChange: 0,
                rank: 9999,
                slot: this.playerData[name].slot,
              };
              this.playerData[name] = data;
              this.emitUpdate({
                playerData: {
                  data,
                  name,
                },
              });
              this.emitInfo(name + " stats received and saved.");
              if (this.isLobbyReady()) {
                this.emitInfo("Lobby is ready.");
                this.autoBalance();
              }
            } else {
              this.emitInfo(name + " left before ELO was found");
            }
          } else {
            //this.emitInfo("No elo enabled");
          }
        }
      } catch (err: any) {
        this.emitError("Failed to fetch stats:");
        this.emitError(err);
      }
    }
  }

  playerLeave(name: string) {
    this.bestCombo = [];
    if (this.playerData[name]) {
      delete this.playerData[name];
    }
    this.emitUpdate({ playerLeft: name });
  }

  emitMessage(type: string, payload: any) {
    this.emit("sendMessage", {
      type,
      payload,
    });
  }

  emitUpdate(update: LobbyUpdates) {
    this.emit("update", update);
  }

  emitError(error: string) {
    this.emit("error", error);
  }

  emitInfo(message: string) {
    this.emit("info", message);
  }

  emitChat(message: string) {
    this.emit("sendChat", message);
  }

  emitProgress(step: string, progress: number) {
    this.emit("progress", { step, progress });
  }

  searchPlayer(name: string): string[] {
    return this.allPlayers.filter((user) => user.match(new RegExp(name, "i")));
  }

  testTeam(teamName: string): "otherTeams" | "playerTeams" | "specTeams" {
    if (teamName.match(/((computer)|(creeps)|(summoned))/i)) {
      return "otherTeams";
    } else if (teamName.match(/((host)|(spectator)|(observer)|(referee))/i)) {
      return "specTeams";
    }
    return "playerTeams";
  }

  newChat(name: string, message: string): boolean {
    let currentTime = new Date().getTime();
    // If the same message is sent within 1 second, skip.
    if (
      Object.values(this.chatMessages).filter(
        (chat) => chat.message === message && Math.abs(chat.time - currentTime) < 1000
      ).length === 0
    ) {
      this.chatMessages.push({ name, message, time: currentTime });
      return true;
    }
    return false;
  }

  getSelfSlot() {
    return Object.values(this.slots).find((slot) => slot.isSelf);
  }

  lobbyCombinations(target: Array<string>, teamSize: number = 3) {
    // TODO: See if this still works
    let combos: Array<Array<string>> = new Permutation(target);
    let bestCombo: Array<Array<string>> = [];
    let smallestEloDiff = Number.POSITIVE_INFINITY;
    // First generate every permutation, then separate them into groups of the required team size
    for (const combo of combos) {
      let coupled: Array<Array<string>> = combo.reduce(
        (resultArray: any[][], item: any, index: number) => {
          const chunkIndex = Math.floor(index / teamSize);

          if (!resultArray[chunkIndex]) {
            resultArray[chunkIndex] = []; // start a new chunk
          }

          resultArray[chunkIndex].push(item);

          return resultArray;
        },
        []
      );
      // Now that we have each team in a chunk, we can calculate the elo difference
      let largestEloDifference = -1;
      for (const combo of coupled) {
        // Go through each possible team of the chunk and calculate the highest difference in elo to the target average(totalElo/numTeams)
        const comboElo = combo.reduce((a: number, b: string) => a + playerData[b].elo, 0);
        const eloDiff = Math.abs(totalElo / (target.length / teamSize) - comboElo);
        // If the difference is larger than the current largest difference, set it as the new largest
        if (eloDiff > largestEloDifference) {
          largestEloDifference = eloDiff;
        }
      }
      // If the previously calculated difference is smaller than the current smallest difference, set it as the new smallest, and save the combo
      if (largestEloDifference < smallestEloDiff) {
        smallestEloDiff = largestEloDifference;
        bestCombo = coupled;
      }
    }
    return bestCombo;
  }

  intersect(a: Array<string>, b: Array<string>) {
    var setB = new Set(b);
    return [...new Set(a)].filter((x) => setB.has(x));
  }

  autoBalance() {
    let teams = Object.entries(this.exportTeamStructure());
    if (
      this.#appSettings.eloType !== "off" &&
      this.eloAvailable &&
      this.#appSettings.balanceTeams
    ) {
      this.emitInfo("Auto balancing teams");
      if (this.bestCombo === undefined || this.bestCombo.length == 0) {
        if (teams.length < 2) {
          this.emitUpdate({ lobbyReady: true });
          return;
        } else if (teams.length === 2) {
          let leastSwapTeam = "Team ?";
          let swaps: Array<Array<string>> = [];
          let players = Object.entries(this.playerData);
          let totalElo = players.reduce((a, b) => a + b[1].rating, 0);
          let smallestEloDiff = Number.POSITIVE_INFINITY;
          let bestCombo: Array<string> = [];
          const combos: Array<Array<string>> = new Combination(
            players.map((player) => player[0]),
            Math.floor(players.length / 2)
          );
          for (const combo of combos) {
            const comboElo = combo.reduce((a, b) => a + this.playerData[b].rating, 0);
            const eloDiff = Math.abs(totalElo / 2 - comboElo);
            if (eloDiff < smallestEloDiff) {
              smallestEloDiff = eloDiff;
              bestCombo = combo;
            }
          }
          this.bestCombo = bestCombo;
          let swapsFromTeam1: Array<string> = [];
          let swapsFromTeam2: Array<string> = [];
          const bestComboInTeam1 = this.intersect(
            this.bestCombo,
            teams[0][1].map((player) => player.name)
          );
          const bestComboInTeam2 = this.intersect(
            this.bestCombo,
            teams[1][1].map((player) => player.name)
          );
          this.emitInfo(JSON.stringify(bestComboInTeam1, bestComboInTeam2));
          // If not excludeHostFromSwap and team1 has more best combo people, or excludeHostFromSwap and the best combo includes the host keep all best combo players in team 1.
          if (
            (!this.#appSettings.excludeHostFromSwap &&
              bestComboInTeam1.length >= bestComboInTeam2.length) ||
            (this.#appSettings.excludeHostFromSwap &&
              this.bestCombo.includes(this.lobbyStatic?.playerHost || ""))
          ) {
            // Go through team 1 and grab everyone who is not in the best combo
            leastSwapTeam = teams[0][0];
            teams[0][1].forEach((user) => {
              if (!(this.bestCombo as Array<string>).includes(user.name)) {
                swapsFromTeam1.push(user.name);
              }
            });
            // Go through team 2 and grab everyone who is in the best combo
            bestComboInTeam2.forEach(function (user) {
              swapsFromTeam2.push(user);
            });
          } else {
            leastSwapTeam = teams[1][0];
            teams[1][1].forEach((user) => {
              if (!(this.bestCombo as Array<string>).includes(user.name)) {
                swapsFromTeam2.push(user.name);
              }
            });
            bestComboInTeam1.forEach(function (user) {
              swapsFromTeam1.push(user);
            });
          }
          swaps = [swapsFromTeam1, swapsFromTeam2];
          if (!this.lobbyStatic?.isHost) {
            this.emitChat(leastSwapTeam + " should be: " + this.bestCombo.join(", "));
          } else {
            for (let i = 0; i < swaps[0].length; i++) {
              if (!this.isLobbyReady()) {
                this.emitInfo("Lobby no longer ready.");
                break;
              }
              this.emitProgress("Swapping " + swaps[0][i] + " and " + swaps[1][i], 100);
              this.emitChat("!swap " + swaps[0][i] + " " + swaps[1][i]);
            }
            this.emitUpdate({ lobbyReady: true });
          }
        } else {
          this.bestCombo = this.lobbyCombinations(
            Object.keys(this.playerData),
            teams.length
          );
          if (this.lobbyStatic?.isHost) {
            let dataCopy: [
              string,
              ({
                name: string;
                slotStatus: 0 | 1 | 2;
                slot: number;
                realPlayer: boolean;
              } & PlayerData)[]
            ][] = JSON.parse(JSON.stringify(teams));
            let playerDataCopy: {
              [key: string]: PlayerData;
            } = JSON.parse(JSON.stringify(this.playerData));
            for (let i = 0; i < this.bestCombo.length; i++) {
              // For each Team
              for (let x = 0; x < this.bestCombo[i].length; x++) {
                // For each player in the team
                let targetPlayer = this.bestCombo[i][x];
                // If the team does not include the target player, check through the team for an incorrect player and swap them
                if (
                  dataCopy[i][1].find((player) => player.name === targetPlayer) ===
                  undefined
                ) {
                  for (const currentPlayer of dataCopy[i][1]) {
                    if (!this.bestCombo[i].includes(currentPlayer.name)) {
                      this.emitProgress(
                        "Swapping " + currentPlayer.name + " and " + targetPlayer,
                        100
                      );
                      this.emitChat("!swap " + currentPlayer.name + " " + targetPlayer);
                      // Find where the target player was
                      let targetPlayerData:
                        | ({
                            name: string;
                            slotStatus: 0 | 1 | 2;
                            slot: number;
                            realPlayer: boolean;
                          } & PlayerData)
                        | null = null;
                      let targetPlayerTeam = -1;
                      for (let teamNum = 0; teamNum < dataCopy.length; teamNum++) {
                        let filteredList = dataCopy[teamNum][1].filter(
                          (player) => player.name === targetPlayer
                        );
                        if (filteredList.length > 0) {
                          targetPlayerData = filteredList[0];
                          targetPlayerTeam = teamNum;
                          break;
                        }
                      }
                      if (targetPlayerData && targetPlayerTeam) {
                        dataCopy[i][1][currentPlayer.slot] = targetPlayerData;
                        dataCopy[targetPlayerTeam][1][playerDataCopy[targetPlayer].slot] =
                          currentPlayer;
                        playerDataCopy[currentPlayer.name].slot = targetPlayerData.slot;
                        playerDataCopy[targetPlayer].slot = currentPlayer.slot;
                      } else {
                        throw new Error("Could not find target player");
                      }
                    }
                  }
                }
              }
            }
          } else {
            let playerTeamNames = Object.keys(this.teamList.playerTeams.data);
            for (let i = 0; i < playerTeamNames.length; i++) {
              this.emitChat(
                playerTeamNames[i] + " should be " + this.bestCombo[i].join(", ")
              );
            }
          }
        }
        this.emitUpdate({ lobbyReady: true });
        this.emitChat("ELO data provided by: " + this.#appSettings.eloType);
      }
    } else {
      this.emitUpdate({ lobbyReady: true });
    }
  }

  isLobbyReady() {
    let teams = this.exportTeamStructure();
    for (const team of Object.values(teams)) {
      if (team.filter((slot) => slot.slotStatus === 0).length > 0) {
        console.log("Missing Player");
        return false;
      }
    }
    if (this.#appSettings.eloType !== "off") {
      if (!this.lookupName) {
        console.log("No lookup name");
        return false;
      } else if (this.eloAvailable) {
        for (const team of Object.values(teams)) {
          if (
            team.filter(
              (slot) => slot.slotStatus == 0 || (slot.realPlayer && slot.rating < 0)
            ).length > 0
          ) {
            console.log("Missing ELO data");
            return false;
          }
        }
      }
    }
    return true;
  }

  banPlayer(player: string) {
    let targetSlot = Object.values(this.slots).find((slot) => slot.name === player);
    if (targetSlot) {
      this.banSlot(targetSlot.slot);
    } else {
      this.emitChat("Player not found");
    }
  }

  closePlayer(player: string) {
    let targetSlot = Object.values(this.slots).find((slot) => slot.name === player);
    if (targetSlot) {
      this.closeSlot(targetSlot.slot);
    } else {
      this.emitChat("Player not found");
    }
  }

  kickPlayer(player: string) {
    let targetSlot = Object.values(this.slots).find((slot) => slot.name === player);
    if (targetSlot) {
      this.kickSlot(targetSlot.slot);
    } else {
      this.emitChat("Player not found");
    }
  }

  openPlayer(player: string) {
    let targetSlot = Object.values(this.slots).find((slot) => slot.name === player);
    if (targetSlot) {
      this.closeSlot(targetSlot.slot);
    } else {
      this.emitChat("Player not found");
    }
  }

  setPlayerHandicap(player: string, handicap: number) {
    let targetSlot = Object.values(this.slots).find((slot) => slot.name === player);
    if (targetSlot) {
      this.setHandicapSlot(targetSlot.slot, handicap);
    } else {
      this.emitChat("Player not found");
    }
  }

  banSlot(slotNumber: number) {
    return this.#slotInteraction("BanPlayerFromGameLobby", slotNumber);
  }

  closeSlot(slotNumber: number) {
    return this.#slotInteraction("CloseSlot", slotNumber);
  }

  kickSlot(slotNumber: number) {
    return this.#slotInteraction("KickPlayerFromGameLobby", slotNumber);
  }

  openSlot(slotNumber: number) {
    return this.#slotInteraction("OpenSlot", slotNumber);
  }

  setHandicapSlot(slotNumber: number, handicap: number) {
    //50|60|70|80|90|100
    this.emitMessage("SetHandicap", {
      slot: slotNumber,
      handicap,
    });
  }

  #slotInteraction(action: string, slotNumber: number) {
    if (this.lobbyStatic?.isHost) {
      let targetSlot = Object.values(this.slots).find(
        (slot) => slot.slot === slotNumber && !slot.isSelf && slot.slotTypeChangeEnabled
      );
      if (targetSlot) {
        this.emitMessage(action, {
          slot: slotNumber,
        });
        return targetSlot;
      }
    }
  }

  refreshGame() {
    if (this.lobbyStatic?.isHost) {
      this.#refreshing = true;
      let targetSlots = Object.values(this.slots)
        .filter((slot) => slot.slotStatus === 0)
        .map((slot) => slot.slot);
      for (const slot of targetSlots) {
        this.closeSlot(slot);
      }
      for (const slot of targetSlots) {
        this.openSlot(slot);
      }
      setTimeout(() => (this.#refreshing = false), 150);
    }
  }

  allPlayerTeamsContainPlayers() {
    let teams = this.exportTeamStructure();
    for (const team of Object.values(teams)) {
      if (team.filter((slot) => slot.realPlayer).length === 0) {
        return false;
      }
    }
    return true;
  }

  exportTeamStructureString(playerTeamsOnly: boolean = true) {
    let data = this.exportTeamStructure(playerTeamsOnly);
    let exportString = "";
    Object.entries(data).forEach(([teamName, data]) => {
      exportString += teamName + ":\n";
      let combinedData = data.map(
        (data) =>
          data.name +
          (data.rating > -1
            ? ": " + [data.rating, data.rank, data.wins, data.losses].join("/")
            : "")
      );
      exportString += combinedData.join("\n") ?? "";
      exportString += "\n";
    });
    return exportString;
  }

  exportTeamStructure(playerTeamsOnly: boolean = true) {
    let returnValue: PlayerTeamsData = {};
    let playerTeams = playerTeamsOnly
      ? Object.entries(this.teamList.playerTeams.data)
      : Object.entries(this.teamList.playerTeams.data)
          .concat(Object.entries(this.teamList.otherTeams.data))
          .concat(Object.entries(this.teamList.specTeams.data));
    playerTeams.forEach(([teamName, teamNumber]) => {
      returnValue[teamName] = Object.values(this.slots)
        .filter((player) => teamNumber === player.team)
        .map((player) => {
          let name =
            player.slotStatus === 2
              ? player.name
              : player.slotStatus === 1
              ? "CLOSED"
              : "OPEN";
          return {
            name: name,
            realPlayer: player.playerRegion !== "",
            slotStatus: player.slotStatus,
            ...(this.playerData[player.name] ?? {
              wins: -1,
              losses: -1,
              rating: -1,
              played: -1,
              lastChange: 0,
              rank: -1,
              slot: player.slot,
            }),
          };
        });
    });
    return returnValue;
  }

  getPlayerData(player: string) {
    return this.playerData[player] ?? false;
  }

  export() {
    if (this.lobbyStatic) {
      return {
        lobbyStatic: this.lobbyStatic,
        playerData: this.playerData,
        slots: this.slots,
        region: this.region,
        chatMessages: this.chatMessages,
        lookupName: this.lookupName,
        wc3StatsVariant: this.#appSettings.wc3StatsVariant,
        eloAvailable: this.eloAvailable,
        eloType: this.#appSettings.eloType,
        teamList: this.teamList,
      };
    }
  }
}
