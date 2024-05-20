import {Global} from '../globalBase';
import type {Entries} from 'type-fest';


import Store from 'electron-store';

import type {ObsHotkeys} from './../modules/obs';
import {drizzleClient} from '../drizzle';
import {settings as settingsTable} from '../schema';
import {eq, and} from 'drizzle-orm';
import { migrateDB } from './../migrate';


const store = new Store();

export interface AppSettings {
  autoHost: AutoHostSettings;
  obs: ObsSettings;
  discord: DiscordSettings;
  elo: EloSettings;
  client: ClientSettings;
  streaming: StreamingSettings;
}

export type AppSettingsTypes = Record<
  SettingsKeys,
  'boolean' | 'integer' | 'string'
>;
type AllowedSettingsTypes = 'boolean' | 'number' | 'bigint' | 'string' | 'array' | 'object';
type AllowedSettingsTypesTypes = boolean | bigint | number | string | object;
interface AppSettingsDataPoint {
  allowedTypes: Array<AllowedSettingsTypes>;
  allowedValues?: Array<string | number | boolean | object>;
  defaultValue: string | boolean | number | [];
  sensitive?: boolean;
  value?: AllowedSettingsTypesTypes;
}

interface AppSettingsDataStructure {
  autoHost: Record<keyof AutoHostSettings, AppSettingsDataPoint>;
  obs: Record<keyof ObsSettings, AppSettingsDataPoint>;
  discord: Record<keyof DiscordSettings, AppSettingsDataPoint>;
  elo: Record<keyof EloSettings, AppSettingsDataPoint>;
  client: Record<keyof ClientSettings, AppSettingsDataPoint>;
  streaming: Record<keyof StreamingSettings, AppSettingsDataPoint>;
}

type AppSettingsDataSubStructure = Record<
  SettingsKeys,
  AppSettingsDataPoint
>;

