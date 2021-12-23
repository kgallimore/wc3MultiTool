import type { PlayerTeamsData, LobbyUpdates, MicroLobbyData } from "./utility";

import { InvalidData } from "./utility";
export class MicroLobby {
  // TODO: Fix typing
  lookupName: MicroLobbyData["lookupName"];
  wc3StatsVariant: MicroLobbyData["wc3StatsVariant"];
  eloAvailable: MicroLobbyData["eloAvailable"];
  eloType: MicroLobbyData["eloType"];
  region: MicroLobbyData["region"];
  slots: MicroLobbyData["slots"];
  lobbyStatic: MicroLobbyData["lobbyStatic"];
  playerData: MicroLobbyData["playerData"];
  teamList: MicroLobbyData["teamList"];
  chatMessages: MicroLobbyData["chatMessages"];

  constructor(data: MicroLobbyData) {
    let dataTest = InvalidData("MicroLobbyData", data, "object", {
      lookupName: "string",
      wc3StatsVariant: "string",
      eloAvailable: "boolean",
      eloType: ["off", "wc3stats"],
      region: ["us", "eu"],
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
          typeObservers: [0, 1, 2, 3],
          settingVisibility: [
            "Default",
            "Hide Terrain",
            "Map Explored",
            "Always Visible",
          ],
          typeVisibility: [0, 1, 2, 3],
        },
      },
      playerData: "object",
      teamList: {
        otherTeams: { data: "object", lookup: "object" },
        specTeams: { data: "object", lookup: "object" },
        playerTeams: { data: "object", lookup: "object" },
      },
    });
    if (dataTest) {
      throw new Error("Invalid Data: " + dataTest);
    }
    this.lobbyStatic = data.lobbyStatic;
    this.lookupName = data.lookupName;
    this.wc3StatsVariant = data.wc3StatsVariant;
    this.eloAvailable = data.eloAvailable;
    this.eloType = data.eloType;
    this.region = data.region;
    this.slots = data.slots;
    this.playerData = data.playerData;
    this.teamList = data.teamList;
    this.chatMessages = data.chatMessages;
  }

  ingestUpdate(update: LobbyUpdates) {
    let isUpdated = false;
    if (update.chatMessage) {
      isUpdated = this.newChat(update.chatMessage.name, update.chatMessage.message);
    } else {
      if (update.playerData) {
        if (this.playerData[update.playerData.name] !== update.playerData.data) {
          let check = InvalidData("playerData", update.playerData, "object", {
            name: "string",
            data: {
              slot: "number",
              played: "number",
              wins: "number",
              losses: "number",
              rating: "number",
              lastChange: "number",
              rank: "number",
            },
          });
          if (check) {
            throw new Error("Invalid Player Data: " + check);
          }
          isUpdated = true;
          this.playerData[update.playerData.name] = update.playerData.data;
        } else {
          console.log("Missing playerData");
        }
      } else if (update.playerPayload) {
        for (const newPayload of update.playerPayload) {
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
              playerRegion: ["eu", "us", ""],
              playerGateway: "number",
              color: [
                0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
                21, 22, 23,
              ],
              colorChangeEnabled: "boolean",
              teamChangeEnabled: "boolean",
              race: [0, 1, 2, 3, 4],
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
      }
      for (const slot of Object.values(this.slots)) {
        if (slot.playerRegion && !this.playerData[slot.name]) {
          isUpdated = true;
          console.log("playerJoined", slot.name);
          this.playerData[slot.name] = {
            wins: -1,
            losses: -1,
            rating: -1,
            played: -1,
            lastChange: 0,
            rank: -1,
            slot: slot.slot,
          };
        }
      }
      for (const player of Object.keys(this.playerData)) {
        if (!this.getAllPlayers(true).includes(player)) {
          isUpdated = true;
          console.log("Player left", player);
          this.playerLeave(player);
        }
      }
    }
    return isUpdated;
  }

  playerLeave(name: string) {
    if (this.playerData[name]) {
      delete this.playerData[name];
    }
  }

  getAllPlayers(includeNonPlayerTeams: boolean = false) {
    let target = includeNonPlayerTeams
      ? Object.values(this.slots).filter((slot) => slot.playerRegion)
      : Object.values(this.slots).filter(
          (slot) => this.teamList.playerTeams.lookup[slot.team] && slot.playerRegion
        );
    return target.map((slot) => slot.name);
  }

  newChat(name: string, message: string) {
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

  export() {
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
  getSelf(): string {
    return Object.values(this.slots).find((slot) => slot.isSelf)?.name ?? "";
  }
}
