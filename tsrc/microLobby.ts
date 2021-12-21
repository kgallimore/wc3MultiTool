import type {
  GameClientLobbyPayloadStatic,
  PlayerPayload,
  PlayerData,
  PlayerTeamsData,
  TeamData,
  LobbyUpdates,
  MicroLobbyData,
} from "./utility";
export class MicroLobby {
  lookupName: string;
  wc3StatsVariant: string;
  eloAvailable: boolean;
  eloType: "wc3stats" | "pyroTD" | "off";
  region: "us" | "eu";
  slots: { [key: string]: PlayerPayload };
  lobbyStatic: GameClientLobbyPayloadStatic;
  playerData: {
    [key: string]: PlayerData;
  };
  teamList: { otherTeams: TeamData; specTeams: TeamData; playerTeams: TeamData };
  chatMessages: Array<{ name: string; message: string; time: string }>;

  constructor(data: MicroLobbyData) {
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
    if (update.playerData) {
      if (
        update.playerData.name &&
        update.playerData.data &&
        this.playerData[update.playerData.name] &&
        this.playerData[update.playerData.name] !== update.playerData.data
      ) {
        isUpdated = true;
        this.playerData[update.playerData.name] = update.playerData.data;
      } else {
        console.log("Missing playerData");
      }
    } else if (update.playerPayload) {
      if (this.slots[update.playerPayload.slot] !== update.playerPayload) {
        isUpdated = true;
        this.slots[update.playerPayload.slot] = update.playerPayload;
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
    this.chatMessages.push({ name, message, time: new Date().getTime().toString() });
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
            slot: player.slot,
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
}