export const AppSettingsData: AppSettingsDataStructure = {
  autoHost: {
    type: {defaultValue: 'off', allowedTypes: ['string']},
    private: {defaultValue: false, allowedTypes: ['boolean']},
    sounds: {defaultValue: false, allowedTypes: ['boolean']},
    increment: {defaultValue: true, allowedTypes: ['boolean']},
    mapName: {defaultValue: '', allowedTypes: ['string']},
    gameName: {defaultValue: '', allowedTypes: ['string']},
    mapPath: {defaultValue: 'N/A', allowedTypes: ['string']},
    announceIsBot: {defaultValue: false, allowedTypes: ['boolean']},
    announceCustom: {defaultValue: false, allowedTypes: ['boolean']},
    announceRestingInterval: {defaultValue: 30, allowedTypes: ['number']},
    moveToSpec: {defaultValue: false, allowedTypes: ['boolean']},
    moveToTeam: {defaultValue: '', allowedTypes: ['string']},
    rapidHostTimer: {defaultValue: 0, allowedTypes: ['number']},
    smartHostTimeout: {defaultValue: 0, allowedTypes: ['number']},
    voteStart: {defaultValue: false, allowedTypes: ['boolean']},
    voteStartPercent: {defaultValue: 60, allowedTypes: ['number']},
    voteStartTeamFill: {defaultValue: true, allowedTypes: ['boolean']},
    closeSlots: {defaultValue: [], allowedTypes: ['array']},
    customAnnouncement: {defaultValue: '', allowedTypes: ['string']},
    observers: {defaultValue: '0', allowedTypes: ['string'], allowedValues: ['0', '1', '2', '3']},
    advancedMapOptions: {defaultValue: false, allowedTypes: ['boolean']},
    flagLockTeams: {defaultValue: true, allowedTypes: ['boolean']},
    flagPlaceTeamsTogether: {defaultValue: true, allowedTypes: ['boolean']},
    flagFullSharedUnitControl: {defaultValue: true, allowedTypes: ['boolean']},
    flagRandomRaces: {defaultValue: true, allowedTypes: ['boolean']},
    flagRandomHero: {defaultValue: true, allowedTypes: ['boolean']},
    settingVisibility: {
      defaultValue: '0',
      allowedTypes: ['string'],
      allowedValues: ['0', '1', '2', '3'],
    },
    leaveAlternate: {defaultValue: true, allowedTypes: ['boolean']},
    shufflePlayers: {defaultValue: true, allowedTypes: ['boolean']},
    regionChangeType: {
      defaultValue: 'off',
      allowedTypes: ['string'],
      allowedValues: ['off', 'realm', 'openVPN', 'both'],
    },
    regionChangeTimeEU: {defaultValue: '11:00', allowedTypes: ['string']},
    regionChangeOpenVPNConfigEU: {defaultValue: '', allowedTypes: ['string']},
    regionChangeTimeNA: {defaultValue: '01:00', allowedTypes: ['string']},
    regionChangeOpenVPNConfigNA: {defaultValue: '', allowedTypes: ['string']},
    whitelist: {defaultValue: false, allowedTypes: ['boolean']},
    minPlayers: {
      defaultValue: 0,
      allowedTypes: ['number'],
      allowedValues: [
        0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24,
      ],
    },
    delayStart: {defaultValue: 0, allowedTypes: ['number']},
    openVPNPath: {defaultValue: '', allowedTypes: ['string']},
  },
  obs: {
    enabled: {defaultValue: false, allowedTypes: ['boolean']},
    sceneSwitchType: {
      defaultValue: 'off',
      allowedTypes: ['string'],
      allowedValues: ['off', 'hotkeys', 'websockets'],
    },
    inGameHotkey: {defaultValue: false, allowedTypes: ['boolean', 'object']},
    outOfGameHotkey: {defaultValue: false, allowedTypes: ['boolean', 'object']},
    inGameWSScene: {defaultValue: '', allowedTypes: ['string']},
    outOfGameWSScene: {defaultValue: '', allowedTypes: ['string']},
    address: {defaultValue: '', allowedTypes: ['string']},
    _token: {defaultValue: '', allowedTypes: ['string'], sensitive: true},
    autoStream: {defaultValue: false, allowedTypes: ['boolean']},
    textSource: {defaultValue: false, allowedTypes: ['boolean']},
  },
  discord: {
    enabled: {defaultValue: false, allowedTypes: ['boolean']},
    _token: {defaultValue: '', allowedTypes: ['string'], sensitive: true},
    announceChannel: {defaultValue: '', allowedTypes: ['string']},
    chatChannel: {defaultValue: '', allowedTypes: ['string']},
    useThreads: {defaultValue: true, allowedTypes: ['boolean']},
    bidirectionalChat: {defaultValue: false, allowedTypes: ['boolean']},
    sendInGameChat: {defaultValue: false, allowedTypes: ['boolean']},
    adminChannel: {defaultValue: '', allowedTypes: ['string']},
    logLevel: {
      defaultValue: 'error',
      allowedTypes: ['string'],
      allowedValues: ['error', 'warn', 'off'],
    },
    adminRole: {defaultValue: 'wc3mt', allowedTypes: ['string']},
    customName: {defaultValue: '', allowedTypes: ['string']},
  },
  elo: {
    type: {
      defaultValue: 'off',
      allowedTypes: ['string'],
      allowedValues: ['off', 'wc3stats', 'pyroTD', 'mariadb', 'mysql', 'sqlite', 'random'],
    },
    dbIP: {defaultValue: '127.0.0.1', allowedTypes: ['string']},
    dbPort: {defaultValue: 3306, allowedTypes: ['number']},
    dbUser: {defaultValue: '', allowedTypes: ['string']},
    _dbPassword: {defaultValue: '', allowedTypes: ['string'], sensitive: true},
    dbName: {defaultValue: '', allowedTypes: ['string']},
    dbTableName: {defaultValue: '', allowedTypes: ['string']},
    dbSecondaryTable: {defaultValue: '', allowedTypes: ['string']},
    dbPrimaryTableKey: {defaultValue: '', allowedTypes: ['string']},
    dbSecondaryTableKey: {defaultValue: '', allowedTypes: ['string']},
    dbUserColumn: {defaultValue: 'player', allowedTypes: ['string']},
    dbELOColumn: {defaultValue: 'rating', allowedTypes: ['string']},
    dbPlayedColumn: {defaultValue: 'played', allowedTypes: ['string']},
    dbWonColumn: {defaultValue: 'wins', allowedTypes: ['string']},
    dbRankColumn: {defaultValue: 'rank', allowedTypes: ['string']},
    dbLastChangeColumn: {defaultValue: '', allowedTypes: ['string']},
    dbSeasonColumn: {defaultValue: '', allowedTypes: ['string']},
    dbCurrentSeason: {defaultValue: '', allowedTypes: ['string']},
    dbDefaultElo: {defaultValue: 500, allowedTypes: ['number']},
    sqlitePath: {defaultValue: '', allowedTypes: ['string']},
    balanceTeams: {defaultValue: true, allowedTypes: ['boolean']},
    announce: {defaultValue: true, allowedTypes: ['boolean']},
    hideElo: {defaultValue: false, allowedTypes: ['boolean']},
    excludeHostFromSwap: {defaultValue: true, allowedTypes: ['boolean']},
    lookupName: {defaultValue: '', allowedTypes: ['string']},
    _privateKey: {defaultValue: '', allowedTypes: ['string'], sensitive: true},
    available: {defaultValue: false, allowedTypes: ['boolean']},
    wc3StatsVariant: {defaultValue: '', allowedTypes: ['string']},
    handleReplays: {defaultValue: true, allowedTypes: ['boolean']},
    requireStats: {defaultValue: false, allowedTypes: ['boolean']},
    minGames: {defaultValue: 0, allowedTypes: ['number']},
    minWins: {defaultValue: 0, allowedTypes: ['number']},
    minRank: {defaultValue: 0, allowedTypes: ['number']},
    minRating: {defaultValue: 0, allowedTypes: ['number']},
    eloMapNameLookupURL: {
      defaultValue: 'https://war.trenchguns.com/eloMapnameLookups.json',
      allowedTypes: ['string'],
    },
    latestUploadedReplay: {defaultValue: 0, allowedTypes: ['number']},
  },
  client: {
    tableVersion: {defaultValue: 0, allowedTypes: ['number']},
    warInstallLoc: {defaultValue: '', allowedTypes: ['string']},
    restartOnUpdate: {defaultValue: false, allowedTypes: ['boolean']},
    checkForUpdates: {defaultValue: true, allowedTypes: ['boolean']},
    performanceMode: {defaultValue: false, allowedTypes: ['boolean']},
    openWarcraftOnStart: {defaultValue: false, allowedTypes: ['boolean']},
    startOnLogin: {defaultValue: false, allowedTypes: ['boolean']},
    commAddress: {defaultValue: '', allowedTypes: ['string']},
    language: {defaultValue: 'en', allowedTypes: ['string']},
    translateToLobby: {defaultValue: false, allowedTypes: ['boolean']},
    antiCrash: {defaultValue: true, allowedTypes: ['boolean']},
    alternateLaunch: {defaultValue: false, allowedTypes: ['boolean']},
    bnetUsername: {defaultValue: '', allowedTypes: ['string']},
    _bnetPassword: {defaultValue: '', allowedTypes: ['string'], sensitive: true},
    releaseChannel: {
      defaultValue: 'latest',
      allowedTypes: ['string'],
      allowedValues: ['latest', 'beta', 'alpha'],
    },
    debugAssistance: {defaultValue: false, allowedTypes: ['boolean']},
  },
  streaming: {
    enabled: {defaultValue: false, allowedTypes: ['boolean']},
    _seToken: {defaultValue: '', allowedTypes: ['string'], sensitive: true},
    sendTipsInGame: {defaultValue: false, allowedTypes: ['boolean']},
    minInGameTip: {defaultValue: 1, allowedTypes: ['number']},
    sendTipsInDiscord: {defaultValue: false, allowedTypes: ['boolean']},
    sendTipsInLobby: {defaultValue: false, allowedTypes: ['boolean']},
  },
};

