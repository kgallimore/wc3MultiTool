import fetch from "cross-fetch";
import { MicroLobby } from "./lobbyData";
import type {
  PlayerData,
  LobbyUpdates,
  PlayerTeamsData,
  LobbyAppSettings,
  GameClientLobbyPayload,
} from "./utility";
import { ensureInt } from "./utility";
import EventEmitter from "events";

require = require("esm")(module);
var { Combination, Permutation } = require("js-combinatorics");

export class LobbyControl extends EventEmitter {
  #appSettings: LobbyAppSettings;
  #refreshing: boolean = false;
  #staleTimer: NodeJS.Timeout | null = null;

  voteStartVotes: Array<string> = [];
  eloAvailable: boolean = false;
  bestCombo: Array<string> | Array<Array<string>> = [];
  lobby: MicroLobby | null = null;

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

  ingestLobby(payload: GameClientLobbyPayload, region: "us" | "eu") {
    if (!this.lobby || this.lobby.lobbyStatic.lobbyName !== payload.lobbyName) {
      this.lobby = new MicroLobby({ region, payload });
      this.emitUpdate({ newLobby: this.lobby });
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
  }

  async eloMapName(mapName: string) {
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
      } else if (mapName.match(/Battleships.*Crossfire/i)) {
        return { name: "Battleships%20Crossfire", elo: true };
      } else {
        let name = encodeURI(
          mapName.trim().replace(/\s*v?\.?(\d+\.)?(\*|\d+)\w*\s*$/gi, "")
        );
        let test = await (await fetch(`https://api.wc3stats.com/maps/${name}`)).json();
        return { name, elo: test.status === "ok" };
      }
    } else throw new Error("Unknown or unsupported type");
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
    let teams = Object.entries(this.exportDataStructure(true));
    if (
      this.lobby &&
      this.#appSettings.eloType !== "off" &&
      this.eloAvailable &&
      this.#appSettings.balanceTeams
    ) {
      let lobby = this.lobby;
      this.emitInfo("Auto balancing teams");
      if (this.bestCombo === undefined || this.bestCombo.length == 0) {
        if (teams.length < 2) {
          this.emitUpdate({ lobbyReady: true });
          return;
        } else if (teams.length === 2) {
          let leastSwapTeam = "Team ?";
          let swaps: Array<Array<string>> = [];
          let players = Object.entries(lobby.playerData).filter(
            (x) => x[1].rating && lobby.nonSpecPlayers.includes(x[0])
          );
          let totalElo = players.reduce((a, b) => a + ensureInt(b[1].rating), 0);
          let smallestEloDiff = Number.POSITIVE_INFINITY;
          let bestCombo: Array<string> = [];
          const combos: Array<Array<string>> = new Combination(
            players.map((player) => player[0]),
            Math.floor(players.length / 2)
          );
          for (const combo of combos) {
            const comboElo = combo.reduce(
              (a, b) => a + ensureInt(lobby.playerData[b].rating),
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
              this.bestCombo.includes(lobby.lobbyStatic?.playerHost || ""))
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
          if (!lobby.lobbyStatic.isHost) {
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
          this.bestCombo = this.lobbyCombinations(lobby.nonSpecPlayers, teams.length);
          if (this.lobby.lobbyStatic?.isHost) {
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
            } = JSON.parse(JSON.stringify(lobby.playerData));
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
        this.emitUpdate({ lobbyReady: true });
        this.emitChat("ELO data provided by: " + this.#appSettings.eloType);
      }
    } else {
      this.emitUpdate({ lobbyReady: true });
    }
  }

  isLobbyReady() {
    let teams = this.exportDataStructure(true);
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
      } else if (this.eloAvailable) {
        for (const team of Object.values(teams)) {
          if (
            team.filter(
              (slot) =>
                slot.slotStatus == 0 ||
                (slot.realPlayer && slot.data.rating && slot.data.rating < 0)
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
        (data) =>
          data.name +
          (data.data?.rating && data.data.rating > -1
            ? ": " +
              [data.data.rating, data.data.rank, data.data.wins, data.data.losses].join(
                "/"
              )
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

  getPlayerData(player: string) {
    return this.lobby?.playerData[player] ?? false;
  }
}
