import type { LobbyUpdates, Regions, MicroLobbyData } from "wc3mt-lobby-container";
import type { AppSettings, SettingsKeys } from "./globals/settings";

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
    | "fetchedWhiteBanList";
  data: {
    update?: { setting: keyof AppSettings; key: SettingsKeys; value: any };
    settings?: AppSettings;
    connected?: boolean;
    progress?: { step: string; progress: number };
    error?: string;
    value?: string;
    lobbyData?: LobbyUpdates;
    fetched?: {
      type: "banList" | "whiteList";
      page: number;
      list?: Array<BanWhiteList>;
    };
  };
}

export interface BanWhiteList {
  id: number;
  username: string;
  admin: string;
  region: Regions;
  reason: string;
  add_date: string;
  removal_date: string;
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
    | "addWhiteBan"
    | "removeWhiteBan"
    | "changePerm"
    | "fetchWhiteBanList"
    | "createLobby"
    | "autoHostLobby"
    | "joinLobby"
    | "leaveLobby"
    | "startLobby"
    | "exportWhitesBans"
    | "importWhitesBans";
  update?: { setting: keyof AppSettings; key: SettingsKeys; value: any };
  addWhiteBan?: {
    type: "banList" | "whiteList";
    player: string;
    reason?: string;
  };
  removeWhiteBan?: {
    player: string;
    type: "banList" | "whiteList";
  };
  fetch?: {
    page: number;
    type: "whiteList" | "banList";
    sort?: FetchWhiteBanListSortOptions;
    sortOrder?: "ASC" | "DESC";
    activeOnly?: boolean;
  };
  exportImport?: {
    type: "banList" | "whiteList";
  };
  perm?: {
    player: string;
    role: "admin" | "moderator" | "";
  };
  lobbyOptions?: {};
}

export type FetchWhiteBanListSortOptions =
  | "id"
  | "username"
  | "admin"
  | "region"
  | "reason";

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

export interface SettingsUpdate {
  autoHost?: { [key in keyof AppSettings["autoHost"]]: any };
  obs?: { [key in keyof AppSettings["obs"]]: any };
  discord?: { [key in keyof AppSettings["discord"]]: any };
  elo?: { [key in keyof AppSettings["elo"]]: any };
  client?: { [key in keyof AppSettings["client"]]: any };
  streaming?: { [key in keyof AppSettings["streaming"]]: any };
}

export interface GameStateUpdate {
  key: keyof GameState;
  value: string | boolean;
}

export interface HubReceive {
  data: {
    lobbyUpdates?: LobbyUpdates;
    settings?: AppSettings;
    gameState?: GameState;
    settingsUpdate?: SettingsUpdate;
    gameStateUpdate?: GameStateUpdate;
    heartbeat?: true;
  };
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
  menuState:
    | "OUT_OF_MENUS"
    | "MAIN_MENU"
    | "CUSTOM_LOBBIES"
    | "GAME_LOBBY"
    | "LOADING_SCREEN"
    | "SCORE_SCREEN"
    | "LOGIN_DOORS"
    | "CUSTOM_GAME_LOBBY"
    | "null";
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
