import type {
  PlayerTeamsData,
  LobbyUpdates,
  MicroLobbyData,
  GameClientLobbyPayload,
  Regions,
  PlayerPayload,
  TeamTypes,
  TeamData,
} from "./utility";

import { InvalidData } from "./utility";
export class MicroLobby {
  lookupName: string;
  region: Regions;
  slots: MicroLobbyData["slots"];
  lobbyStatic: MicroLobbyData["lobbyStatic"];
  teamListLookup: {
    [key: string]: { type: TeamTypes; name: string };
  };
  chatMessages: MicroLobbyData["chatMessages"];
  allPlayers: Array<string>;
  nonSpecPlayers: Array<string>;
  playerData: { [key: string]: { joinedAt: number; [key: string]: string | number } };

  constructor(data: {
    region: Regions;
    payload?: GameClientLobbyPayload;
    fullData?: MicroLobbyData;
  }) {
    if (data.payload) {
      let dataTest = InvalidData("MicroLobbyData", data, "object", {
        region: ["us", "eu", "usw"],
        slots: "object",
        lobbyStatic: {
          playerHost: "string",
          maxTeams: "number",
          isCustomForces: "boolean",
          isCustomPlayers: "boolean",
          isHost: "boolean",
          lobbyName: "string",
          mapData: {
            mapSize: "string",
            mapSpeed: "string",
            mapName: "string",
            mapAuthor: "string",
            description: "string",
            suggested_players: "string",
          },
          mapFlags: {
            flagLockTeams: "boolean",
            flagPlaceTeamsTogether: "boolean",
            flagFullSharedUnitControl: "boolean",
            flagRandomRaces: "boolean",
            flagRandomHero: "boolean",
            settingObservers: [
              "No Observers",
              "Observers on Defeat",
              "Referees",
              "Full Observers",
            ],
            typeObservers: "number",
            settingVisibility: [
              "Default",
              "Hide Terrain",
              "Map Explored",
              "Always Visible",
            ],
            typeVisibility: [0, 1, 2, 3],
          },
        },
      });
      if (dataTest) {
        throw new Error("Invalid Data: " + dataTest);
      }
      if (
        data.payload.playerHost &&
        data.payload.players[0] &&
        Object.values(data.payload.players).find((slot) => slot.isSelf) !== undefined
      ) {
        let { teamData, availableTeamColors, players, ...lobbyStatic } = data.payload;
        this.lobbyStatic = lobbyStatic;
        this.region = data.region;
        this.chatMessages = [];
        this.teamListLookup = {};
        for (const team of data.payload.teamData.teams) {
          const teamName = team.name;
          let teamType: TeamTypes = "playerTeams";
          let players = data.payload.players.filter(
            (player) => player.team === team.team
          );
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
          this.teamListLookup[team.team] = {
            type: teamType,
            name: teamName,
          };
        }
        this.slots = {};
        this.playerData = {};
        data.payload.players.forEach((newPlayer) => {
          this.slots[newPlayer.slot] = newPlayer;
          if (newPlayer.playerRegion || newPlayer.isSelf) {
            this.playerData[newPlayer.name] = {
              joinedAt: Date.now(),
            };
          }
        });
      } else {
        throw new Error("Invalid New Lobby data.");
      }
    } else if (data.fullData) {
      this.lobbyStatic = data.fullData.lobbyStatic;
      this.region = data.region;
      this.slots = data.fullData.slots;
      this.teamListLookup = data.fullData.teamListLookup;
      this.chatMessages = data.fullData.chatMessages;
      this.playerData = data.fullData.playerData;
      this.ingestUpdate({ playerPayload: Object.values(data.fullData.slots) });
    } else {
      this.playerData = {};
      this.slots = {};
      this.playerData = {};
      this.chatMessages = [];
      throw new Error("Missing New Lobby data.");
    }
    this.lobbyStatic.mapData.mapPath = this.cleanPathName(
      this.lobbyStatic.mapData.mapPath
    );
    this.lookupName = this.cleanMapName(this.lobbyStatic.mapData.mapName);
    this.allPlayers = this.getAllPlayers(true);
    this.nonSpecPlayers = this.getAllPlayers(false);
  }

  updateLobbySlots(slots: Array<PlayerPayload>): PlayerPayload[] {
    let playerUpdates: Array<PlayerPayload> = [];
    slots.forEach((player: PlayerPayload) => {
      if (JSON.stringify(this.slots[player.slot]) !== JSON.stringify(player)) {
        if ((player.playerRegion && player.name) || !player.playerRegion) {
          playerUpdates.push(player);
        }
      }
    });
    if (playerUpdates.length > 0) {
      this.ingestUpdate({ playerPayload: playerUpdates });
      return playerUpdates;
    } else {
      console.log("No player updates");
      return [];
    }
  }

