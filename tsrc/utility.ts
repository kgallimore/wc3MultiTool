export interface AppSettings {
  autoHost: AutoHostSettings;
  obs: ObsSettings;
  discord: DiscordSettings;
  elo: EloSettings;
  client: ClientSettings;
}

export interface ClientSettings {
  restartOnUpdate: boolean;
  checkForUpdates: boolean;
  performanceMode: boolean;
  openWarcraftOnStart: boolean;
  startOnLogin: boolean;
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
  regionChange: boolean;
  regionChangeTimeEU: string;
  regionChangeTimeNA: string;
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
  | keyof DiscordSettings
  | keyof ClientSettings;
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
  handleReplays: boolean;
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
    | "updater";
  data: {
    update?: { setting: keyof AppSettings; key: SettingsKeys; value: any };
    settings?: AppSettings;
    connected?: boolean;
    progress?: { step: string; progress: number };
    error?: string;
    value?: string;
    lobbyData?: LobbyUpdates;
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

export type TeamTypes = "otherTeams" | "specTeams" | "playerTeams";
export interface TeamData {
  data: { [key: string]: number };
  lookup: { [key: number]: string };
}

export interface PlayerData {
  slot: number;
  played: number;
  wins: number;
  losses: number;
  rating: number;
  lastChange: number;
  rank: number;
}
export interface PlayerPayload {
  // 0 = open, 1 = closed, 2 = filled
  slotStatus: 0 | 1 | 2;
  slot:
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
  team: number;
  //What are slot types?
  // 0 = useable, 1 = managed?
  slotType: number | 0 | 1;
  isObserver: boolean;
  isSelf: boolean;
  slotTypeChangeEnabled: boolean;
  // always 255?
  id: number;
  name: string | "Computer (Easy)" | "Computer (Normal)" | "Computer (Insane)";
  //Regions tbd, usw might replace us
  playerRegion: Regions | "usw" | "";
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
export type Regions = "us" | "eu";
export interface GameClientLobbyPayloadStatic {
  isHost: boolean;
  playerHost: string;
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
}
export interface GameClientLobbyPayload extends GameClientLobbyPayloadStatic {
  teamData: {
    teams: Array<{ name: string; team: number; filledSlots: number; totalSlots: number }>;
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

export interface LobbyUpdates {
  lobbyReady?: true;
  leftLobby?: true;
  newLobby?: MicroLobbyData;
  slotOpened?: number;
  slotClosed?: number;
  stale?: true;
  playerMoved?: { from: number; to: number };
  playerLeft?: string;
  playerJoined?: PlayerPayload;
  playerPayload?: Array<PlayerPayload>;
  playerData?: { name: string; data: PlayerData };
  chatMessage?: { name: string; message: string };
}

export interface PlayerTeamsData {
  [key: string]: Array<
    {
      name: string;
      slotStatus: 0 | 1 | 2;
      slot: number;
      realPlayer: boolean;
    } & PlayerData
  >;
}

export interface ChatMessage {
  name: string;
  message: string;
  time: number;
}
export interface MicroLobbyData {
  lookupName: string;
  wc3StatsVariant: string;
  eloAvailable: boolean;
  eloType: "wc3stats" | "pyroTD" | "off";
  region: Regions;
  slots: { [key: string]: PlayerPayload };
  lobbyStatic: GameClientLobbyPayloadStatic;
  playerData: {
    [key: string]: PlayerData;
  };
  teamList: { otherTeams: TeamData; specTeams: TeamData; playerTeams: TeamData };
  chatMessages: Array<ChatMessage>;
}

export interface HubReceive {
  messageType: "lobbyUpdate" | "lobbyStarted" | "heartbeat";
  data: LobbyUpdates | null;
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
  eloType: "wc3stats" | "pyroTD" | "off";
  closeSlots: Array<number>;
  mapPath: string;
}

export interface OpenLobbyParams {
  lobbyName?: string;
  gameId?: string;
  mapFile?: string;
  region?: Regions;
}

export function InvalidData(
  name: string,
  data: any,
  type: ValidObjectTypes,
  objectKeys: ObjectLookup = {}
): false | string {
  if (typeof data !== type) {
    return (
      "Type mismatch for " +
      name +
      ": " +
      type +
      " expected, " +
      typeof data +
      " received"
    );
  } else if (type === "object") {
    for (const [key, value] of Object.entries(objectKeys)) {
      if (Array.isArray(value)) {
        if (!value.includes(data[key])) {
          console.log(data);
          return (
            "Value for " +
            name +
            "  not expected. Expected: " +
            value.join(",") +
            ", received: " +
            data[key]
          );
        }
      } else if (typeof value === "object") {
        let check = InvalidData(
          key,
          data[key],
          "object",
          objectKeys[key] as ObjectLookup
        );
        if (check) {
          return check;
        }
      } else {
        let check = InvalidData(key, data[key], value as ValidObjectTypes);
        if (check) {
          return check;
        }
      }
    }
  }
  return false;
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
