import type { LobbyUpdates, Regions, MicroLobbyData } from "wc3mt-lobby-container";

export interface AppSettings {
  autoHost: AutoHostSettings;
  obs: ObsSettings;
  discord: DiscordSettings;
  elo: EloSettings;
  client: ClientSettings;
  streaming: StreamingSettings;
}
export interface StreamingSettings {
  enabled: boolean;
  seToken: string;
  sendTipsInGame: boolean;
  sendTipsInLobby: boolean;
  sendTipsInDiscord: boolean;
  minInGameTip: number;
}
export interface ClientSettings {
  restartOnUpdate: boolean;
  checkForUpdates: boolean;
  performanceMode: boolean;
  openWarcraftOnStart: boolean;
  startOnLogin: boolean;
  commAddress: string;
  language: "en" | "es" | "fr" | "de" | "it" | "ja" | "ko" | "pt" | "ru" | "zh";
  translateToLobby: boolean;
  antiCrash: boolean;
  alternateLaunch: boolean;
  bnetUsername: string;
  bnetPassword: string;
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
  moveToTeam: string;
  rapidHostTimer: number;
  smartHostTimeout: number;
  voteStart: boolean;
  voteStartPercent: number;
  voteStartTeamFill: boolean;
  closeSlots: Array<number>;
  customAnnouncement: string;
  observers: "0" | "1" | "2" | "3";
  advancedMapOptions: boolean;
  flagLockTeams: boolean;
  flagPlaceTeamsTogether: boolean;
  flagFullSharedUnitControl: boolean;
  flagRandomRaces: boolean;
  flagRandomHero: boolean;
  settingVisibility: "0" | "1" | "2" | "3";
  leaveAlternate: boolean;
  regionChange: boolean;
  regionChangeTimeEU: string;
  regionChangeTimeNA: string;
  shufflePlayers: boolean;
  whitelist: boolean;
  minPlayers: number;
  delayStart: number;
}
export interface ObsSettings {
  enabled: boolean;
  sceneSwitchType: "off" | "hotkeys" | "websockets";
  inGameHotkey: ObsHotkeys | false;
  outOfGameHotkey: ObsHotkeys | false;
  inGameWSScene: string;
  outOfGameWSScene: string;
  address: string;
  token: string;
  autoStream: boolean;
  textSource: boolean;
}
export type SettingsKeys =
  | keyof ObsSettings
  | keyof AutoHostSettings
  | keyof EloSettings
  | keyof DiscordSettings
  | keyof ClientSettings
  | keyof StreamingSettings;
export interface ObsHotkeys {
  key: string;
  altKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
}
export interface DiscordSettings {
  enabled: boolean;
  token: string;
  announceChannel: string;
  chatChannel: string;
  bidirectionalChat: boolean;
  sendInGameChat: boolean;
}
export interface EloSettings {
  type: "off" | "wc3stats" | "pyroTD";
  balanceTeams: boolean;
  announce: boolean;
  excludeHostFromSwap: boolean;
  lookupName: string;
  privateKey: string;
  available: boolean;
  wc3StatsVariant: string;
  handleReplays: boolean;
  requireStats: boolean;
  minRank: number;
  minRating: number;
  minGames: number;
  minWins: number;
}

export interface WindowReceive {
  messageType:
    | "action"
    | "statusChange"
    | "updateSettingSingle"
    | "lobbyUpdate"
    | "menusChange"
    | "error"
    | "progress"
    | "gotMapPath"
    | "updateSettings"
    | "updater"
    | "whiteList"
    | "banList";
  data: {
    update?: { setting: keyof AppSettings; key: SettingsKeys; value: any };
    settings?: AppSettings;
    connected?: boolean;
    progress?: { step: string; progress: number };
    error?: string;
    value?: string;
    lobbyData?: LobbyUpdates;
    page?: number;
    banList?: Array<
      BanWhiteList & {
        ban_date: string;
        unban_date: string;
      }
    >;
    whiteList?: Array<
      BanWhiteList & {
        white_date: string;
        unwhite_date: string;
      }
    >;
  };
}

export interface BanWhiteList {
  id: number;
  username: string;
  admin: string;
  region: string;
  reason: string;
}