export const appSettingsTypes = <AppSettingsTypes>{};
export interface StreamingSettings {
  enabled: boolean;
  _seToken: string;
  sendTipsInGame: boolean;
  sendTipsInLobby: boolean;
  sendTipsInDiscord: boolean;
  minInGameTip: number;
}
export interface ClientSettings {
  tableVersion: number;
  warInstallLoc: string;
  restartOnUpdate: boolean;
  checkForUpdates: boolean;
  performanceMode: boolean;
  openWarcraftOnStart: boolean;
  startOnLogin: boolean;
  commAddress: string;
  language: 'en' | 'es' | 'fr' | 'de' | 'it' | 'ja' | 'ko' | 'pt' | 'ru' | 'zh';
  translateToLobby: boolean;
  antiCrash: boolean;
  alternateLaunch: boolean;
  bnetUsername: string;
  _bnetPassword: string;
  releaseChannel: 'latest' | 'beta' | 'alpha';
  debugAssistance: boolean;
}
export interface AutoHostSettings {
  type: 'off' | 'lobbyHost' | 'rapidHost' | 'smartHost';
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
  observers: '0' | '1' | '2' | '3';
  advancedMapOptions: boolean;
  flagLockTeams: boolean;
  flagPlaceTeamsTogether: boolean;
  flagFullSharedUnitControl: boolean;
  flagRandomRaces: boolean;
  flagRandomHero: boolean;
  settingVisibility: '0' | '1' | '2' | '3';
  leaveAlternate: boolean;
  regionChangeType: 'off' | 'realm' | 'openVPN' | 'both';
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
  sceneSwitchType: 'off' | 'hotkeys' | 'websockets';
  inGameHotkey: ObsHotkeys | false;
  outOfGameHotkey: ObsHotkeys | false;
  inGameWSScene: string;
  outOfGameWSScene: string;
  address: string;
  _token: string;
  autoStream: boolean;
  textSource: boolean;
}