  ingestUpdate(update: LobbyUpdates) {
    let isUpdated = false;
    if (update.chatMessage) {
      isUpdated = this.newChat(update.chatMessage.name, update.chatMessage.message);
    } else if (update.playerPayload) {
      for (const newPayload of update.playerPayload) {
        //let newData = [];
        if (this.slots[newPayload.slot] && this.slots[newPayload.slot] !== newPayload) {
          let check = InvalidData("newPayload", newPayload, "object", {
            slotStatus: [0, 1, 2],
            slot: [
              0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
              21, 22, 23,
            ],
            team: "number",
            slotType: [0, 1],
            isObserver: "boolean",
            isSelf: "boolean",
            slotTypeChangeEnabled: "boolean",
            id: "number",
            name: "string",
            playerRegion: ["eu", "us", "usw", ""],
            playerGateway: "number",
            color: [
              0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
              21, 22, 23,
            ],
            colorChangeEnabled: "boolean",
            teamChangeEnabled: "boolean",
            race: [0, 1, 2, 3, 4, 32],
            raceChangeEnabled: "boolean",
            handicap: "number",
            handicapChangeEnabled: "boolean",
          });
          if (check) {
            throw new Error("Invalid Update Data: " + check);
          }
          isUpdated = true;
          this.slots[newPayload.slot] = newPayload;
        }
      }
      for (const slot of Object.values(this.slots)) {
        if (slot.playerRegion && !this.allPlayers.includes(slot.name)) {
          isUpdated = true;
          console.log("New Player: " + slot.name);
          //this.emitData("playerJoin", slot.name);
        }
      }
      for (const player of this.allPlayers) {
        if (!this.getAllPlayers(true).includes(player)) {
          isUpdated = true;
          console.log("Player left", player);
          //this.emitData("playerLeft", player);
        }
      }
      this.allPlayers = this.getAllPlayers(true);
      this.nonSpecPlayers = this.getAllPlayers(false);
    }
    return isUpdated;
  }

  getAllPlayers(includeNonPlayerTeams: boolean = false): Array<string> {
    let target = includeNonPlayerTeams
      ? Object.values(this.slots).filter((slot) => slot.playerRegion || slot.isSelf)
      : Object.values(this.slots).filter(
          (slot) =>
            this.teamListLookup[slot.team].type === "playerTeams" &&
            (slot.playerRegion || slot.isSelf)
        );
    return target.map((slot) => slot.name);
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

  exportTeamStructure(playerTeamsOnly: boolean = true): PlayerTeamsData {
    let returnValue: PlayerTeamsData = {};
    let targetTeams = Object.entries(this.teamListLookup)
      .filter((team) => (playerTeamsOnly ? team[1].type === "playerTeams" : true))
      .map((team) => [team[0], team[1].name]);
    targetTeams.forEach(([teamNum, teamName]) => {
      let teamNumber = parseInt(teamNum);
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
            slot: this.playerToSlot(player.name),
            data:
              this.playerData[player.name] ??
              (player.playerRegion !== ""
                ? {
                    joinedAt: Date.now(),
                  }
                : -1),
          };
        });
    });
    return returnValue;
  }

  exportMin(): MicroLobbyData {
    return {
      lobbyStatic: this.lobbyStatic,
      region: this.region,
      slots: this.slots,
      teamListLookup: this.teamListLookup,
      chatMessages: this.chatMessages,
      playerData: this.playerData,
    };
  }

  getSelf(): string {
    return Object.values(this.slots).find((slot) => slot.isSelf)?.name ?? "";
  }

  cleanPathName(path: string): string {
    if (path.includes("/")) {
      return path.substring(path.lastIndexOf("/") + 1);
    } else {
      return path;
    }
  }

  cleanMapName(mapName: string): string {
    if (mapName.match(/(HLW)/i)) {
      return "HLW";
    } else if (mapName.match(/(pyro\s*td\s*league)/i)) {
      return "Pyro TD";
    } else if (mapName.match(/(vampirism\s*fire)/i)) {
      return "Vampirism Fire";
    } else if (mapName.match(/(footmen.*vs.*grunts)/i)) {
      return "Footmen Vs Grunts";
    } else if (mapName.match(/Broken.*Alliances/i)) {
      return "Broken Alliances";
    } else if (mapName.match(/Reforged.*Footmen.*Frenzy/i)) {
      return "Reforged Footmen Frenzy";
    } else if (mapName.match(/Direct.*Strike.*Reforged/i)) {
      return "Direct Strike";
    } else if (mapName.match(/WW3.*Diplomacy/i)) {
      return "WW3 Diplomacy";
    } else if (mapName.match(/Legion.*TD/i)) {
      return "Legion TD";
    } else if (mapName.match(/Tree.*Tag/i)) {
      return "Tree Tag";
    } else if (mapName.match(/Battleships.*Crossfire/i)) {
      return "Battleships Crossfire";
    } else {
      return mapName.trim().replace(/\s*v?\.?(\d+\.)?(\*|\d+)\w*\s*$/gi, "");
    }
  }

  playerToSlot(player: string): number {
    let slot = Object.values(this.slots).find((slot) => slot.name === player);
    if (slot) {
      return slot.slot;
    } else {
      console.warn("Player not found in slot list: " + player);
      return -1;
    }
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
}
