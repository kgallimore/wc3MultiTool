import fetch from "cross-fetch";
import {
  MicroLobby,
  PlayerData,
  PlayerPayload,
  LobbyUpdates,
  PlayerTeamsData,
  GameClientLobbyPayload,
  Regions,
  SlotNumbers,
  TeamTypes,
} from "wc3mt-lobby-container";
import type { LobbyAppSettings } from "./utility";
import { ensureInt } from "./utility";
import EventEmitter from "events";

require = require("esm")(module);
var { Combination, Permutation } = require("js-combinatorics");

export class LobbyControl extends EventEmitter {
  #appSettings: LobbyAppSettings;
  #refreshing: boolean = false;
  #staleTimer: NodeJS.Timeout | null = null;

  voteStartVotes: Array<string> = [];
  bestCombo: Array<string> | Array<Array<string>> = [];
  lobby: MicroLobby | null = null;
  eloName: string = "";
  #isTargetMap: boolean = false;
  testMode: boolean = false;

  #startTimer: NodeJS.Timeout | null = null;

  #expectedSwaps: Array<[string, string]> = [];

  constructor(
    eloType: "wc3stats" | "pyroTD" | "off",
    wc3StatsVariant: string,
    balanceTeams: boolean,
    excludeHostFromSwap: boolean,
    moveToSpec: boolean,
    moveToTeam: string,
    closeSlots: Array<number>,
    mapPath: string,
    requireStats: boolean = false,
    minRank: number = 0,
    minWins: number = 0,
    minGames: number = 0,
    minRating: number = 0
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
      requireStats,
      minRank,
      minWins,
      minGames,
      minRating,
    };
  }

  ingestLobby(payload: GameClientLobbyPayload, region: Regions) {
    if (!this.lobby || this.lobby.lobbyStatic.lobbyName !== payload.lobbyName) {
      if (
        payload.players.length > 0 &&
        Object.values(payload.players).find((slot) => slot.isSelf) !== undefined &&
        payload.playerHost
      ) {
        try {
          this.lobby = new MicroLobby({ region, payload });
          if (this.#appSettings.eloType !== "off") {
            this.eloMapName(payload.mapData.mapName).then((eloMapName) => {
              this.eloName = eloMapName.name;
              if (eloMapName.elo) {
                if (this.lobby) {
                  this.lobby.statsAvailable = eloMapName.elo;
                  Object.values(this.lobby.slots)
                    .filter(
                      (slot) =>
                        slot.slotStatus === 2 && (slot.playerRegion || slot.isSelf)
                    )
                    .forEach((slot) => {
                      this.fetchStats(slot.name);
                    });
                }
              }
            });
          }
          if (
            payload.mapData.mapPath.split(/\/|\\/).slice(-1)[0] !==
            this.#appSettings.mapPath.split(/\/|\\/).slice(-1)[0]
          ) {
            this.#isTargetMap = false;
          } else {
            this.#isTargetMap = true;
          }
          this.#appSettings.closeSlots.forEach((slot) => {
            this.closeSlot(slot);
          });
          setTimeout(() => this.moveToSpec(), 150);
          this.emitUpdate({ newLobby: this.lobby.exportMin() });
        } catch (e) {
          // @ts-ignore
          this.emitError(e);
        }
      }
    } else {
      let changedValues = this.lobby.updateLobbySlots(payload.players);
      if (changedValues.playerUpdates.length > 0) {
        this.emitUpdate({ playerPayload: changedValues.playerUpdates });
      }
      if (changedValues.events.isUpdated) {
        var metExpectedSwap = false;
        changedValues.events.events.forEach((event) => {
          this.emitUpdate(event);
          if (event.playerJoined) {
            this.fetchStats(event.playerJoined.name);
            if (this.lobby?.nonSpecPlayers.includes(event.playerJoined.name)) {
            }
            if (this.#startTimer) {
              this.emitChat(`Lobby start was cancelled`);
              clearTimeout(this.#startTimer);
              this.#startTimer = null;
            }
          } else if (event.playerLeft) {
            if (this.#startTimer) {
              this.emitChat(`Lobby start was cancelled`);
              clearTimeout(this.#startTimer);
              this.#startTimer = null;
            }
            let player = event.playerLeft;
            let expectedSwapsCheck = this.#expectedSwaps.findIndex((swaps) =>
              swaps.includes(player)
            );
            if (expectedSwapsCheck !== -1) {
              this.#expectedSwaps.splice(expectedSwapsCheck, 1);
              this.emitInfo(`Expected swap removed for ${player}`);
            }
          } else if (event.playersSwapped) {
            let players = event.playersSwapped.players.sort();
            let expectedIndex = this.#expectedSwaps.findIndex(
              (swap) => JSON.stringify(swap.sort()) === JSON.stringify(players)
            );
            if (expectedIndex !== -1) {
              this.#expectedSwaps.splice(expectedIndex, 1);
              metExpectedSwap = true;
            }
          }
        });
        if (this.#staleTimer) {
          clearTimeout(this.#staleTimer);
        }
        this.#staleTimer = setInterval(() => {
          this.staleLobby();
        }, 1000 * 60 * 15);
        if (!metExpectedSwap) {
          this.bestCombo = [];
          if (this.isLobbyReady()) {
            this.emitInfo("Lobby is ready.");
            this.autoBalance();
          }
        }
      }
    }
  }

  moveToSpec() {
    if (this.lobby && this.#appSettings.moveToSpec) {
      let lobby = this.lobby;
      let teams = Object.entries(this.lobby.teamListLookup);
      let specTeams = Object.entries(this.lobby.teamListLookup).filter(
        ([teamNumber, teamData]) => teamData.type === "specTeams"
      );
      let selfSlot = this.lobby.getSelfSlot();
      if (selfSlot !== false) {
        let target: [string, { type: TeamTypes; name?: string }] | undefined;
        if (this.#appSettings.moveToTeam) {
          target = teams.find(([teamNumber, teamData]) =>
            teamData.name?.match(new RegExp(this.#appSettings.moveToTeam, "i"))
          );
          if (!target) {
            this.emitError("Could not find target team to move to");
            return;
          } else {
            this.emitInfo(
              `Found target team, moving to team ${target[0]}: ${target[1].name}`
            );
          }
        }
        if (!target && specTeams.length > 0) {
          target =
            specTeams.find(
              ([teamNumber, teamData]) =>
                teamData.name?.match(/host/i) &&
                Object.values(lobby.slots).find(
                  (player) =>
                    player.team === ensureInt(teamNumber) && player.slotStatus === 0
                )
            ) ??
            specTeams.find(([teamNumber, teamData]) =>
              Object.values(lobby.slots).find(
                (player) =>
                  player.team === ensureInt(teamNumber) && player.slotStatus === 0
              )
            );
        } else {
          this.emitInfo("There are no available spec teams");
        }
        if (target) {
          this.emitInfo("Found spec slot to move to: " + target[0]);
          console.log("Moving to spec", target[0], selfSlot);
          this.emitMessage("SetTeam", {
            slot: selfSlot,
            team: ensureInt(target[0]),
          });
          if (this.#appSettings.closeSlots.includes(selfSlot)) {
            setTimeout(() => {
              if (selfSlot !== false) this.closeSlot(selfSlot);
            }, 250);
          }
        } else {
          this.emitInfo("No available spec team found");
        }
      } else {
        this.emitError("Could not find self slot");
      }
    }
  }

  updateSetting(setting: keyof LobbyAppSettings, value: any) {
    let keys = Object.keys(this.#appSettings);
    if (keys.includes(setting)) {
      if (typeof this.#appSettings[setting] === typeof value) {
        // @ts-ignore
        this.#appSettings[setting] = value;
        this.emitInfo(`Updated lobby: ${setting} to ${value}`);
      } else {
        this.emitError(
          `Lobby update failed. Unrecognized type of ${value} for ${setting}, `
        );
      }
    } else {
      console.log(`Lobby update failed. Unrecognized setting: ${setting}`);
    }
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

  emitMessage(type: string, payload: any) {
    this.emit("sendMessage", {
      type,
      payload,
    });
  }

  clear() {
    this.voteStartVotes = [];
    this.bestCombo = [];
    this.#refreshing = false;
    if (this.#staleTimer) {
      clearTimeout(this.#staleTimer);
      this.#staleTimer = null;
    }
    this.lobby = null;
  }

  async eloMapName(mapName: string) {
    if (this.#appSettings.eloType === "wc3stats") {
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
      } else if (mapName.match(/Reforged.*Footmen/i)) {
        return { name: "Reforged%20Footmen%20Frenzy", elo: true };
      } else if (mapName.match(/Direct.*Strike.*Reforged/i)) {
        return { name: "Direct%20Strike", elo: true };
      } else if (mapName.match(/WW3.*Diplomacy/i)) {
        return { name: "WW3%20Diplomacy", elo: true };
      } else if (mapName.match(/Legion.*TD/i)) {
        return { name: "Legion%20TD", elo: true };
      } else if (mapName.match(/Tree.*Tag/i)) {
        return { name: "Tree%20Tag", elo: true };
      } else if (mapName.match(/Battleships.*Crossfire/i)) {
        return { name: "Battleships%20Crossfire", elo: true };
      } else {
        let name = encodeURI(
          mapName.trim().replace(/\s*v?\.?(\d+\.)?(\*|\d+)\w*\s*$/gi, "")
        );
        let test = await (await fetch(`https://api.wc3stats.com/maps/${name}`)).json();
        return { name, elo: test.status === "ok" };
      }
    } else
      return {
        name: encodeURI(mapName.trim().replace(/\s*v?\.?(\d+\.)?(\*|\d+)\w*\s*$/gi, "")),
        elo: false,
      };
  }

  async fetchStats(name: string) {
    if (this.#appSettings.eloType !== "off") {
      try {
        if (!this.eloName) {
          this.emitInfo("Waiting for lookup name");
          setTimeout(() => {
            this.fetchStats(name);
          }, 1000);
          return;
        } else if (this.lobby?.statsAvailable) {
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
              this.eloName
            }${buildVariant}&search=${encodeURI(name)}`;
            this.emitInfo(targetUrl);
            let jsonData: { body: Array<PlayerData["extra"] & { name: string }> };
            try {
              jsonData = await (await fetch(targetUrl)).json();
            } catch (e) {
              this.emitError("Failed to fetch wc3stats data:");
              this.emitError(e as string);
              jsonData = { body: [] };
            }
            let elo = 500;
            let data: PlayerData["extra"] | undefined;
            if (this.eloName === "Footmen Vs Grunts") {
              elo = 1000;
            }
            // If they haven't left, set real ELO
            if (jsonData.body.length > 0) {
              let { name, ...desiredData } = jsonData.body[0];
              data = { ...desiredData };
            }
            data = data ?? {
              played: 0,
              wins: 0,
              losses: 0,
              rating: this.testMode ? Math.round(Math.random() * 1000) : elo,
              lastChange: 0,
              rank: 9999,
            };
            if (
              this.lobby.ingestUpdate({ playerData: { name, extraData: data } }).isUpdated
            ) {
              this.emitUpdate({
                playerData: {
                  extraData: data,
                  name,
                },
              });
              this.emitInfo(name + " stats received and saved.");
              if (this.#appSettings.requireStats) {
                if (data.played < this.#appSettings.minGames) {
                  this.emitInfo(
                    `${name} has not played enough games to qualify for the ladder.`
                  );
                  this.banPlayer(name);
                  return;
                } else if (data.rating < this.#appSettings.minRating) {
                  this.emitInfo(`${name} has an ELO rating below the minimum.`);
                  this.banPlayer(name);
                  return;
                } else if (
                  this.#appSettings.minRank !== 0 &&
                  data.rank < this.#appSettings.minRank
                ) {
                  this.emitInfo(`${name} has a rank below the minimum.`);
                  this.banPlayer(name);
                  return;
                } else if (data.wins < this.#appSettings.minWins) {
                  this.emitInfo(
                    `${name} has not won enough games to qualify for the ladder.`
                  );
                  this.banPlayer(name);
                  return;
                }
              }
            }
            if (this.isLobbyReady()) {
              this.emitInfo("Lobby is ready.");
              this.autoBalance();
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

  staleLobby() {
    if (this.lobby && this.lobby.allPlayers.length < 2) {
      this.emitInfo("Try to refresh possibly stale lobby");
      this.emitUpdate({ stale: true });
    } else {
      this.emitInfo("Refreshing possibly stale lobby");
      this.refreshGame();
    }
  }

  refreshGame() {
    if (this.lobby?.lobbyStatic?.isHost) {
      this.#refreshing = true;
      let targetSlots = Object.values(this.lobby.slots)
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

  startGame(delay: number = 0) {
    if (delay > 0) {
      if (this.#startTimer) {
        this.emitChat("Lobby changed. Starting game in " + delay + " second(s)!");
      } else {
        this.emitChat("Starting game in " + delay + " second(s)!");
      }
    }
    if (this.#startTimer) {
      clearTimeout(this.#startTimer);
    }
    this.#startTimer = setTimeout(() => {
      this.#startTimer = null;
      if (this.lobby?.lobbyStatic?.isHost) {
        this.emitInfo("Starting game");
        this.emitChat("AutoHost functionality provided by WC3 MultiTool.");
        this.emitMessage("LobbyStart", {});
      }
    }, delay * 1000 + 250);
  }

  lobbyCombinations(
    target: Array<string>,
    playerData: {
      [key: string]: PlayerData;
    },
    teamSize: number = 3
  ) {
    let combos: Array<Array<string>> = new Permutation(target);
    let bestCombo: Array<Array<string>> = [];
    let smallestEloDiff = Number.POSITIVE_INFINITY;

    let totalElo = Object.values(playerData).reduce(
      (a, b) => (b.extra ? a + ensureInt(b.extra.rating) : a),
      0
    );

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
        const comboElo = combo.reduce(
          (a: number, b: string) => a + (playerData[b].extra?.rating ?? 500),
          0
        );
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
    let teams = Object.entries(this.exportDataStructure(true)).filter(
      // Filter out empty teams
      ([teamName, teamPlayers]) =>
        Object.values(teamPlayers).filter((player) => player.realPlayer).length > 0
    );
    if (
      this.#appSettings.eloType !== "off" &&
      this.lobby?.statsAvailable &&
      this.#appSettings.balanceTeams
    ) {
      let lobbyCopy = new MicroLobby({ fullData: this.lobby.exportMin() });
      this.emitInfo("Auto balancing teams");
      if (this.bestCombo === undefined || this.bestCombo.length == 0) {
        if (teams.length < 2) {
          this.emitUpdate({ lobbyReady: true });
          return;
        } else if (teams.length === 2) {
          let leastSwapTeam = "Team ?";
          let swaps: Array<Array<string>> = [];
          let players = Object.entries(lobbyCopy.getAllPlayerData()).filter(
            (x) => x[1].extra && lobbyCopy.nonSpecPlayers.includes(x[0])
          );
          let totalElo = players.reduce(
            (a, b) => (b[1].extra ? a + ensureInt(b[1].extra.rating) : a),
            0
          );
          let smallestEloDiff = Number.POSITIVE_INFINITY;
          let bestCombo: Array<string> = [];
          const combos: Array<Array<string>> = new Combination(
            players.map((player) => player[0]),
            Math.floor(players.length / 2)
          );
          for (const combo of combos) {
            const comboElo = combo.reduce(
              (a, b) =>
                a + ensureInt(lobbyCopy.getAllPlayerData()[b].extra?.rating ?? 500),
              0
            );
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
            teams[0][1].filter((player) => player.realPlayer).map((player) => player.name)
          );
          const bestComboInTeam2 = this.intersect(
            this.bestCombo,
            teams[1][1].filter((player) => player.realPlayer).map((player) => player.name)
          );
          // If not excludeHostFromSwap and team1 has more best combo people, or excludeHostFromSwap and the best combo includes the host keep all best combo players in team 1.
          if (
            (!this.#appSettings.excludeHostFromSwap &&
              bestComboInTeam1.length >= bestComboInTeam2.length) ||
            (this.#appSettings.excludeHostFromSwap &&
              this.bestCombo.includes(lobbyCopy.lobbyStatic?.playerHost || ""))
          ) {
            // Go through team 1 and grab everyone who is not in the best combo
            leastSwapTeam = teams[0][0];
            teams[0][1].forEach((user) => {
              if (
                user.realPlayer &&
                !(this.bestCombo as Array<string>).includes(user.name)
              ) {
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
              if (
                user.realPlayer &&
                !(this.bestCombo as Array<string>).includes(user.name)
              ) {
                swapsFromTeam2.push(user.name);
              }
            });
            bestComboInTeam1.forEach(function (user) {
              swapsFromTeam1.push(user);
            });
          }
          swaps = [swapsFromTeam1, swapsFromTeam2];
          if (!lobbyCopy.lobbyStatic.isHost) {
            this.emitChat(leastSwapTeam + " should be: " + this.bestCombo.join(", "));
          } else {
            for (let i = 0; i < swaps[0].length; i++) {
              if (!this.isLobbyReady()) {
                this.emitInfo("Lobby no longer ready.");
                break;
              }
              this.emitProgress("Swapping " + swaps[0][i] + " and " + swaps[1][i], 100);
              this.swapPlayers({ players: [swaps[0][i], swaps[1][i]] });
            }
          }
        } else {
          this.bestCombo = this.lobbyCombinations(
            lobbyCopy.nonSpecPlayers,
            this.lobby.getAllPlayerData(),
            // Just grab the size of the first team
            teams[0][1].filter((player) => player.realPlayer).length
          );
          if (this.lobby.lobbyStatic?.isHost) {
            let lobbyCopy = new MicroLobby({ fullData: this.lobby.exportMin() }, false);
            let playerTeams = Object.entries(lobbyCopy.teamListLookup)
              .filter(([teamNumber, teamData]) => teamData.type === "playerTeams")
              .map((data) => data[0]);
            for (let i = 0; i < this.bestCombo.length; i++) {
              // For each Team
              let currentTeam: Array<PlayerPayload>;
              for (let x = 0; x < this.bestCombo[i].length; x++) {
                currentTeam = Object.values(lobbyCopy.slots).filter(
                  (player) => ensureInt(player.team) === ensureInt(playerTeams[i])
                );
                // For each player in the team
                let targetPlayer = this.bestCombo[i][x];
                // If the team does not include the target player, check through the team for an incorrect player and swap them
                if (
                  currentTeam.find((player) => player.name === targetPlayer) === undefined
                ) {
                  for (let currentPlayer of currentTeam) {
                    if (!this.bestCombo[i].includes(currentPlayer.name)) {
                      this.emitProgress(
                        "Swapping " + currentPlayer.name + " and " + targetPlayer,
                        100
                      );
                      this.swapPlayers({ players: [currentPlayer.name, targetPlayer] });
                      // Swap the data of the two players
                      let targetPlayerOldSlot = lobbyCopy.playerToSlot(targetPlayer);
                      let targetPlayerOldData = lobbyCopy.slots[targetPlayerOldSlot];
                      let currentPlayerSlot = currentPlayer.slot;
                      // Only swapping the team number is really required since the slot number information is doubled as the key for the slot, but still swapped just in case.
                      // Set the slot info for the current player to the info that it is being swapped to
                      currentPlayer.team = targetPlayerOldData.team;
                      currentPlayer.slot = targetPlayerOldData.slot;
                      // Set the slot info for the target player to the info that it is being swapped to
                      targetPlayerOldData.team = ensureInt(playerTeams[i]);
                      targetPlayerOldData.slot = currentPlayerSlot;
                      // Set the slots to their new data.
                      lobbyCopy.slots[currentPlayer.slot] = targetPlayerOldData;
                      lobbyCopy.slots[targetPlayerOldSlot] = currentPlayer;
                      break;
                    }
                  }
                }
              }
            }
          } else {
            let playerTeamNames = Object.values(this.lobby.teamListLookup).filter(
              (team) => team.type === "playerTeams"
            );
            for (let i = 0; i < playerTeamNames.length; i++) {
              this.emitChat(
                playerTeamNames[i] + " should be " + this.bestCombo[i].join(", ")
              );
            }
          }
        }
        this.emitInfo("Players should now be balanced.");
        this.emitUpdate({ lobbyReady: true });
        this.emitChat("ELO data provided by: " + this.#appSettings.eloType);
      }
    } else {
      this.emitUpdate({ lobbyReady: true });
    }
  }

  isLobbyReady() {
    let teams = this.exportDataStructure(true);
    if (this.#refreshing) {
      console.log("Refreshing slots, not ready.");
      return false;
    }
    for (const team of Object.values(teams)) {
      if (team.filter((slot) => slot.slotStatus === 0).length > 0) {
        console.log("Missing Player");
        return false;
      }
    }

    if (this.#appSettings.eloType !== "off") {
      if (!this.lobby?.lookupName) {
        console.log("No lookup name");
        return false;
      } else if (this.lobby.statsAvailable) {
        for (const team of Object.values(teams)) {
          let waitingForStats = team.filter(
            (slot) =>
              slot.slotStatus == 0 ||
              (slot.realPlayer && (!slot.data.extra || slot.data.extra.rating < 0))
          );
          if (waitingForStats.length > 0) {
            console.log(
              "Missing ELO data: ",
              waitingForStats.map((slot) => slot.name + " (" + slot.data.extra + ")")
            );
            return false;
          }
        }
      }
    }
    return true;
  }

  shufflePlayers(shuffleTeams: boolean = true) {
    if (this.lobby?.lobbyStatic.isHost) {
      this.emitChat("Shuffling players...");
      let players = this.lobby.nonSpecPlayers;
      let swappedPlayers: Array<string> = [];
      Object.values(players).forEach((player) => {
        let targetPlayer = players[Math.floor(Math.random() * players.length)];
        if (
          this.lobby &&
          targetPlayer !== player &&
          !swappedPlayers.includes(targetPlayer) &&
          !swappedPlayers.includes(player)
        ) {
          // If teams can be shuffled as well, otherwise if the teams of the players to be swapped are different.
          if (
            shuffleTeams ||
            this.lobby.slots[this.lobby.playerToSlot(player)].team !==
              this.lobby.slots[this.lobby.playerToSlot(targetPlayer)].team
          ) {
            swappedPlayers.push(player);
            swappedPlayers.push(targetPlayer);
            this.swapPlayers({
              players: [player, targetPlayer],
            });
          }
        }
      });
    }
  }

  banPlayer(player: string) {
    if (this.lobby?.lobbyStatic.isHost !== true) {
      this.emitError("Only the host can ban players");
      return;
    }
    let targetSlot = Object.values(this.lobby.slots).find(
      (slot) => slot.name === player && slot.isSelf === false
    );
    if (targetSlot) {
      this.banSlot(targetSlot.slot);
    } else {
      this.emitChat("Player not found");
    }
  }

  closePlayer(player: string) {
    if (this.lobby?.lobbyStatic.isHost !== true) {
      this.emitError("Only the host can close players");
      return;
    }
    let targetSlot = Object.values(this.lobby.slots).find(
      (slot) => slot.name === player && slot.isSelf === false
    );
    if (targetSlot) {
      this.closeSlot(targetSlot.slot);
    } else {
      this.emitChat("Player not found");
    }
  }

  swapPlayers(data: { slots?: [SlotNumbers, SlotNumbers]; players?: [string, string] }) {
    if (this.lobby?.lobbyStatic.isHost) {
      if (data.slots && data.slots.length === 2) {
        if (
          this.lobby.slots[data.slots[0]].playerRegion &&
          this.lobby.slots[data.slots[1]].playerRegion
        ) {
          data.players = [
            this.lobby.slots[data.slots[0]].name,
            this.lobby.slots[data.slots[1]].name,
          ];
        }
      }
      if (data.players && data.players.length === 2) {
        let target1 = this.lobby.searchPlayer(data.players[0])[0];
        let target2 = this.lobby.searchPlayer(data.players[1])[0];
        if (target1 && target2 && target1 !== target2) {
          this.#expectedSwaps.push([target1, target2].sort() as [string, string]);
          this.emitChat("!swap " + target1 + " " + target2);
        } else {
          this.emitChat("Possible invalid swap targets");
          this.emitError("Possible invalid swap targets: " + target1 + " and " + target2);
        }
      } else {
        this.emitChat("Possible invalid swap targets");
        this.emitError("Possible invalid swap targets: " + JSON.stringify(data.players));
      }
    }
  }

  kickPlayer(player: string) {
    if (this.lobby?.lobbyStatic.isHost !== true) {
      this.emitError("Only the host can kick players");
      return;
    }
    let targetSlot = Object.values(this.lobby.slots).find(
      (slot) => slot.name === player && slot.isSelf === false
    );
    if (targetSlot) {
      this.kickSlot(targetSlot.slot);
    } else {
      this.emitChat("Player not found");
    }
  }

  openPlayer(player: string) {
    if (this.lobby?.lobbyStatic.isHost !== true) {
      this.emitError("Only the host can open slots");
      return;
    }
    let targetSlot = Object.values(this.lobby.slots).find(
      (slot) => slot.name === player && slot.isSelf === false
    );
    if (targetSlot) {
      this.closeSlot(targetSlot.slot);
    } else {
      this.emitChat("Player not found");
    }
  }

  setPlayerHandicap(player: string, handicap: number) {
    if (this.lobby?.lobbyStatic.isHost !== true) {
      this.emitError("Only the host can set handicaps");
      return;
    }
    let targetSlot = Object.values(this.lobby.slots).find((slot) => slot.name === player);
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
    if (this.lobby?.lobbyStatic.isHost) {
      let targetSlot = Object.values(this.lobby.slots).find(
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

  allPlayerTeamsContainPlayers() {
    let teams = this.exportDataStructure();
    for (const team of Object.values(teams)) {
      if (team.filter((slot) => slot.realPlayer).length === 0) {
        return false;
      }
    }
    return true;
  }

  exportDataStructureString(playerTeamsOnly: boolean = true) {
    let data = this.exportDataStructure(playerTeamsOnly);
    let exportString = "";
    Object.entries(data).forEach(([teamName, data]) => {
      exportString += teamName + ":\n";
      let combinedData = data.map(
        (playerData) =>
          playerData.name +
          (playerData.data.extra?.rating && playerData.data.extra.rating > -1
            ? ": " +
              [
                playerData.data.extra.rating,
                playerData.data.extra.rank,
                playerData.data.extra.wins,
                playerData.data.extra.losses,
              ].join("/")
            : "")
      );
      exportString += combinedData.join("\n") ?? "";
      exportString += "\n";
    });
    return exportString;
  }

  exportDataStructure(playerTeamsOnly: boolean = true): PlayerTeamsData {
    let lobby = this.lobby;
    let returnValue = {};
    if (!lobby) {
      this.emitError("No lobby");
      return returnValue;
    }
    return lobby.exportTeamStructure(playerTeamsOnly);
  }

  exportTeamStructureString(playerTeamsOnly: boolean = true) {
    let data = this.exportDataStructure(playerTeamsOnly);
    let exportString = "";
    Object.entries(data).forEach(([teamName, data]) => {
      exportString += teamName + ":\n";
      let combinedData = data.map(
        (data) =>
          data.name +
          (data.data.extra && data.data.extra.rating > -1
            ? ": " +
              [
                data.data.extra.rating,
                data.data.extra.rank,
                data.data.extra.wins,
                data.data.extra.losses,
              ].join("/")
            : "")
      );
      exportString += combinedData.join("\n") ?? "";
      exportString += "\n";
    });
    return exportString;
  }

  getPlayerData(player: string) {
    return this.lobby?.getAllPlayerData()[player] ?? false;
  }
}
