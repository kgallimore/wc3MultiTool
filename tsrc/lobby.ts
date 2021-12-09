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
  playerData: { [key: string]: { elo: number; games: number } } = {};
  playerDataInProgress: Array<string> = [];
  allLobby: Array<string> = [];
  allPlayers: Array<string> = [];
  openPlayerSlots: number = 23;
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

  processLobby(payLoad: GameClientLobbyPayload) {}

  isFull() {
    return (
      (this.eloAvailable &&
        Object.keys(this.playerData).length === this.allPlayers.length &&
        this.openPlayerSlots === 0) ||
      (!this.eloAvailable && this.openPlayerSlots === 0)
    );
  }

  autoBalance() {
    this.totalElo = Object.values(this.playerData).reduce((a, b) => a + b.elo, 0);
    const combos = new Combination(
      Object.keys(this.playerData),
      Math.floor(
        Object.keys(this.playerData).length /
          Object.keys(this.teamList.playerTeams.data).length
      )
    );
  }

  /*swapHelper() {
    let swapsFromTeam1: Array<string> = [];
    let swapsFromTeam2: Array<string> = [];
    const team1 = Object.keys(lobby.teamList.playerTeams.data)[0];
    const team2 = Object.keys(lobby.teamList.playerTeams.data)[1];
    const bestComboInTeam1 = intersect(
      lobby.bestCombo,

      lobby.teamList.playerTeams.data[team1].players
    );
    const bestComboInTeam2 = intersect(
      lobby.bestCombo,
      lobby.teamList.playerTeams.data[team2].players
    );
    log.verbose(bestComboInTeam1, bestComboInTeam2);
    // If not excludeHostFromSwap and team1 has more best combo people, or excludeHostFromSwap and the best combo includes the host keep all best combo players in team 1.
    if (
      (!settings.elo.excludeHostFromSwap &&
        bestComboInTeam1.length >= bestComboInTeam2.length) ||
      (settings.elo.excludeHostFromSwap && lobby?.bestCombo.includes(lobby.playerHost))
    ) {
      lobby?.leastSwap = team1;
      // Go through team 1 and grab everyone who is not in the best combo

      lobby?.teamList.playerTeams.data[team1].players.forEach((user) => {
        if (!lobby?.bestCombo.includes(user)) {
          swapsFromTeam1.push(user);
        }
      });
      // Go through team 2 and grab everyone who is in the best combo

      bestComboInTeam2.forEach(function (user) {
        swapsFromTeam2.push(user);
      });
    } else {
      lobby?.leastSwap = team2;
      lobby?.teamList.playerTeams.data[team2].players.forEach((user) => {
        if (!lobby?.bestCombo.includes(user)) {
          swapsFromTeam2.push(user);
        }
      });
      bestComboInTeam1.forEach(function (user) {
        swapsFromTeam1.push(user);
      });
    }
    lobby?.swaps = [swapsFromTeam1, swapsFromTeam2];
  }*/

  getAllPlayers() {
    return Object.keys(this.playerData);
  }
}
