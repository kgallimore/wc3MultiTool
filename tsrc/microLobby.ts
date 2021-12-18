import type {
  GameClientLobbyPayloadStatic,
  PlayerPayload,
  PlayerData,
  PlayerTeamsData,
  TeamData,
} from "./utility";
export class WarLobby {
  lookupName: string = "";
  wc3StatsVariant: string = "";
  eloAvailable: boolean = false;
  eloType: "wc3stats" | "pyroTD" | "off" = "off";
  totalElo: number = 0;
  region: "us" | "eu" = "eu";
  slots: { [key: string]: PlayerPayload } = {};
  lobbyStatic: GameClientLobbyPayloadStatic | null = null;
  playerData: {
    [key: string]: PlayerData;
  } = {};
  teamList: { otherTeams: TeamData; specTeams: TeamData; playerTeams: TeamData } = {
    otherTeams: { data: {}, lookup: {} },
    specTeams: { data: {}, lookup: {} },
    playerTeams: { data: {}, lookup: {} },
  };
  chatMessages: Array<{ name: string; message: string; time: string }> = [];

  constructor() {}

  ingestUpdate() {}

  clear() {
    this.lookupName = "";
    this.wc3StatsVariant = "";
    this.eloAvailable = false;
    this.eloType = "off";
    this.totalElo = 0;
    this.region = "eu";
    this.lobbyStatic = null;
    this.slots = {};
    this.playerData = {};
    this.chatMessages = [];
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

  getPlayerTeams() {
    let returnValue: PlayerTeamsData = {};
    let playerTeams = Object.entries(this.teamList.playerTeams.data);
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

  export() {
    return {
      mapData: this.lobbyStatic,
      playerData: this.playerData,
      slots: this.slots,
      region: this.region,
      chatMessages: this.chatMessages,
      lookupName: this.lookupName,
    };
  }
}