export interface ClientCommands {
  action:
    | "openLogs"
    | "openWar"
    | "closeWar"
    | "updateSettingSingle"
    | "init"
    | "banPlayer"
    | "unbanPlayer"
    | "whitePlayer"
    | "unwhitePlayer"
    | "changePerm";
  data?: {
    settings?: { setting: keyof AppSettings; key: SettingsKeys; value: any };
    ban?: {
      player: string;
      reason?: string;
    };
    white?: {
      player: string;
      reason?: string;
    };
    perm?: {
      player: string;
      role: "admin" | "moderator" | "";
    };
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
    | "whitePlayer"
    | "unwhitePlayer"
    | "changePerm"
    | "fetchBanList"
    | "fetchWhiteList"
    | "createLobby"
    | "autoHostLobby"
    | "joinLobby"
    | "leaveLobby"
    | "startLobby";
  update?: { setting: keyof AppSettings; key: SettingsKeys; value: any };
  ban?: {
    player: string;
    reason?: string;
  };
  white?: {
    player: string;
    reason?: string;
  };
  page?: number;
  perm?: {
    player: string;
    role: "admin" | "moderator" | "";
  };
  lobbyOptions?: {};
}

export interface TeamData {
  data: { [key: string]: number };
  lookup: { [key: number]: string };
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

export interface HubReceive {
  messageType: "lobbyUpdate" | "lobbyStarted" | "heartbeat" | "settings" | "gameState";
  data?: { lobbyUpdates?: LobbyUpdates; settings?: AppSettings; gameState?: GameState };
  appVersion: string;
}
export interface HubSend {
  messageType:
    | "newLobby"
    | "lobbyUpdate"
    | "lobbyClosed"
    | "clientSizeChange"
    | "userJoinedLobby"
    | "userLeftLobby";
  data: {
    newData?: MicroLobbyData;
    change?: {
      lobby: { region: Regions; name: string };
      lobbyUpdate?: LobbyUpdates;
    };
    userLobby?: { userName: string; lobbyName: string; region: Regions };
    clientSize?: number;
  };
}

export function DeColorName(name: string): string {
  return name.replace(/(\|c[0-9a-f]{8})|(\|r)/gi, "");
}

type ValidObjectTypes = "boolean" | "object" | "string" | "number";

interface ObjectLookup {
  [key: string]: ValidObjectTypes | ObjectLookup | Array<any>;
}

export interface LobbyAppSettings {
  balanceTeams: boolean;
  wc3StatsVariant: string;
  excludeHostFromSwap: boolean;
  moveToSpec: boolean;
  moveToTeam: string;
  eloType: "wc3stats" | "pyroTD" | "off";
  closeSlots: Array<number>;
  mapPath: string;
  requireStats: boolean;
  minRank: number;
  minGames: number;
  minWins: number;
  minRating: number;
}

export interface OpenLobbyParams {
  lobbyName?: string;
  gameId?: string;
  mapFile?: string;
  region?: Regions;
}

export function getTargetRegion(
  regionChangeTimeEU: string,
  regionChangeTimeNA: string
): "us" | "eu" {
  let currentTime = new Date().getUTCHours() * 100 + new Date().getUTCMinutes();
  let targetTimes = {
    eu: parseInt(regionChangeTimeEU.replace(":", "")),
    us: parseInt(regionChangeTimeNA.replace(":", "")),
  };
  if (targetTimes.us > targetTimes.eu) {
    console.log("US later", currentTime, targetTimes);
    if (currentTime > targetTimes.eu && currentTime < targetTimes.us) {
      return "eu";
    } else {
      return "us";
    }
  } else {
    if (currentTime > targetTimes.us && currentTime < targetTimes.eu) {
      return "us";
    } else {
      return "eu";
    }
  }
}

export interface GameState {
  selfRegion: Regions | "";
  menuState: "OUT_OF_MENUS" | "MAIN_MENU" | "CUSTOM_LOBBIES" | "GAME_LOBBY" | string;
  screenState: string;
  selfBattleTag: string;
  inGame: boolean;
  action:
    | "openingWarcraft"
    | "creatingLobby"
    | "waitingToLeaveGame"
    | "waitingInLobby"
    | "nothing"
    | "joiningLobby"
    | "leavingLobby"
    | "closingWarcraft";
}

export const ColorLookup = {
  hex: [
    "00FF0303",
    "000042FF",
    "001CE6B9",
    "00540081",
    "00FFFC01",
    "00fEBA0E",
    "0020C000",
    "00E55BB0",
    "00959697",
    "007EBFF1",
    "00106246",
    "004E2A04",
    "ff9c0000",
    "ff0000c3",
    "ff00ebff",
    "ffbd00ff",
    "ffecce87",
    "fff7a58b",
    "ffbfff81",
    "ffdbb8eb",
    "ff4f5055",
    "ffecf0ff",
    "ff00781e",
    "ffa56f34",
  ],
  discord: [],
};

export function ensureInt(value: string | number) {
  if (typeof value === "string") {
    return parseInt(value);
  } else {
    return value;
  }
}

export function isValidUrl(target: string) {
  let url;

  try {
    url = new URL(target);
  } catch (_) {
    return false;
  }

  return true;
}
