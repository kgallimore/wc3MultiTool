import * as https from "https";
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
  MicroLobbyData,
} from "./utility";
require = require("esm")(module);
var { Combination } = require("js-combinatorics");
export class WarLobby extends EventEmitter {
  lookupName: string = "";
  wc3StatsVariant: string;
  eloAvailable: boolean = false;
  eloType: "wc3stats" | "pyroTD" | "off";
  region: "us" | "eu" = "eu";
  voteStartVotes: Array<string> = [];
  slots: { [key: string]: PlayerPayload } = {};
  #slotLookup: { [key: string]: number } = {};
  lobbyStatic: GameClientLobbyPayloadStatic | null = null;
  playerData: {
    [key: string]: PlayerData;
  } = {};
  chatMessages: Array<{ name: string; message: string; time: string }> = [];
  teamList: { otherTeams: TeamData; specTeams: TeamData; playerTeams: TeamData } = {
    otherTeams: { data: {}, lookup: {} },
    specTeams: { data: {}, lookup: {} },
    playerTeams: { data: {}, lookup: {} },
  };
  #teamListLookup: {
    [key: string]: { type: TeamTypes; name: string };
  } = {};

  constructor(eloType: "wc3stats" | "pyroTD" | "off", buildVariant: string) {
    super();
    this.eloType = eloType;
    this.wc3StatsVariant = buildVariant;
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
        const teamType = this.testTeam(teamName);
        this.teamList[teamType].data[teamName] = team.team;
        this.teamList[teamType].lookup[team.team] = teamName;
        this.#teamListLookup[team.team] = {
          type: teamType,
          name: teamName,
        };
      }
      payload.players.forEach((player) => {
        this.slots[player.slot] = player;
        if (player.playerRegion) {
          this.playerData[player.name] = {
            wins: -1,
            losses: -1,
            rating: -1,
            played: -1,
            lastChange: 0,
            rank: -1,
          };
          this.fetchStats(player.name);
        }
      });
      this.emitUpdate({ type: "newLobby", data: { newData: this.export() } });
    } else {
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
          this.emitUpdate({ type: "playerPayload", data: { playerPayload: player } });
        }
      });
      for (const slot of Object.values(this.slots)) {
        if (slot.playerRegion && !this.playerData[slot.name]) {
          this.emitUpdate({ type: "playerJoined", data: { playerPayload: slot } });
          this.playerData[slot.name] = {
            wins: -1,
            losses: -1,
            rating: -1,
            played: -1,
            lastChange: 0,
            rank: -1,
          };
          this.fetchStats(slot.name);
        }
      }
      for (const player of Object.keys(this.playerData)) {
        if (!this.getAllPlayers(true).includes(player)) {
          this.emitUpdate({ type: "playerLeft", data: { playerName: player } });
          this.playerLeave(player);
        }
      }
      if (this.isLobbyReady()) {
        this.emitUpdate({ type: "lobbyReady", data: {} });
      }
    }
  }

  async fetchStats(name: string) {
    if (this.eloType === "wc3stats") {
      let buildVariant = "";
      Object.entries(JSON.parse(this.wc3StatsVariant)).forEach(([key, value]) => {
        if (value) buildVariant += "&" + key + "=" + value;
      });
      if (this.lookupName) {
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
            let { name, ...desiredData } = jsonData.body[0];
            data = desiredData;
          }
          data = data ?? {
            played: 0,
            wins: 0,
            losses: 0,
            rating: elo,
            lastChange: 0,
            rank: 9999,
          };
          // If they haven't left, set real ELO
          if (this.playerData[name]) {
            this.playerData[name] = data;
            this.emitUpdate({
              type: "playerData",
              data: {
                playerData: data,
                playerName: name,
              },
            });
            this.emitInfo(name + " stats received and saved.");
            // If the lobby is full, and we have the ELO for everyone,
            if (this.isLobbyReady()) {
              this.emitUpdate({ type: "lobbyReady", data: {} });
            }
          } else {
            this.emitInfo(name + " left before ELO was found");
          }
        } else {
          this.emitInfo("Elo not available. Skipping");
        }
      } else {
        this.emitInfo("Waiting for lookup name");
        setTimeout(() => {
          this.fetchStats(name);
        }, 1000);
      }
    } else {
      this.emitInfo("No elo enabled");
    }
  }

  playerLeave(name: string) {
    if (this.playerData[name]) {
      delete this.playerData[name];
    }
  }

  emitUpdate(update: LobbyUpdates) {
    this.emit("update", update);
  }

  emitError(error: string) {
    this.emit("error", error);
  }

  emitInfo(message: string) {
    this.emit("error", message);
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

  newChat(name: string, message: string) {
    this.chatMessages.push({ name, message, time: new Date().getTime().toString() });
  }

  isLobbyReady() {
    let teams = this.exportTeamStructure(false);
    if (this.eloType !== "off" && this.eloAvailable) {
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
    return true;
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
        .filter(
          (player) =>
            teamNumber === player.team &&
            (player.playerRegion ||
              (!player.playerRegion && player.slotTypeChangeEnabled))
        )
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
            }),
          };
        });
    });
    return returnValue;
  }

  getPlayerData(player: string) {
    return this.playerData[this.#slotLookup[player]] ?? false;
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
        wc3StatsVariant: this.wc3StatsVariant,
        eloAvailable: this.eloAvailable,
        eloType: this.eloType,
        teamList: this.teamList,
      };
    }
  }
}
