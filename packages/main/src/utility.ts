import type {Regions, MicroLobbyData} from 'wc3mt-lobby-container';
import type {LobbyUpdatesExtended} from './modules/lobbyControl';
import type {AppSettings, SettingsKeys} from './globals/settings';

import type {GameState} from './globals/gameState';
import type {ClientState} from './globals/clientState';
import type {SettingsUpdates} from './globals/settings';

import type {FetchListOptions} from './modules/administration';
import type { banList, whiteList } from './schema';
import type { InferSelectModel } from 'drizzle-orm';

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
    appVersion: string;
  };
  legacy?: {
    messageType:
      | 'statusChange'
      | 'lobbyUpdate'
      | 'menusChange'
      | 'error'
      | 'gotMapPath'
      | 'updater'
      | 'action'
      | 'fetchedWhiteBanList';
    data: {
      error?: string;
      value?: string;
      lobbyData?: LobbyUpdatesExtended;
      fetched?: {
        type: 'banList' | 'whiteList';
        page: number;
        list?: InferSelectModel<typeof banList>[] | InferSelectModel<typeof whiteList>[] | undefined;
      };
    };
  };
}

export type BanWhiteList = InferSelectModel<typeof banList>[] | InferSelectModel<typeof whiteList>[] | undefined;

export interface ClientCommands {
  action:
    | 'openLogs'
    | 'openWar'
    | 'closeWar'
    | 'updateSettingSingle'
    | 'init'
    | 'banPlayer'
    | 'unbanPlayer'
    | 'whitePlayer'
    | 'unwhitePlayer'
    | 'changePerm';
  data?: {
    settings?: {setting: keyof AppSettings; key: SettingsKeys; value: unknown};
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
      role: 'admin' | 'moderator' | '';
    };
  };
}

export interface WindowSend {
  messageType:
    | 'openLogs'
    | 'openWar'
    | 'getMapPath'
    | 'getOpenVPNPath'
    | 'updateSettingSingle'
    | 'init'
    | 'addWhiteBan'
    | 'removeWhiteBan'
    | 'changePerm'
    | 'fetchWhiteBanList'
    | 'createLobby'
    | 'autoHostLobby'
    | 'joinLobby'
    | 'leaveLobby'
    | 'startLobby'
    | 'exportWhitesBans'
    | 'exit'
    | 'minimize'
    | 'importWhitesBans';
  update?: SettingsUpdates;
  addWhiteBan?: {
    type: 'banList' | 'whiteList';
    player: string;
    reason?: string;
  };
  removeWhiteBan?: {
    player: string;
    type: 'banList' | 'whiteList';
  };
  fetch?: FetchListOptions;
  exportImport?: {
    type: 'banList' | 'whiteList';
  };
  perm?: {
    player: string;
    role: 'admin' | 'moderator' | '';
  };
  lobbyOptions?: object;
}

export interface TeamData {
  data: {[key: string]: number};
  lookup: {[key: number]: string};
}
export interface GameClientMessage {
  messageType: 'ScreenTransitionInfo' | 'SetGlueScreen';
  payload: {
    screen?: string;
  };
  message?: {source: string; sender: string; content: string};
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
    | 'newLobby'
    | 'lobbyUpdate'
    | 'lobbyClosed'
    | 'clientSizeChange'
    | 'userJoinedLobby'
    | 'userLeftLobby';
  data: {
    newData?: MicroLobbyData;
    change?: {
      lobby: {region: Regions; name: string};
      lobbyUpdate?: LobbyUpdatesExtended;
    };
    userLobby?: {userName: string; lobbyName: string; region: Regions};
    clientSize?: number;
  };
}

export function DeColorName(name: string): string {
  return name.replace(/(\|c[0-9a-f]{8})|(\|r)/gi, '');
}