export interface DiscordSettings {
  enabled: boolean;
  _token: string;
  announceChannel: string;
  chatChannel: string;
  useThreads: boolean;
  adminChannel: string;
  logLevel: 'error' | 'warn' | 'off';
  bidirectionalChat: boolean;
  sendInGameChat: boolean;
  adminRole: string;
  customName: string;
}
export interface EloSettings {
  type: 'off' | 'wc3stats' | 'pyroTD' | 'mariadb' | 'mysql' | 'sqlite' | 'random';
  dbIP: string;
  dbPort: number;
  dbUser: string;
  _dbPassword: string;
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
  dbSeasonColumn: string;
  dbCurrentSeason: string;
  dbDefaultElo: number;
  sqlitePath: string;
  balanceTeams: boolean;
  announce: boolean;
  hideElo: boolean;
  excludeHostFromSwap: boolean;
  lookupName: string;
  _privateKey: string;
  available: boolean;
  wc3StatsVariant: string;
  handleReplays: boolean;
  requireStats: boolean;
  minRank: number;
  minRating: number;
  minGames: number;
  minWins: number;
  eloMapNameLookupURL: string;
  latestUploadedReplay: number;
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
  value: unknown;
}
class AppSettingsContainer extends Global {
  // TODO Get that returns settings with sensitive fields removed
  private _values: AppSettingsDataStructure;

  constructor() {
    super('Settings');
    this._values = AppSettingsData;
    //We need to migrate the database before we can load the settings
    migrateDB();

    //Pre-populate settings from defaults
    const entries = Object.entries(AppSettingsData) as [
      keyof AppSettingsDataStructure,
      AppSettingsDataSubStructure,
    ][];
    // Load from electron store
    for (const [category, setting] of entries) {
      const objKeys = Object.keys(setting) as SettingsKeys[];
      for (let key of objKeys) {
        // Old stores did not have underscores in the sensitive keys
        key = key.replace('_', '') as SettingsKeys;
        const getValue = store.get(category + '.' + key);
        if (getValue !== undefined) {
          // @ts-expect-error We are ignoring this during swap-over
          this._values[category][key].value = getValue;
        }
      }
    }
    const dbSettings = drizzleClient.query.settings.findMany().sync() as {id: number, category: keyof AppSettingsDataStructure, key: SettingsKeys, value: string}[];
    const flattenedCurrentSettings = (Object.entries(this._values)as Entries<typeof this._values>).map(([category, settings]) => {
      return (Object.entries(settings) as Entries<typeof settings>).map(([key, value]) => {
        return {category, key, dataPoint: value};
      });
    }).flat();

    for(const dbSetting of dbSettings){
      // @ts-expect-error Not sure how to type this
      this._values[dbSetting.category][dbSetting.key].value = JSON.parse(dbSetting.value);
    }
    
    // Catch any missed settings updates during transition
    for(const currentSetting of flattenedCurrentSettings){
      const matchedSettings = dbSettings.filter(setting => setting.category === currentSetting.category && setting.key === currentSetting.key);
      let valueType = typeof (currentSetting.dataPoint.value ?? currentSetting.dataPoint.defaultValue) as AllowedSettingsTypes;
      if(valueType === 'object' && Array.isArray(currentSetting.dataPoint.value)) valueType = 'array';
      const updateValue = JSON.stringify(currentSetting.dataPoint.value ?? currentSetting.dataPoint.defaultValue);
      // eslint-disable-next-line drizzle/enforce-delete-with-where
      store.delete(currentSetting.category + '.' + currentSetting.key);
      if(matchedSettings.length === 0){
        try{
          drizzleClient.insert(settingsTable).values({category: currentSetting.category, key: currentSetting.key, value: updateValue, sensitive: currentSetting.dataPoint.sensitive ?? false}).run();
        }catch(e){
          console.error('Error inserting setting:', e);
        }
      }else if(matchedSettings[0].value !== currentSetting.dataPoint.value?.toString()){
        drizzleClient.update(settingsTable).set({value: updateValue}).where(eq(settingsTable.id, matchedSettings[0].id)).run();
      }
    }
  }

