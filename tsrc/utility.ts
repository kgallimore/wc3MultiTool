export interface AppSettings {
  autoHost: AutoHostSettings;
  obs: ObsSettings;
  discord: DiscordSettings;
  elo: EloSettings;
  client: ClientSettings;
}

export interface ClientSettings {
  restartOnUpdate: boolean;
}
export interface AutoHostSettings {
  type: "off" | "lobbyHost" | "rapidHost" | "smartHost";
  private: boolean;
  sounds: boolean;
  increment: boolean;
  mapName: string;
  gameName: string;
  mapPath: string;
  announceIsBot: boolean;
  announceCustom: boolean;
  announceRestingInterval: number;
  moveToSpec: boolean;
  rapidHostTimer: number;
  smartHostTimeout: number;
  voteStart: boolean;
  voteStartPercent: number;
  closeSlots: Array<number>;
  customAnnouncement: string;
  observers: boolean;
  advancedMapOptions: boolean;
  flagLockTeams: boolean;
  flagPlaceTeamsTogether: boolean;
  flagFullSharedUnitControl: boolean;
  flagRandomRaces: boolean;
  flagRandomHero: boolean;
  settingVisibility: "0" | "1" | "2" | "3";
  leaveAlternate: boolean;
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
  type: "off" | "on";
  token: string;
  announceChannel: string;
  chatChannel: string;
  bidirectionalChat: boolean;
}
export interface EloSettings {
  type: "off" | "wc3stats" | "pyroTD";
  balanceTeams: boolean;
  announce: boolean;
  excludeHostFromSwap: boolean;
  lookupName: string;
  available: boolean;
  wc3statsVariant: string;
  experimental: boolean;
  handleReplays: boolean;
}

export interface WindowReceive {
  messageType:
    | "action"
    | "statusChange"
    | "updateSettingSingle"
    | "lobbyData"
    | "menusChange"
    | "error"
    | "progress"
    | "gotMapPath"
    | "updateSettings"
    | "updater";
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
  messageType:
    | "openLogs"
    | "openWar"
    | "getMapPath"
    | "updateSettingSingle"
    | "init"
    | "banPlayer"
    | "unbanPlayer"
    | "changePerm";
  data?: {
    update?: { setting: keyof AppSettings; key: SettingsKeys; value: any };
  };
  ban?: {
    player: string;
    reason?: string;
  };
  perm?: {
    player: string;
    role: "admin" | "moderator" | "";
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
  region: "us" | "eu";
  processed: LobbyProcessed;
}
export type TeamTypes = "otherTeams" | "specTeams" | "playerTeams";
export interface TeamData {
  data: {
    [key: string]: {
      players: Array<string>;
      number: string;
      slots: Array<string>;
      totalSlots: number;
      defaultOpenSlots: Array<number>;
    };
  };
  lookup: {
    [key: string]: string;
  };
}
export interface PlayerPayload {
  slotStatus: 0 | 1 | 2;
  slot: number;
  team: number;
  //What are slot types?
  // 0 = open, 1 = computer?
  slotType: number | 0 | 1;
  isObserver: boolean;
  isSelf: boolean;
  slotTypeChangeEnabled: boolean;
  id: number;
  name: string | "Computer (Easy)" | "Computer (Normal)" | "Computer (Insane)";
  playerRegion: "us" | "eu" | "";
  //what are gateways?
  playerGateway: number | -1;
  color:
    | 0
    | 1
    | 2
    | 3
    | 4
    | 5
    | 6
    | 7
    | 8
    | 9
    | 10
    | 11
    | 12
    | 13
    | 14
    | 15
    | 16
    | 17
    | 18
    | 19
    | 20
    | 21
    | 22
    | 23;
  colorChangeEnabled: boolean;
  teamChangeEnabled: boolean;
  race: 0 | 1 | 2 | 3 | 4;
  raceChangeEnabled: boolean;
  handicap: number;
  handicapChangeEnabled: boolean;
}
export interface GameClientLobbyPayload {
  isHost: boolean;
  playerHost: string;
  mapFile: string;
  maxTeams: number;
  isCustomForces: boolean;
  isCustomPlayers: boolean;
  mapData: {
    mapSize: string | "Extra Small";
    mapSpeed: string | "Fast";
    mapName: string;
    mapPath: string;
    mapAuthor: string;
    description: string;
    suggested_players: string;
  };
  lobbyName: string;
  mapFlags: {
    flagLockTeams: boolean;
    flagPlaceTeamsTogether: boolean;
    flagFullSharedUnitControl: boolean;
    flagRandomRaces: boolean;
    flagRandomHero: boolean;
    settingObservers:
      | "No Observers"
      | "Observers on Defeat"
      | "Referees"
      | "Full Observers";
    typeObservers: 0 | 1 | 2 | 3;
    settingVisibility: "Default" | "Hide Terrain" | "Map Explored" | "Always Visible";
    typeVisibility: 0 | 1 | 2 | 3;
  };
  teamData: {
    teams: Array<{ name: string; team: string; filledSlots: number; totalSlots: number }>;
    playableSlots: number;
    filledPlayableSlots: number;
    observerSlotsRemaining: number;
  };
  availableTeamColors: {
    [key: string]: Array<number>;
  };
  players: Array<PlayerPayload>;
}
export interface GameClientMessage {
  messageType: "ScreenTransitionInfo" | "SetGlueScreen";
  payload: {
    screen?: string;
  };
  message?: { source: string; sender: string; content: string };
}

export interface mmdResults {
  list: {
    [key: string]: { pid: string; won: boolean; extra: { [key: string]: string } };
  };
  lookup: { [key: string]: string };
}
