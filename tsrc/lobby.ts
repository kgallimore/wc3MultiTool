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
} from "./utility";
require = require("esm")(module);
var { Combination, Permutation } = require("js-combinatorics");
export class WarLobby extends EventEmitter {
  balanceTeams: boolean;
  wc3StatsVariant: string;
  excludeHostFromSwap: boolean;
  eloType: "wc3stats" | "pyroTD" | "off";

  lookupName: string = "";
  eloAvailable: boolean = false;
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
    buildVariant: string,
    balanceTeams: boolean,
    excludeHostFromSwap: boolean
  ) {
    super();
    this.eloType = eloType;
    this.wc3StatsVariant = buildVariant;
    this.balanceTeams = balanceTeams;
    this.excludeHostFromSwap = excludeHostFromSwap;
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
  }

  async cleanMapName(mapName: string) {
    if (this.eloType === "wc3stats" || this.eloType === "off") {
      if (mapName.match(/(HLW)/i)) {
        return { name: "HLW", elo: true };
      } else if (mapName.match(/(pyro\s*td\s*league)/i)) {
        return { name: "Pyro%20TD", elo: true };
      } else if (mapName.match(/(vampirism\s*fire)/i)) {
        return { name: "Vampirism%20Fire", elo: true };
      } else if (mapName.match(/(footmen.?vs.?grunts)/i)) {
        return { name: "Footmen%20Vs%20Grunts", elo: true };
      } else {
        let name = encodeURI(
          mapName.trim().replace(/\s*v?\.?(\d+\.)?(\*|\d+)\w*\s*$/gi, "")
        );
        let test = await (await fetch(`https://api.wc3stats.com/maps/${name}`)).json();
        return { name, elo: test.status === "ok" };
      }
    } else throw new Error("Unknown or unsupported type");
  }

  async processLobby(payload: GameClientLobbyPayload, region: "us" | "eu") {
    const { teamData, availableTeamColors, players, ...staticFields } = payload;
    if (!this.lobbyStatic || this.lobbyStatic.lobbyName !== staticFields.lobbyName) {
      // The fields are changed, must be a new lobby!
      this.clear();
      if (staticFields.playerHost && payload.players[0]) {
        this.lobbyStatic = staticFields;
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
              // TODO find from to where
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
          this.slots[player.slot] = player;
          playerUpdates.push(player);
        }
      });
      if (playerUpdates) {
        this.emitUpdate({ playerPayload: playerUpdates });
      }
      for (const slot of Object.values(this.slots)) {
        if (slot.playerRegion && !this.playerData[slot.name]) {
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
        }
      }
      for (const player of Object.keys(this.playerData)) {
        if (!this.getAllPlayers(true).includes(player)) {
          this.emitUpdate({ playerLeft: player });
          this.playerLeave(player);
        }
      }
      if (this.isLobbyReady()) {
        this.autoBalance();
      }
    }
  }

  async fetchStats(name: string) {
    try {
      if (!this.lookupName) {
        this.emitInfo("Waiting for lookup name");
        setTimeout(() => {
          this.fetchStats(name);
        }, 1000);
        return;
      } else if (this.eloAvailable) {
        if (this.eloType === "wc3stats") {
          let buildVariant = "";
          Object.entries(JSON.parse(this.wc3StatsVariant)).forEach(([key, value]) => {
            if (value) buildVariant += "&" + key + "=" + value;
          });
          if (this.eloAvailable) {
            let jsonData: { body: Array<PlayerData & { name: string }> } = await (
              await fetch(
                `https://api.wc3stats.com/leaderboard&map=${this.lookupName}${
                  this.lobbyStatic?.isHost ? encodeURI(buildVariant) : ""
                }&search=${encodeURI(name)}`
              )
            ).json();
            let elo = 500;
            let data: PlayerData | undefined;
            if (this.lookupName === "Footmen%20Vs%20Grunts") {
              elo = 1000;
            }
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
            // If they haven't left, set real ELO
            if (this.playerData[name]) {
              this.playerData[name] = data;
              this.emitUpdate({
                playerData: {
                  data,
                  name,
                },
              });
              this.emitInfo(name + " stats received and saved.");
              // If the lobby is full, and we have the ELO for everyone,
              if (this.isLobbyReady()) {
                this.autoBalance();
              }
            } else {
              this.emitInfo(name + " left before ELO was found");
            }
          } else {
            this.emitInfo("Elo not available. Skipping");
          }
        } else {
          //this.emitInfo("No elo enabled");
        }
      }
    } catch (err: any) {
      this.emitError(err);
    }
  }

  playerLeave(name: string) {
    this.bestCombo = [];
    if (this.playerData[name]) {
      delete this.playerData[name];
    }
  }

  emitUpdate(update: LobbyUpdates) {
    this.emit("update", update);
  }

  emitError(error: string) {
    this.emit("err", error);
  }

  emitInfo(message: string) {
    this.emit("info", message);
  }

  emitChat(message: string) {
    this.emit("chat", message);
  }

  emitProgress(step: string, progress: number) {
    this.emit("progress", { step, progress });
  }

  getAllPlayers(includeNonPlayerTeams: boolean = false) {
    let target = includeNonPlayerTeams
      ? Object.values(this.slots).filter((slot) => slot.playerRegion)
      : Object.values(this.slots).filter(
          (slot) => this.teamList.playerTeams.lookup[slot.team] && slot.playerRegion
        );
    return target.map((slot) => slot.name);
  }

  testTeam(teamName: string) {
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
    if (this.eloAvailable && this.balanceTeams) {
      if (!this.bestCombo) {
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
            (!this.excludeHostFromSwap &&
              bestComboInTeam1.length >= bestComboInTeam2.length) ||
            (this.excludeHostFromSwap &&
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
                break;
              }
              this.emitProgress("Swapping " + swaps[0][i] + " and " + swaps[1][i], 100);
              this.emitChat("!swap " + swaps[0][i] + " " + swaps[1][i]);
            }
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
        this.emitChat("ELO data provided by: " + this.eloType);
      }
    } else {
      this.emitUpdate({ lobbyReady: true });
    }
  }

  isLobbyReady() {
    let teams = this.exportTeamStructure();
    let values = Object.values(teams);
    let test = values.filter((team) => team.length > 0);
    if (test.length > 0) {
      if (this.eloType !== "off") {
        if (!this.lookupName) {
          return false;
        } else if (this.eloAvailable) {
          for (const team of Object.values(teams)) {
            if (
              team.filter(
                (slot) => slot.slotStatus == 0 || (slot.realPlayer && slot.rating < 0)
              ).length > 0
            ) {
              return false;
            }
          }
        } else {
          for (const team of Object.values(teams)) {
            if (team.filter((slot) => slot.slotStatus === 0).length > 0) {
              return false;
            }
          }
        }
      } else {
        for (const team of Object.values(teams)) {
          if (team.filter((slot) => slot.slotStatus === 0).length > 0) {
            return false;
          }
        }
      }
      return true;
    } else {
      return false;
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
      console.log(this.playerData);
      return {
        lobbyStatic: this.lobbyStatic,
        playerData: this.playerData,
        slots: this.slots,
        region: this.region,
        chatMessages: this.chatMessages,
        lookupName: this.lookupName,
        wc3StatsVariant: this.wc3StatsVariant,
        eloAvailable: this.eloAvailable,
        eloType: this.eloType,
        teamList: this.teamList,
      };
    }
  }
}
