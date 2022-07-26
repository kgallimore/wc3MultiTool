import { Global } from "../globalBase";

import Store from "electron-store";

import type { PickByValue } from "./../utility";
import type { ObsHotkeys } from "./../modules/obs";

const store = new Store();

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
  releaseChannel: "latest" | "beta" | "alpha";
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
  regionChangeType: "off" | "realm" | "openVPN" | "both";
  regionChangeTimeEU: string;
  regionChangeOpenVPNConfigEU: string;
  regionChangeTimeNA: string;
  regionChangeOpenVPNConfigNA: string;
  shufflePlayers: boolean;
  whitelist: boolean;
  minPlayers: number;
  delayStart: number;
  openVPNPath: string;
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

export interface DiscordSettings {
  enabled: boolean;
  token: string;
  announceChannel: string;
  chatChannel: string;
  adminChannel: string;
  logLevel: "error" | "warn" | "off";
  bidirectionalChat: boolean;
  sendInGameChat: boolean;
}
export interface EloSettings {
  type: "off" | "wc3stats" | "pyroTD" | "mariadb" | "mysql" | "sqlite" | "random";
  dbIP: string;
  dbPort: number;
  dbUser: string;
  dbPassword: string;
  dbName: string;
  dbTableName: string;
  dbSecondaryTable: string;
  dbPrimaryTableKey: string;
  dbSecondaryTableKey: string;
  dbUserColumn: string;
  dbELOColumn: string;
  dbPlayedColumn: string;
  dbWonColumn: string;
  dbRankColumn: string;
  dbLastChangeColumn: string;
  dbDefaultElo: number;
  sqlitePath: string;
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
export type SettingsKeys =
  | keyof ObsSettings
  | keyof AutoHostSettings
  | keyof EloSettings
  | keyof DiscordSettings
  | keyof ClientSettings
  | keyof StreamingSettings;

export interface SettingsUpdates {
  autoHost?: Partial<AutoHostSettings>;
  obs?: Partial<ObsSettings>;
  discord?: Partial<DiscordSettings>;
  elo?: Partial<EloSettings>;
  client?: Partial<ClientSettings>;
  streaming?: Partial<StreamingSettings>;
}

export interface UpdateSetting {
  settingName: keyof AppSettings;
  key: SettingsKeys;
  value: any;
}
class AppSettingsContainer extends Global {
  // TODO Get that returns settings with sensitive fields removed
  private _values: AppSettings;

