export interface AppSettings {
  autoHost: AutoHostSettings;
  obs: ObsSettings;
  discord: DiscordSettings;
  elo: EloSettings;
}
export interface AutoHostSettings {
  type: string;
  private: boolean;
  sounds: boolean;
  increment: boolean;
  mapName: string;
  gameName: string;
  mapPath: string;
  announceIsBot: boolean;
  announceRestingInterval: number;
  moveToSpec: boolean;
  rapidHostTimer: number;
  voteStart: boolean;
  voteStartPercent: number;
  closeSlots: Array<number>;
}
export interface ObsSettings {
  type: string;
  inGameHotkey: ObsHotkeys | false;
  outOfGameHotkey: ObsHotkeys | false;
}
export type SettingsKeys =
  | keyof ObsSettings
  | keyof AutoHostSettings
  | keyof EloSettings
  | keyof DiscordSettings;
export interface ObsHotkeys {
  key: string;
  altKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
}
export interface DiscordSettings {
  type: string;
  token: string;
  channel: string;
}
export interface EloSettings {
  type: string;
  balanceTeams: boolean;
  announce: boolean;
  excludeHostFromSwap: boolean;
  lookupName: string;
  available: boolean;
}

export interface WindowReceive {
  messageType:
    | "statusChange"
    | "updateSettingSingle"
    | "lobbyUpdate"
    | "lobbyData"
    | "processing"
    | "menusChange"
    | "error"
    | "progress"
    | "gotMapPath"
    | "updateSettings";
  data: {
    update?: { setting: keyof AppSettings; key: SettingsKeys; value: any };
    settings?: AppSettings;
    connected?: boolean;
    progress?: { step: string; progress: number };
    error?: string;
    lobby?: Lobby;
    value?: string;
  };
}
export interface WindowSend {
  messageType: "openLogs" | "openWar" | "getMapPath" | "updateSettingSingle" | "init";
  data?: {
    update?: { setting: keyof AppSettings; key: SettingsKeys; value: any };
  };
}
export interface LobbyProcessed {
  allLobby: Array<string>;
  allPlayers: Array<string>;
  bestCombo: Array<string>;
  chatMessages: Array<{ name: string; message: string; time: string }>;
  eloList: { [key: string]: number };
  openPlayerSlots: number;
  playerSet: Array<string>;
  swaps: Array<Array<string>>;
  startingSlot: number;
  teamList: {
    playerTeams: TeamData;
    specTeams: TeamData;
    otherTeams: TeamData;
  };
  teamListLookup: {
    [key: string]: { type: TeamTypes; name: string };
  };
  voteStartVotes: Array<string>;
  lookingUpELO?: Set<string>;
  totalElo?: number;
  eloDiff?: number;
  leastSwap?: string;
}
export interface Lobby {
  lobbyName: string;
  lookupName: string;
  isHost: boolean;
  eloAvailable: boolean;
  teamData: { teams: Array<{ name: string; team: string; totalSlots: number }> };
  availableTeamColors: any;
  playerHost: string;
  mapName: string;
  region: string;
  processed: LobbyProcessed;
}
export type TeamTypes = "otherTeams" | "specTeams" | "playerTeams";
export interface TeamData {
  data: {
    [key: string]: {
      players: Array<string>;
      number: string;
      slots?: Array<string>;
      totalSlots: number;
      defaultOpenSlots: Array<number>;
    };
  };
  lookup: {
    [key: string]: string;
  };
}
export interface PlayerPayload {
  isSelf: boolean;
  team: string;
  slotStatus: number;
  slot: number;
  name: string;
  playerRegion: string;
}
export interface GameClientLobbyPayload {
  isHost: boolean;
  mapFile: string;
  playerHost: string;
  mapData: { mapName: string };
  lobbyName: string;
  teamData: {
    playableSlots: number;
    teams: Array<{ name: string; team: string; totalSlots: number }>;
  };
  players: Array<PlayerPayload>;
  availableTeamColors: any;
}
export interface GameClientMessage {
  messageType: "ScreenTransitionInfo" | "SetGlueScreen";
  payload: {
    screen?: string;
  };
  message?: { source: string; sender: string; content: string };
}