export interface LobbyAppSettings {
  balanceTeams: boolean;
  wc3StatsVariant: string;
  excludeHostFromSwap: boolean;
  moveToSpec: boolean;
  moveToTeam: string;
  eloType: 'wc3stats' | 'pyroTD' | 'off';
  closeSlots: Array<number>;
  mapPath: string;
  requireStats: boolean;
  minRank: number;
  minGames: number;
  minWins: number;
  minRating: number;
}

export type PickByValue<T, V> = Pick<T, {[K in keyof T]: T[K] extends V ? K : never}[keyof T]>;

export function getTargetRegion(
  regionChangeTimeEU: string,
  regionChangeTimeNA: string,
): 'us' | 'eu' {
  const currentTime = new Date().getUTCHours() * 100 + new Date().getUTCMinutes();
  const targetTimes = {
    eu: parseInt(regionChangeTimeEU.replace(':', '')),
    us: parseInt(regionChangeTimeNA.replace(':', '')),
  };
  if (targetTimes.us > targetTimes.eu) {
    //console.log("US later", currentTime, targetTimes);
    if (currentTime > targetTimes.eu && currentTime < targetTimes.us) {
      return 'eu';
    } else {
      return 'us';
    }
  } else {
    if (currentTime > targetTimes.us && currentTime < targetTimes.eu) {
      return 'us';
    } else {
      return 'eu';
    }
  }
}

export const ColorLookup = {
  hex: [
    '00FF0303',
    '000042FF',
    '001CE6B9',
    '00540081',
    '00FFFC01',
    '00fEBA0E',
    '0020C000',
    '00E55BB0',
    '00959697',
    '007EBFF1',
    '00106246',
    '004E2A04',
    'ff9c0000',
    'ff0000c3',
    'ff00ebff',
    'ffbd00ff',
    'ffecce87',
    'fff7a58b',
    'ffbfff81',
    'ffdbb8eb',
    'ff4f5055',
    'ffecf0ff',
    'ff00781e',
    'ffa56f34',
  ],
  discord: [],
};

export function ensureInt(value: string | number) {
  if (typeof value === 'string') {
    return parseInt(value);
  } else {
    return value;
  }
}

export function isValidUrl(target: string) {
  try {
    const _ = new URL(target);
  } catch (_) {
    return false;
  }

  return true;
}