  constructor() {
    super("Settings");
    this._values = <AppSettings>{
      autoHost: {
        type: store.get("autoHost.type") ?? "off",
        private: store.get("autoHost.private") ?? false,
        sounds: store.get("autoHost.sounds") ?? false,
        increment: store.get("autoHost.increment") ?? true,
        mapName: store.get("autoHost.mapName") ?? "",
        gameName: store.get("autoHost.gameName") ?? "",
        mapPath: store.get("autoHost.mapPath") ?? "N/A",
        announceIsBot: store.get("autoHost.announceIsBot") ?? false,
        announceCustom: store.get("autoHost.announceCustom") ?? false,
        announceRestingInterval: store.get("autoHost.announceRestingInterval") ?? 30,
        moveToSpec: store.get("autoHost.moveToSpec") ?? false,
        moveToTeam: store.get("autoHost.moveToTeam") ?? "",
        rapidHostTimer: store.get("autoHost.rapidHostTimer") ?? 0,
        smartHostTimeout: store.get("autoHost.smartHostTimeout") ?? 0,
        voteStart: store.get("autoHost.voteStart") ?? false,
        voteStartPercent: store.get("autoHost.voteStartPercent") ?? 60,
        voteStartTeamFill: store.get("autoHost.voteStartTeamFill") ?? true,
        closeSlots: store.get("autoHost.closeSlots") ?? [],
        customAnnouncement: store.get("autoHost.customAnnouncement") ?? "",
        observers:
          typeof store.get("autoHost.observers") !== "string"
            ? "0"
            : store.get("autoHost.observers"),
        advancedMapOptions: store.get("autoHost.advancedMapOptions") ?? false,
        flagLockTeams: store.get("autoHost.flagLockTeams") ?? true,
        flagPlaceTeamsTogether: store.get("autoHost.flagPlaceTeamsTogether") ?? true,
        flagFullSharedUnitControl:
          store.get("autoHost.flagFullSharedUnitControl") ?? false,
        flagRandomRaces: store.get("autoHost.flagRandomRaces") ?? false,
        flagRandomHero: store.get("autoHost.flagRandomHero") ?? false,
        settingVisibility: store.get("autoHost.settingVisibility") ?? "0",
        leaveAlternate: store.get("autoHost.leaveAlternate") ?? false,
        shufflePlayers: store.get("autoHost.shufflePlayers") ?? false,
        regionChangeType: store.get("autoHost.regionChangeType") ?? "off",
        regionChangeTimeEU: store.get("autoHost.regionChangeTimeEU") ?? "11:00",
        regionChangeOpenVPNConfigEU:
          store.get("autoHost.regionChangeOpenVPNConfigEU") ?? "",
        regionChangeTimeNA: store.get("autoHost.regionChangeTimeNA") ?? "01:00",
        regionChangeOpenVPNConfigNA:
          store.get("autoHost.regionChangeOpenVPNConfigNA") ?? "",
        whitelist: store.get("autoHost.whitelist") ?? false,
        minPlayers: store.get("autoHost.minPlayers") ?? 0,
        delayStart: store.get("autoHost.delayStart") ?? 0,
        openVPNPath: store.get("autoHost.openVPNPath") ?? "",
      },
      obs: {
        enabled: store.get("obs.enabled") ?? false,
        sceneSwitchType: store.get("obs.sceneSwitchType") ?? "off",
        inGameHotkey: store.get("obs.inGameHotkey") ?? false,
        outOfGameHotkey: store.get("obs.outOfGameHotkey") ?? false,
        inGameWSScene: store.get("obs.inGameWSScene") ?? "",
        outOfGameWSScene: store.get("obs.outOfGameWSScene") ?? "",
        address: store.get("obs.obsAddress") ?? "",
        token: store.get("obs.obsPassword") ?? "",
        autoStream: store.get("obs.autoStream") ?? false,
        textSource: store.get("obs.textSource") ?? false,
      },
      elo: {
        type: store.get("elo.type") ?? "off",
        dbIP: store.get("elo.dbIP") ?? "127.0.0.1",
        dbPort: store.get("elo.dbPort") ?? 3306,
        dbUser: store.get("elo.dbUser") ?? "",
        dbPassword: store.get("elo.dbPassword") ?? "",
        dbName: store.get("elo.dbName") ?? "",
        dbTableName: store.get("elo.dbTableName") ?? "",
        dbSecondaryTable: store.get("elo.dbSecondaryTable") ?? "",
        dbPrimaryTableKey: store.get("elo.dbPrimaryTableKey") ?? "",
        dbSecondaryTableKey: store.get("elo.dbSecondaryTableKey") ?? "",
        dbUserColumn: store.get("elo.dbUserColumn") ?? "player",
        dbELOColumn: store.get("elo.dbELOColumn") ?? "rating",
        dbPlayedColumn: store.get("elo.dbPlayedColumn") ?? "played",
        dbWonColumn: store.get("elo.dbWonColumn") ?? "wins",
        dbRankColumn: store.get("elo.dbRankColumn") ?? "rank",
        dbLastChangeColumn: store.get("elo.dbLastChangeColumn") ?? "",
        dbDefaultElo: store.get("elo.dbDefaultElo") ?? 500,
        sqlitePath: store.get("elo.sqlitePath") ?? "",
        balanceTeams: store.get("elo.balanceTeams") ?? true,
        announce: store.get("elo.announce") ?? true,
        excludeHostFromSwap: store.get("elo.excludeHostFromSwap") ?? true,
        lookupName: store.get("elo.lookupName") ?? "",
        privateKey: store.get("elo.privateKey") ?? "",
        available: store.get("elo.available") ?? false,
        wc3StatsVariant:
          store.get("elo.wc3StatsVariant") ?? store.get("elo.wc3statsVariant") ?? "",
        handleReplays: store.get("elo.handleReplays") ?? true,
        requireStats: store.get("elo.requireStats") ?? false,
        minGames: store.get("elo.minGames") ?? 0,
        minWins: store.get("elo.minWins") ?? 0,
        minRank: store.get("elo.minRank") ?? 0,
        minRating: store.get("elo.minRating") ?? 0,
      },
      discord: {
        enabled: store.get("discord.enabled") ?? false,
        token: store.get("discord.token") ?? "",
        announceChannel: store.get("discord.announceChannel") ?? "",
        chatChannel: store.get("discord.chatChannel") ?? "",
        bidirectionalChat: store.get("discord.bidirectionalChat") ?? false,
        sendInGameChat: store.get("discord.sendInGameChat") ?? false,
        adminChannel: store.get("discord.adminChannel") ?? "",
        logLevel: store.get("discord.logLevel") ?? "error",
      },
      client: {
        restartOnUpdate: store.get("client.restartOnUpdate") ?? false,
        checkForUpdates: store.get("client.checkForUpdates") ?? true,
        performanceMode: store.get("client.performanceMode") ?? false,
        openWarcraftOnStart: store.get("client.openWarcraftOnStart") ?? false,
        startOnLogin: store.get("client.startOnLogin") ?? false,
        commAddress: store.get("client.commAddress") ?? "",
        language: store.get("client.language") ?? "en",
        translateToLobby: store.get("client.translateToLobby") ?? false,
        antiCrash: store.get("client.antiCrash") ?? true,
        alternateLaunch: store.get("client.alternateLaunch") ?? false,
        bnetUsername: store.get("client.bnetUsername") ?? "",
        bnetPassword: store.get("client.bnetPassword") ?? "",
        releaseChannel: store.get("client.releaseChannel") ?? "latest",
      },
      streaming: {
        enabled: store.get("streaming.enabled") ?? false,
        seToken: store.get("streaming.seToken") ?? "",
        sendTipsInGame: store.get("streaming.sendTipsInGame") ?? false,
        minInGameTip: store.get("streaming.minInGameTip") ?? 1,
        sendTipsInDiscord: store.get("streaming.sendTipsInDiscord") ?? false,
        sendTipsInLobby: store.get("streaming.sendTipsInLobby") ?? false,
      },
    };
  }

