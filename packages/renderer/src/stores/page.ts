import {writable} from 'svelte/store';
import type {GameState} from '../../../main/src/globals/gameState';
import type {ClientState} from '../../../main/src/globals/clientState';
import type {AppSettings} from '../../../main/src/globals/settings';

export const windowData = writable<{
  battleTag: string;
  banReason: string;
  lastAction: string;
  updateStatus: string;
}>({battleTag: '', banReason: '', lastAction: '', updateStatus: ''});

export const gameState = writable<GameState>({
  selfRegion: '',
  menuState: 'OUT_OF_MENUS',
  selfBattleTag: '',
  inGame: false,
  action: 'openingWarcraft',
  openLobbyParams: undefined,
  connected: false,
  gameVersion: '',
});

export const clientState = writable<ClientState>({
  tableVersion: 0,
  latestUploadedReplay: 0,
  currentStep: '',
  currentStepProgress: 0,
  currentIP: '',
  vpnActive: false,
  ipCountry: '',
  ipIsEU: false,
});

export const appSettings = writable<AppSettings>({
  autoHost: {
    type: 'off',
    private: false,
    sounds: false,
    increment: true,
    mapName: '',
    gameName: '',
    mapPath: 'N/A',
    announceIsBot: false,
    announceCustom: false,
    announceRestingInterval: 30,
    moveToSpec: false,
    moveToTeam: '',
    rapidHostTimer: 0,
    smartHostTimeout: 0,
    voteStart: false,
    voteStartPercent: 60,
    voteStartTeamFill: true,
    closeSlots: [],
    customAnnouncement: '',
    observers: '0',
    advancedMapOptions: false,
    flagLockTeams: true,
    flagPlaceTeamsTogether: true,
    flagFullSharedUnitControl: false,
    flagRandomRaces: false,
    flagRandomHero: false,
    settingVisibility: '0',
    leaveAlternate: false,
    shufflePlayers: false,
    regionChangeType: 'off',
    regionChangeTimeEU: '11:00',
    regionChangeOpenVPNConfigEU: '',
    regionChangeTimeNA: '01:00',
    regionChangeOpenVPNConfigNA: '',
    whitelist: false,
    minPlayers: 0,
    delayStart: 0,
    openVPNPath: '',
  },
  obs: {
    enabled: false,
    sceneSwitchType: 'off',
    inGameHotkey: false,
    outOfGameHotkey: false,
    inGameWSScene: '',
    outOfGameWSScene: '',
    address: '',
    token: '',
    autoStream: false,
    textSource: false,
  },
  elo: {
    type: 'off',
    dbIP: '127.0.0.1',
    dbPort: 3306,
    dbUser: '',
    dbPassword: '',
    dbName: '',
    dbTableName: '',
    dbSecondaryTable: '',
    dbPrimaryTableKey: '',
    dbSecondaryTableKey: '',
    dbUserColumn: 'player',
    dbELOColumn: 'rating',
    dbDefaultElo: 500,
    dbRankColumn: 'rank',
    dbLastChangeColumn: '',
    dbPlayedColumn: 'played',
    dbWonColumn: 'wins',
    dbSeasonColumn: '',
    dbCurrentSeason: '',
    sqlitePath: '',
    balanceTeams: true,
    announce: true,
    hideElo: false,
    excludeHostFromSwap: true,
    lookupName: '',
    privateKey: '',
    available: false,
    wc3StatsVariant: '',
    handleReplays: true,
    requireStats: false,
    minGames: 0,
    minWins: 0,
    minRank: 0,
    minRating: 0,
  },
  discord: {
    enabled: false,
    token: '',
    announceChannel: '',
    chatChannel: '',
    useThreads: true,
    adminChannel: '',
    logLevel: 'error',
    bidirectionalChat: false,
    sendInGameChat: false,
    adminRole: 'wc3mt',
    customName: '',
  },
  client: {
    restartOnUpdate: false,
    checkForUpdates: true,
    performanceMode: false,
    openWarcraftOnStart: false,
    startOnLogin: false,
    commAddress: '',
    language: 'en',
    translateToLobby: false,
    antiCrash: true,
    alternateLaunch: false,
    bnetPassword: '',
    bnetUsername: '',
    releaseChannel: 'latest',
    debugAssistance: false,
  },
  streaming: {
    enabled: false,
    seToken: '',
    sendTipsInGame: false,
    sendTipsInLobby: false,
    sendTipsInDiscord: false,
    minInGameTip: 1,
  },
});