export function isInt(
  string: string,
  max: number | false = false,
  min: number | false = false,
): boolean {
  const isInt = /^-?\d+$/.test(string);
  if (isInt) {
    const intTest = parseInt(string);
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

export type AdminRoles = 'baswapper' | 'swapper' | 'moderator' | 'admin';
export type AdminCommands =
  | 'st'
  | 'sp'
  | 'start'
  | 'closeall'
  | 'a'
  | 'closeall'
  | 'hold'
  | 'mute'
  | 'unmute'
  | 'swap'
  | 'handi'
  | 'close'
  | 'open'
  | 'openall'
  | 'kick'
  | 'ban'
  | 'unban'
  | 'white'
  | 'unwhite'
  | 'perm'
  | 'unperm'
  | 'autohost'
  | 'autostart'
  | 'balance'
  | 'help';

  export type AllCommands = AdminCommands | 'help';
  export type AllRoles = AdminRoles | null;

export const commands: Record<
AllCommands,
  {
    minPermissions: AllRoles;
    requiresHost: boolean;
    requiresLobby: boolean;
    description: string;
    arguments?: string;
  }
> = {
  sp: {
    minPermissions: 'moderator',
    requiresHost: true,
    requiresLobby: true,
    description: 'Shuffles players including within teams',
  },
  st: {
    minPermissions: 'moderator',
    requiresHost: true,
    requiresLobby: true,
    description: 'Shuffles players between teams',
  },
  start: {
    minPermissions: 'moderator',
    requiresHost: true,
    requiresLobby: true,
    description: 'Starts the game',
  },
  close: {
    minPermissions: 'moderator',
    requiresHost: true,
    requiresLobby: true,
    description: 'Closes a slot/player',
    arguments: '(name|slotNumber)',
  },
  closeall: {
    minPermissions: 'moderator',
    requiresHost: true,
    requiresLobby: true,
    description: 'Close all slots',
  },
  a: {
    minPermissions: 'moderator',
    requiresHost: true,
    requiresLobby: true,
    description: 'Aborts the start countdown',
  },
  hold: {
    minPermissions: 'moderator',
    requiresHost: true,
    requiresLobby: true,
    description: 'Holds a slot for a player',
    arguments: '(name)',
  },
  mute: {
    minPermissions: 'moderator',
    requiresHost: false,
    requiresLobby: true,
    description: 'Mutes a player',
    arguments: '(name|slotNumber)',
  },
  unmute: {
    minPermissions: 'moderator',
    requiresHost: false,
    requiresLobby: true,
    description: 'Unmutes a player',
    arguments: '(name|slotNumber)',
  },
  open: {
    minPermissions: 'moderator',
    requiresHost: true,
    requiresLobby: true,
    description: 'Opens a slot',
    arguments: '(slotNumber)',
  },
  openall: {
    minPermissions: 'moderator',
    requiresHost: true,
    requiresLobby: true,
    description: 'Opens all slots',
  },
  handi: {
    minPermissions: 'moderator',
    requiresHost: true,
    requiresLobby: true,
    description: 'Sets a handicap for a slot',
    arguments: '(name|slotNumber) (50|60|70|80|100)',
  },
  kick: {
    minPermissions: 'moderator',
    requiresHost: true,
    requiresLobby: true,
    description: 'Kicks a player',
    arguments: '(name|slotNumber) (?reason)',
  },
  ban: {
    minPermissions: 'moderator',
    requiresHost: false,
    requiresLobby: false,
    description: 'Bans a player',
    arguments: '(name|slotNumber) (?reason)',
  },
  unban: {
    minPermissions: 'moderator',
    requiresHost: false,
    requiresLobby: false,
    description: 'Unbans a player',
    arguments: '(name)',
  },
  white: {
    minPermissions: 'moderator',
    requiresHost: false,
    requiresLobby: false,
    description: 'Whitelists a player',
    arguments: '(name) (?reason)',
  },
  unwhite: {
    minPermissions: 'moderator',
    requiresHost: false,
    requiresLobby: false,
    description: 'Unwhitelists a player',
    arguments: '(name)',
  },
  perm: {
    minPermissions: 'admin',
    requiresHost: false,
    requiresLobby: false,
    description: 'Gives a player privileged permissions',
    arguments: '(name) (?role=moderator)',
  },
  unperm: {
    minPermissions: 'admin',
    requiresHost: false,
    requiresLobby: false,
    description: 'Removes privileged permissions from a player',
    arguments: '(name)',
  },
  autohost: {
    minPermissions: 'admin',
    requiresHost: false,
    requiresLobby: false,
    description: 'Gets or sets autohost type',
    arguments: '(?off|rapid|lobby|smart)',
  },
  autostart: {
    minPermissions: 'admin',
    requiresHost: false,
    requiresLobby: false,
    description: 'Gets or sets autostart amount',
    arguments: '(number)',
  },
  balance: {
    minPermissions: 'moderator',
    requiresHost: false,
    requiresLobby: true,
    description: 'Balances current lobby',
  },
  swap: {
    minPermissions: 'swapper',
    requiresHost: true,
    requiresLobby: true,
    description: 'Swaps two players',
    arguments: '(name|slotNumber) (name|slotNumber)',
  },
  help: {
    minPermissions: null,
    requiresHost: false,
    requiresLobby: false,
    description: 'Gets a list of all of your available commands',
  },
};
export const commandArray = Object.entries(commands);

export const hierarchy: {[key: string]: number} = {
  admin: 4,
  moderator: 3,
  swapper: 2,
  baswapper: 1,
};
