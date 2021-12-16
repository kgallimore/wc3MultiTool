import EventEmitter from "events";
import type {
  GameClientLobbyPayload,
  LobbyProcessed,
  TeamTypes,
  PlayerPayload,
} from "./utility";
require = require("esm")(module);
var { Combination } = require("js-combinatorics");
export class WarLobby extends EventEmitter {
  lobbyName: string;
  isHost: boolean;
  availableTeamColors: any;
  playerHost: string;
  mapName: string;
  region: "us" | "eu";
  lookupName: string;
  chatMessages: Array<{ name: string; message: string; time: string }> = [];
  playerDataInProgress: Array<string> = [];
  startingSlot: number = 0;
  teamList: LobbyProcessed["teamList"] = {
    otherTeams: { data: {}, lookup: {} },
    specTeams: { data: {}, lookup: {} },
    playerTeams: { data: {}, lookup: {} },
  };
  teamListLookup: {
    [key: string]: { type: TeamTypes; name: string };
  } = {};
  eloAvailable: boolean;
  voteStartVotes: Array<string> = [];
  totalElo: number = 0;
  slots: Array<{ data: PlayerPayload; elo: string; gamesPlayed: string }> = [];

  constructor(
    payload: GameClientLobbyPayload,
    region: "us" | "eu",
    lookupName: string,
    eloAvailable: boolean
  ) {
    super();
    this.lobbyName = payload.lobbyName;
    this.isHost = payload.isHost;
    this.availableTeamColors = payload.availableTeamColors;
    this.playerHost = payload.playerHost;
    this.mapName = payload.mapData.mapName;
    this.region = region;
    this.lookupName = lookupName;
    this.eloAvailable = eloAvailable;
    const testNonPlayersTeam = /((computer)|(creeps)|(summoned))/i;
    const testSpecTeam = /((host)|(spectator)|(observer)|(referee))/i;
    for (const team of payload.teamData.teams) {
      const teamName = team.name;
      if (testNonPlayersTeam.test(teamName)) {
        this.teamList.otherTeams.data[teamName] = {
          number: team.team,
          totalSlots: team.totalSlots,
          defaultOpenSlots: [],
          players: [],
          slots: [],
        };
        this.teamList.otherTeams.lookup[team.team] = teamName;
        this.teamListLookup[team.team] = {
          type: "otherTeams",
          name: teamName,
        };
      } else if (testSpecTeam.test(teamName)) {
        this.teamList.specTeams.data[teamName] = {
          number: team.team,
          totalSlots: team.totalSlots,
          defaultOpenSlots: [],
          players: [],
          slots: [],
        };
        this.teamList.specTeams.lookup[team.team] = teamName;
        this.teamListLookup[team.team] = {
          type: "specTeams",
          name: teamName,
        };
      } else {
        this.teamList.playerTeams.data[teamName] = {
          number: team.team,
          totalSlots: team.totalSlots,
          defaultOpenSlots: [],
          players: [],
          slots: [],
        };
        this.teamList.playerTeams.lookup[team.team] = teamName;
        this.teamListLookup[team.team] = {
          type: "playerTeams",
          name: teamName,
        };
      }
    }

    payload.players.forEach((player: PlayerPayload) => {
      if (JSON.stringify(this.slots[player.slot].data) !== JSON.stringify(player)) {
        this.slots[player.slot] = { data: player, elo: "N/A", gamesPlayed: "N/A" };
      }
      const teamType = this.teamListLookup[player.team].type;
      const teamName = this.teamListLookup[player.team].name;
      if (player.slotStatus === 0) {
        this.teamList[teamType].data[teamName].defaultOpenSlots.push(player.slot);
      }
      if (player.isSelf) {
        this.startingSlot = player.slot;
      }
    });
    this.processLobby(payload);
  }

  processLobby(payload: GameClientLobbyPayload) {
    payload.players.forEach((player: PlayerPayload) => {
      if (JSON.stringify(this.slots[player.slot].data) !== JSON.stringify(player)) {
        this.slots[player.slot] = { data: player, elo: "N/A", gamesPlayed: "N/A" };
      }
    });
  }
}