  private async setSetting<AppSettingsCategory extends keyof AppSettingsDataStructure>(
    category: AppSettingsCategory,
    key: keyof AppSettingsDataStructure[AppSettingsCategory],
    value: AllowedSettingsTypesTypes,
  ) {
    try {
      const stringValue = JSON.stringify(value);
      this.info('Updating setting: ' + category, key, stringValue);
      await drizzleClient
        .update(settingsTable)
        .set({value: stringValue})
        .where(and(eq(settingsTable.category, category), eq(settingsTable.key, key as string)));
      (this._values[category][key] as AppSettingsDataPoint).value = value;
    } catch (e) {
      this.error('Error updating setting: ' + category, key, value, e);
    }
  }

  private getSetting<AppSettingsCategory extends keyof AppSettingsDataStructure>(
    category: AppSettingsCategory,
    key: keyof AppSettingsDataStructure[AppSettingsCategory],
  ): AllowedSettingsTypesTypes | undefined {
    const targetKey = this._values[category]?.[key] as AppSettingsDataPoint | undefined;
    const value = targetKey?.value ?? targetKey?.defaultValue;
    if (value === undefined) return value;
    return targetKey?.value ?? targetKey?.defaultValue;
  }

  get values(): AppSettings {
    const fullCopy: AppSettings = {} as AppSettings;
    for (const [key, groups] of Object.entries(this._values) as [
      keyof AppSettings,
      Record<SettingsKeys, AppSettingsDataPoint>,
    ][]) {
      // @ts-expect-error Still need to figure out how to type this
      fullCopy[key] = {} as AppSettings[keyof AppSettings];
      for (const [settingKey, dataPoint] of Object.entries(groups) as [
        SettingsKeys,
        AppSettingsDataPoint,
      ][]) {
        const revealValue = (dataPoint.value != undefined
            ? dataPoint.value
            : dataPoint.defaultValue);
        // @ts-expect-error Still need to figure out how to type this
        fullCopy[key][settingKey] = revealValue;
      }
    }
    return fullCopy;
  }

  set values(value: AppSettings) {
    throw new Error('Can not set values directly. Use updateSettings.');
  }

  getCleanSetting(
    setting: keyof AppSettings,
  ):
    | DiscordSettings
    | ClientSettings
    | StreamingSettings
    | AutoHostSettings
    | ObsSettings
    | EloSettings {
    const fullCopy:
      | DiscordSettings
      | ClientSettings
      | StreamingSettings
      | AutoHostSettings
      | ObsSettings
      | EloSettings = {} as
      | DiscordSettings
      | ClientSettings
      | StreamingSettings
      | AutoHostSettings
      | ObsSettings
      | EloSettings;
    for (const [settingKey, dataPoint] of Object.entries(this._values[setting]) as [
      SettingsKeys,
      AppSettingsDataPoint,
    ][]) {
      const revealValue =
        dataPoint.sensitive || settingKey.startsWith('_')
          ? '*****'
          : dataPoint.value != undefined
          ? dataPoint.value
          : dataPoint.defaultValue;
      // @ts-expect-error Still need to figure out how to type this
      fullCopy[setting][settingKey] = revealValue;
    }
    return fullCopy;
  }