  get values(): AppSettings {
    return this._values;
  }

  set values(value: AppSettings) {
    throw new Error("Can not set values directly. Use updateSettings.");
  }

  updateSettings(updates: SettingsUpdates) {
    let filteredUpdates: SettingsUpdates = {};
    (
      Object.entries(updates) as {
        [K in keyof AppSettings]: [
          keyof PickByValue<AppSettings, AppSettings[K]>,
          AppSettings[K]
        ];
      }[keyof AppSettings][]
    ).forEach(([settingName, entries]) => {
      const targetSetting = this._values[settingName];
      if (targetSetting === undefined) {
        this.warn("Setting " + settingName + " is not a valid key.");
        return;
      }
      Object.entries(entries).forEach(([key, value]) => {
        // @ts-expect-error Still need to figure out how to type this
        let targetCurrentValue = this._values[settingName]?.[key];
        if (
          targetCurrentValue !== undefined &&
          (typeof targetCurrentValue === typeof value ||
            ((key === "inGameHotkey" || key === "outOfGameHotkey") &&
              (typeof value === "boolean" || typeof value === "object"))) &&
          targetCurrentValue !== value
        ) {
          // @ts-expect-error
          this._values[settingName][key] = value;
          // TODO Make this not update the whole settingName section
          store.set(settingName + "." + key, value);
          this.info(
            settingName + " settings changed: " + key,
            key.toLowerCase().includes("token") || key.toLowerCase().includes("password")
              ? "*HIDDEN*"
              : value
          );
          if (!filteredUpdates[settingName]) {
            filteredUpdates[settingName] = {};
          }
          // @ts-expect-error Still need to figure out how to type this
          filteredUpdates[settingName][key] = value;
        } else if (targetCurrentValue !== value) {
          this.warn(
            "Invalid update:",
            settingName,
            key,
            key.toLowerCase().includes("token") || key.toLowerCase().includes("password")
              ? "*HIDDEN*"
              : value
          );
          return false;
        }
      });
    });
    if (Object.keys(filteredUpdates).length > 0) {
      this.emit("settingsUpdates", filteredUpdates);
      return true;
    }
    return false;
  }
}

export const settings = new AppSettingsContainer();
