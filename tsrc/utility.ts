import type { Regions, MicroLobbyData } from "wc3mt-lobby-container";
import type { LobbyUpdatesExtended } from "./modules/lobbyControl";
import type { AppSettings, SettingsKeys } from "./globals/settings";

import type { GameState } from "./globals/gameState";
import type { ClientState } from "./globals/clientState";
import type { SettingsUpdates } from "./globals/settings";

import type { FetchListOptions } from "./modules/administration";
import type { BanList, WhiteList } from "@prisma/client";

export interface WindowReceive {
  globalUpdate?: {
    clientState?: Partial<ClientState>;
    gameState?: Partial<GameState>;
    settings?: SettingsUpdates;
  };
  init?: {
    clientState: ClientState;
    gameState: GameState;
    settings: AppSettings;
  };
  legacy?: {
    messageType:
      | "statusChange"
      | "lobbyUpdate"
      | "menusChange"
      | "error"
      | "gotMapPath"
      | "updater"
      | "action"
      | "fetchedWhiteBanList";
    data: {
      error?: string;
      value?: string;
      lobbyData?: LobbyUpdatesExtended;
      fetched?: {
        type: "banList" | "whiteList";
        page: number;
        list?: BanList[] | WhiteList[] | undefined;
      };
    };
  };
}

export interface BanWhiteSingle {
  id: number;
  username: string;
  admin: string;
  region: Regions;
  reason: string;
  add_date: string;
  removal_date: string;
}

export type BanWhiteList = BanList[] | WhiteList[] | undefined;

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
    | "getOpenVPNPath"
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
    | "exit"
    | "minimize"
    | "importWhitesBans";
  update?: SettingsUpdates;
  addWhiteBan?: {
    type: "banList" | "whiteList";
    player: string;
    reason?: string;
  };
  removeWhiteBan?: {
    player: string;
    type: "banList" | "whiteList";
  };
  fetch?: FetchListOptions;
  exportImport?: {
    type: "banList" | "whiteList";
  };
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

export interface HubReceive {
  data: {
    lobbyUpdates?: LobbyUpdatesExtended;
    settings?: AppSettings;
    gameState?: GameState;
    settingsUpdates?: SettingsUpdates;
    gameStateUpdates?: Partial<GameState>;
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
      lobbyUpdate?: LobbyUpdatesExtended;
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

export type PickByValue<T, V> = Pick<
  T,
  { [K in keyof T]: T[K] extends V ? K : never }[keyof T]
>;

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
    //console.log("US later", currentTime, targetTimes);
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

export function isInt(
  string: string,
  max: number | false = false,
  min: number | false = false
): boolean {
  var isInt = /^-?\d+$/.test(string);
  if (isInt) {
    let intTest = parseInt(string);
    if (max !== false && min !== false) {
      return intTest <= max && intTest >= min;
    } else if (max !== false) {
      return intTest <= max;
    } else if (min !== false) {
      return intTest >= min;
    }
  }
  return isInt;
}