  getAllSettingsClean(): AppSettings {
    const fullCopy: AppSettings = {} as AppSettings;
    for (const [key, groups] of Object.entries(this._values) as [
      keyof AppSettings,
      Record<SettingsKeys, AppSettingsDataPoint>,
    ][]) {
      for (const [settingKey, dataPoint] of Object.entries(groups) as [
        SettingsKeys,
        AppSettingsDataPoint,
      ][]) {
        const revealValue =
          dataPoint.sensitive || settingKey.startsWith('_')
            ? '*****'
            : dataPoint.value != undefined
            ? dataPoint.value
            : dataPoint.defaultValue;
        // @ts-expect-error Still need to figure out how to type this
        fullCopy[key][settingKey] = revealValue;
      }
    }
    return fullCopy;
  }

  async updateSettings(updates: SettingsUpdates) {
    const filteredUpdates: SettingsUpdates = {};
    for (const [category, entries] of Object.entries(updates) as Entries<SettingsUpdates>) {
      if (this._values[category] === undefined || entries === undefined) {
        this.warn('Setting ' + category + ' is not a valid key.');
        return;
      }
      // eslint-disable-next-line prefer-const
      for(let [settingsKey, value] of Object.entries(entries) as [SettingsKeys, AllowedSettingsTypesTypes][]) {
        //@ts-expect-error Still need to figure out how to type this
        const targetCurrentValue = this.settingsHelper(category,settingsKey);
        if (targetCurrentValue === undefined) {
          this._generateError('Target key does not exist.', category, settingsKey, value);
          return false;
        }
        if(value === undefined) value = targetCurrentValue.defaultValue;
        if (targetCurrentValue.value === value) {
          this._generateError('Target key is already value.', category, settingsKey, value);
          return false;
        }
        let valueUpdateType = typeof value as AllowedSettingsTypes;
        if(valueUpdateType === 'object' && Array.isArray(value) && value !== null) valueUpdateType = 'array';
        if (!targetCurrentValue.allowedTypes.includes(valueUpdateType)) {
          if(targetCurrentValue.allowedTypes.includes('object') && typeof value == 'string'){
            try{
              value = JSON.parse(value);
            }catch(e){
              this._generateError('Invalid JSON object', category, settingsKey, value);
            }
          } 
          else if (targetCurrentValue.allowedTypes.includes('string')) value = value.toString();
          else if (targetCurrentValue.allowedTypes.includes('number'))
            value = parseInt(value.toString());
          else if(targetCurrentValue.allowedTypes.includes('boolean')) value = value.toString() === 'true';
          else if(targetCurrentValue.allowedTypes.includes('bigint') && typeof value == 'string') value = BigInt(value);
          else {
            this._generateError('Invalid settings update type.', category, settingsKey, value);
            return false;
          }
        }
        if (settingsKey === 'mapPath' && typeof value === 'string') {
          value.replace(/\\/g, '/');
          const splitName = (value as string).split('/');
          let mapName = splitName[splitName.length - 1];
          if (mapName) {
            mapName = mapName.substring(0, mapName.length - 4);
            this._values.autoHost.mapName.value = mapName;
            if (!filteredUpdates.autoHost) {
              filteredUpdates.autoHost = {mapName};
            } else {
              filteredUpdates.autoHost.mapName = mapName;
            }
          }
        }
        // @ts-expect-error Unable to type
        await this.setSetting(category, settingsKey, value);
        this.info(
          category + ' settings changed: ' + settingsKey,
          settingsKey.toLowerCase().includes('token') || settingsKey.toLowerCase().includes('password')
            ? '*HIDDEN*'
            : value,
        );
        if (!filteredUpdates[category]) {
          filteredUpdates[category] = {};
        }
        // @ts-expect-error Unable to type
        filteredUpdates[category][settingsKey] = value;
      }
    }
    if (Object.keys(filteredUpdates).length > 0) {
      this.emit('settingsUpdates', filteredUpdates);
      return true;
    }
    return false;
  }

  private settingsHelper<SettingsCategory extends keyof AppSettings>(category: SettingsCategory, key: keyof AppSettingsDataStructure[SettingsCategory]): AppSettingsDataPoint | undefined {
    return this._values[category]?.[key] as
    | AppSettingsDataPoint
    | undefined;

  }

  private _generateError(errorText: string, settingName: string, key: string, value: unknown) {
    this.warn(
      'Invalid update:',
      errorText,
      settingName,
      key,
      key.toLowerCase().includes('token') || key.toLowerCase().includes('password')
        ? '*HIDDEN*'
        : value,
    );
  }
}

export const settings = new AppSettingsContainer();
