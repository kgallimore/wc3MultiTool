import { Module } from "../moduleBase";

import { settings } from "./../globals/settings";

import fetch from "cross-fetch";
import {
  MicroLobby,
  PlayerData,
  PlayerPayload,
  PlayerTeamsData,
  GameClientLobbyPayload,
  Regions,
  SlotNumbers,
  TeamTypes,
  LobbyUpdates,
} from "wc3mt-lobby-container";
import { ensureInt } from "../utility";

require = require("esm")(module);
var { Combination, Permutation } = require("js-combinatorics");

export class LobbyControl extends Module {
  #refreshing: boolean = false;
  #staleTimer: NodeJS.Timeout | null = null;

  voteStartVotes: Array<string> = [];
  bestCombo: Array<string> | Array<Array<string>> = [];
  microLobby: MicroLobby | null = null;
  eloName: string = "";
  #isTargetMap: boolean = false;
  testMode: boolean = false;

  #startTimer: NodeJS.Timeout | null = null;

  #expectedSwaps: Array<[string, string]> = [];

  constructor() {
    super(false);
  }

  ingestLobby(payload: GameClientLobbyPayload, region: Regions) {
    if (!this.microLobby || this.microLobby.lobbyStatic.lobbyName !== payload.lobbyName) {
      if (
        payload.players.length > 0 &&
        Object.values(payload.players).find((slot) => slot.isSelf) !== undefined &&
        payload.playerHost
      ) {
        try {
          this.microLobby = new MicroLobby({ region, payload });
          if (settings.values.elo.type !== "off") {
            this.eloMapName(payload.mapData.mapName).then((eloMapName) => {
              this.eloName = eloMapName.name;
              if (eloMapName.elo) {
                if (this.microLobby) {
                  this.microLobby.statsAvailable = eloMapName.elo;
                  Object.values(this.microLobby.slots)
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
            settings.values.autoHost.mapPath.split(/\/|\\/).slice(-1)[0]
          ) {
            this.#isTargetMap = false;
          } else {
            this.#isTargetMap = true;
          }
          settings.values.autoHost.closeSlots.forEach((slot) => {
            this.closeSlot(slot);
          });
          setTimeout(() => this.moveToSpec(), 150);
          this.emitLobbyUpdate({ newLobby: this.microLobby.exportMin() });
        } catch (e) {
          // @ts-ignore
          this.emitError(e);
        }
      }
    } else {
      let changedValues = this.microLobby.updateLobbySlots(payload.players);
      if (changedValues.playerUpdates.length > 0) {
        this.emitLobbyUpdate({ playerPayload: changedValues.playerUpdates });
      }
      if (changedValues.events.isUpdated) {
        var metExpectedSwap = false;
        changedValues.events.events.forEach((event) => {
          this.emitLobbyUpdate(event);
          if (event.playerJoined) {
            this.fetchStats(event.playerJoined.name);
            if (this.microLobby?.nonSpecPlayers.includes(event.playerJoined.name)) {
            }
            if (this.#startTimer) {
              this.sendGameChat(`Lobby start was cancelled`);
              clearTimeout(this.#startTimer);
              this.#startTimer = null;
            }
          } else if (event.playerLeft) {
            if (this.#startTimer) {
              this.sendGameChat(`Lobby start was cancelled`);
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
    if (this.microLobby && settings.values.autoHost.moveToSpec) {
      let lobby = this.microLobby;
      let teams = Object.entries(this.microLobby.teamListLookup);
      let specTeams = Object.entries(this.microLobby.teamListLookup).filter(
        ([teamNumber, teamData]) => teamData.type === "specTeams"
      );
      let selfSlot = this.microLobby.getSelfSlot();
      if (selfSlot !== false) {
        let target: [string, { type: TeamTypes; name?: string }] | undefined;
        if (settings.values.autoHost.moveToTeam) {
          target = teams.find(([teamNumber, teamData]) =>
            teamData.name?.match(new RegExp(settings.values.autoHost.moveToTeam, "i"))
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
          if (settings.values.autoHost.closeSlots.includes(selfSlot)) {
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

  clear() {
    this.voteStartVotes = [];
    this.bestCombo = [];
    this.#refreshing = false;
    if (this.#staleTimer) {
      clearTimeout(this.#staleTimer);
      this.#staleTimer = null;
    }
    this.microLobby = null;
  }

  async eloMapName(mapName: string) {
    if (settings.values.elo.type === "wc3stats") {
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
    if (settings.values.elo.type !== "off") {
      try {
        if (!this.eloName) {
          this.emitInfo("Waiting for lookup name");
          setTimeout(() => {
            this.fetchStats(name);
          }, 1000);
          return;
        } else if (this.microLobby?.statsAvailable) {
          if (settings.values.elo.type === "wc3stats") {
            let buildVariant = "";
            if (this.#isTargetMap && settings.values.elo.wc3StatsVariant) {
              for (const [key, value] of Object.entries(
                JSON.parse(settings.values.elo.wc3StatsVariant)
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
              this.microLobby.ingestUpdate({ playerData: { name, extraData: data } })
                .isUpdated
            ) {
              this.emitLobbyUpdate({
                playerData: {
                  extraData: data,
                  name,
                },
              });
              this.emitInfo(name + " stats received and saved.");
              if (settings.values.elo.requireStats) {
                if (data.played < settings.values.elo.minGames) {
                  this.emitInfo(
                    `${name} has not played enough games to qualify for the ladder.`
                  );
                  this.banPlayer(name);
                  return;
                } else if (data.rating < settings.values.elo.minRating) {
                  this.emitInfo(`${name} has an ELO rating below the minimum.`);
                  this.banPlayer(name);
                  return;
                } else if (
                  settings.values.elo.minRank !== 0 &&
                  data.rank < settings.values.elo.minRank
                ) {
                  this.emitInfo(`${name} has a rank below the minimum.`);
                  this.banPlayer(name);
                  return;
                } else if (data.wins < settings.values.elo.minWins) {
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
    if (this.microLobby && this.microLobby.allPlayers.length < 2) {
      this.emitInfo("Try to refresh possibly stale lobby");
      this.emitLobbyUpdate({ stale: true });
    } else {
      this.emitInfo("Refreshing possibly stale lobby");
      this.refreshGame();
    }
  }

  refreshGame() {
    if (this.microLobby?.lobbyStatic?.isHost) {
      this.#refreshing = true;
      let targetSlots = Object.values(this.microLobby.slots)
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
        this.sendGameChat("Lobby changed. Starting game in " + delay + " second(s)!");
      } else {
        this.sendGameChat("Starting game in " + delay + " second(s)!");
      }
    }
    if (this.#startTimer) {
      clearTimeout(this.#startTimer);
    }
    this.#startTimer = setTimeout(() => {
      this.#startTimer = null;
      if (this.microLobby?.lobbyStatic?.isHost) {
        this.emitInfo("Starting game");
        this.sendGameChat("AutoHost functionality provided by WC3 MultiTool.");
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
      settings.values.elo.type !== "off" &&
      this.microLobby?.statsAvailable &&
      settings.values.elo.balanceTeams
    ) {
      let lobbyCopy = new MicroLobby({ fullData: this.microLobby.exportMin() });
      this.emitInfo("Auto balancing teams");
      if (this.bestCombo === undefined || this.bestCombo.length == 0) {
        if (teams.length < 2) {
          this.emitLobbyUpdate({ lobbyReady: true });
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
            (!settings.values.elo.excludeHostFromSwap &&
              bestComboInTeam1.length >= bestComboInTeam2.length) ||
            (settings.values.elo.excludeHostFromSwap &&
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
            this.sendGameChat(leastSwapTeam + " should be: " + this.bestCombo.join(", "));
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
            this.microLobby.getAllPlayerData(),
            // Just grab the size of the first team
            teams[0][1].filter((player) => player.realPlayer).length
          );
          if (this.microLobby.lobbyStatic?.isHost) {
            let lobbyCopy = new MicroLobby(
              { fullData: this.microLobby.exportMin() },
              false
            );
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
            let playerTeamNames = Object.values(this.microLobby.teamListLookup).filter(
              (team) => team.type === "playerTeams"
            );
            for (let i = 0; i < playerTeamNames.length; i++) {
              this.sendGameChat(
                playerTeamNames[i] + " should be " + this.bestCombo[i].join(", ")
              );
            }
          }
        }
        this.emitInfo("Players should now be balanced.");
        this.emitLobbyUpdate({ lobbyReady: true });
        this.sendGameChat("ELO data provided by: " + settings.values.elo.type);
      }
    } else {
      this.emitLobbyUpdate({ lobbyReady: true });
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

    if (settings.values.elo.type !== "off") {
      if (!this.microLobby?.lookupName) {
        console.log("No lookup name");
        return false;
      } else if (this.microLobby.statsAvailable) {
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
    if (this.microLobby?.lobbyStatic.isHost) {
      this.sendGameChat("Shuffling players...");
      let players = this.microLobby.nonSpecPlayers;
      let swappedPlayers: Array<string> = [];
      Object.values(players).forEach((player) => {
        let targetPlayer = players[Math.floor(Math.random() * players.length)];
        if (
          this.microLobby &&
          targetPlayer !== player &&
          !swappedPlayers.includes(targetPlayer) &&
          !swappedPlayers.includes(player)
        ) {
          // If teams can be shuffled as well, otherwise if the teams of the players to be swapped are different.
          if (
            shuffleTeams ||
            this.microLobby.slots[this.microLobby.playerToSlot(player)].team !==
              this.microLobby.slots[this.microLobby.playerToSlot(targetPlayer)].team
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
    if (this.microLobby?.lobbyStatic.isHost !== true) {
      this.emitError("Only the host can ban players");
      return;
    }
    let targetSlot = Object.values(this.microLobby.slots).find(
      (slot) => slot.name === player && slot.isSelf === false
    );
    if (targetSlot) {
      this.banSlot(targetSlot.slot);
    } else {
      this.sendGameChat("Player not found");
    }
  }

  closePlayer(player: string) {
    if (this.microLobby?.lobbyStatic.isHost !== true) {
      this.emitError("Only the host can close players");
      return;
    }
    let targetSlot = Object.values(this.microLobby.slots).find(
      (slot) => slot.name === player && slot.isSelf === false
    );
    if (targetSlot) {
      this.closeSlot(targetSlot.slot);
    } else {
      this.sendGameChat("Player not found");
    }
  }

  swapPlayers(data: { slots?: [SlotNumbers, SlotNumbers]; players?: [string, string] }) {
    if (this.microLobby?.lobbyStatic.isHost) {
      if (data.slots && data.slots.length === 2) {
        if (
          this.microLobby.slots[data.slots[0]].playerRegion &&
          this.microLobby.slots[data.slots[1]].playerRegion
        ) {
          data.players = [
            this.microLobby.slots[data.slots[0]].name,
            this.microLobby.slots[data.slots[1]].name,
          ];
        }
      }
      if (data.players && data.players.length === 2) {
        let target1 = this.microLobby.searchPlayer(data.players[0])[0];
        let target2 = this.microLobby.searchPlayer(data.players[1])[0];
        if (target1 && target2 && target1 !== target2) {
          this.#expectedSwaps.push([target1, target2].sort() as [string, string]);
          this.sendGameChat("!swap " + target1 + " " + target2);
        } else {
          this.sendGameChat("Possible invalid swap targets");
          this.emitError("Possible invalid swap targets: " + target1 + " and " + target2);
        }
      } else {
        this.sendGameChat("Possible invalid swap targets");
        this.emitError("Possible invalid swap targets: " + JSON.stringify(data.players));
      }
    }
  }

  kickPlayer(player: string) {
    if (this.microLobby?.lobbyStatic.isHost !== true) {
      this.emitError("Only the host can kick players");
      return;
    }
    let targetSlot = Object.values(this.microLobby.slots).find(
      (slot) => slot.name === player && slot.isSelf === false
    );
    if (targetSlot) {
      this.kickSlot(targetSlot.slot);
    } else {
      this.sendGameChat("Player not found");
    }
  }

  openPlayer(player: string) {
    if (this.microLobby?.lobbyStatic.isHost !== true) {
      this.emitError("Only the host can open slots");
      return;
    }
    let targetSlot = Object.values(this.microLobby.slots).find(
      (slot) => slot.name === player && slot.isSelf === false
    );
    if (targetSlot) {
      this.closeSlot(targetSlot.slot);
    } else {
      this.sendGameChat("Player not found");
    }
  }

  setPlayerHandicap(player: string, handicap: number) {
    if (this.microLobby?.lobbyStatic.isHost !== true) {
      this.emitError("Only the host can set handicaps");
      return;
    }
    let targetSlot = Object.values(this.microLobby.slots).find(
      (slot) => slot.name === player
    );
    if (targetSlot) {
      this.setHandicapSlot(targetSlot.slot, handicap);
    } else {
      this.sendGameChat("Player not found");
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
    if (this.microLobby?.lobbyStatic.isHost) {
      let targetSlot = Object.values(this.microLobby.slots).find(
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
    let lobby = this.microLobby;
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
    return this.microLobby?.getAllPlayerData()[player] ?? false;
  }

  emitLobbyUpdate(update: LobbyUpdates) {
    this.emit("lobbyUpdate", update);
  }
}
export const LobbySingle = new LobbyControl();
