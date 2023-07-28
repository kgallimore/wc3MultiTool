import {Global} from '../globalBase';

import WebSocket from 'ws';

import type {MenuStates} from './gameState';

import type {GameClientLobbyPayload, Regions} from 'wc3mt-lobby-container';

import type {OnChannelJoinChannel} from './util/gameSocketTypes';

export interface GameList {
  games: Array<{name: string; id: number; mapFile: string}>;
}

export type AvailableHandicaps = 50 | 60 | 70 | 80 | 90 | 100;

export interface NativeGameSocketEvents {
  UpdateScoreInfo?: {
    scoreInfo: {
      localPlayerWon: boolean;
      isHDModeEnabled: boolean;
      localPlayerRace: number;
      gameName: string;
      gameId: number;
      players: Array<unknown>;
      mapInfo: Array<unknown>;
    };
  };
  ScreenTransitionInfo?: {screen: MenuStates};
  SetGlueScreen?: {screen: MenuStates};
  GameLobbySetup?: GameClientLobbyPayload;
  GameList?: GameList;
  GameListRemove?: {game: {id: number}};
  GameListUpdate?: {
    game: {id: number; currentPlayers: number; maxPlayers: number; ping: 95};
  };
  ChatMessage?: GameChatMessage;
  UpdateUserInfo?: {
    user: {battleTag: string; userRegion: Regions};
  };
  SetOverlayScreen?: {screen: 'AUTHENTICATION_OVERLAY' | 'NO_OVERLAY'};
  GameVersion?: {gameVersion: string};
  GameListClear?: object;
  LoggedOut?: object;
  HideModal?: object;
  // TODO: Fix these
  BuildType?: {build: 'retail' | string};
  LocaleInfo?: {localeInfo: {fonts: unknown[]; locale: 'enUS' | string}};
  LocalizationValues?: {list: {KeyValues: unknown[]}};
  OnNetProviderInitialized?: unknown;
  OnChannelUpdate?: {gameChat: unknown};
  MultiplayerGameLeave?: unknown;
  MultiplayerGameCreateResult?: {details: {success: false}};
  OnChannelJoin?: {channel: OnChannelJoinChannel};
}
export interface GameSocketEvents extends NativeGameSocketEvents {
  connected?: true;
  disconnected?: true;
  processedChat?: BaseMessage & {translated?: string};
  nonAdminChat?: BaseMessage & {translated?: string};
}

export interface CreateLobbyPayload {
  filename: string;
  gameSpeed: 0 | 1 | 2 | 3;
  gameName: string;
  mapSettings: {
    flagLockTeams: boolean;
    flagPlaceTeamsTogether: boolean;
    flagFullSharedUnitControl: boolean;
    flagRandomRaces: boolean;
    flagRandomHero: boolean;
    settingObservers: 0 | 1 | 2 | 3;
    settingVisibility: 0 | 1 | 2 | 3;
  };
  privateGame?: boolean;
}
export interface BaseMessage {
  sender: string;
  content: string;
}
export interface GameChatMessage {
  message: BaseMessage & {
    source: 'gameChat';
    channelDisplayName: string;
    channelName: string;
    type: 'message';
  };
}

export interface SendGameMessage {
  PlaySound?: {sound: 'MenuButtonClick'};
  CreateLobby?: CreateLobbyPayload;
  SendGameChatMessage?: {content: string};
  JoinGame?: {
    gameId: number;
    password: '';
    mapFile: string;
  };
  ScreenTransitionInfo?: {
    screen: 'LOGIN_DOORS';
    type: 'Screen';
    time: string;
  };
  SetHandicap?: {slot: number; handicap: AvailableHandicaps};
  SetTeam?: {slot: number; team: number};
  CloseSlot?: {slot: number};
  OpenSlot?: {slot: number};
  BanPlayerFromGameLobby?: {slot: number};
  KickPlayerFromGameLobby?: {slot: number};
  LobbyStart?: object;
  LeaveGame?: object;
  ExitGame?: object;
  LobbyCancel?: object;
  GetGameList?: object;
  SendGameListing?: object;
  GetLocalPlayerName?: object;
  FriendsGetInvitations?: object;
  FriendsGetFriends?: object;
  MultiplayerSendRecentPlayers?: object;
  ClanGetClanInfo?: object;
  ClanGetMembers?: object;
  StopOverworldMusic?: object;
  StopAmbientSound?: object;
  LoginDoorClose?: object;
  OnWebUILoad?: object;
}

class GameSocket extends Global {
  sentMessages: Array<string> = [];
  gameWebSocket: WebSocket | null = null;
  voteTimer: NodeJS.Timeout | null = null;
  //lobbyControl = lobbyControl;
  sendingInGameChat: {active: boolean; queue: Array<string>} = {
    active: false,
    queue: [],
  };

  constructor() {
    super('Game Socket');
  }

  emitEvent(event: GameSocketEvents): void {
    this.emit('gameSocketEvent', event);
  }

  connectGameSocket(connectInfo: string) {
    this.gameWebSocket = new WebSocket(connectInfo);
    this.info('Connecting to game client: ', connectInfo);
    this.gameWebSocket.on('open', () => {
      this.emitEvent({connected: true});
    });
    this.gameWebSocket.on('message', data => {
      const parsedData: {messageType: keyof NativeGameSocketEvents; payload: unknown} = JSON.parse(
        data.toString(),
      );
      if (
        ![
          'TeamsInformation',
          'OnChannelUpdate',
          'FriendsFriendUpdated',
          'UpdateReadyState',
        ].includes(parsedData.messageType)
      ) {
        /*console.log(
          ["GameLobbySetup", "GameList", "GameListUpdate", "GameListRemove"].includes(
            parsedData.messageType
          )
            ? parsedData.messageType
            : JSON.stringify(parsedData)
        );*/
        if (parsedData.messageType === 'MultiplayerGameLeave') {
          this.sentMessages = [];
        }
        this.emitEvent({[parsedData.messageType]: parsedData.payload});
      }
    });
    this.gameWebSocket.on('close', () => {
      this.sentMessages = [];
      // TODO: Move this to a module
      this.emitEvent({disconnected: true});
      this.warn('Game client connection closed.');
    });
  }

  cancelStart() {
    this.info('Cancelling start');
    this.sendMessage({LobbyCancel: {}});
  }

  sendChatMessage(content: string) {
    if (this.gameWebSocket?.readyState !== 1) {
      return;
    }
    if (typeof content === 'string' && content.length > 0) {
      const newChatSplit = content.match(/.{1,255}/g);
      if (!newChatSplit) {
        this.error('Could not split chat message into 255 character chunks');
        return;
      }
      this.sentMessages = this.sentMessages.concat(newChatSplit);
      newChatSplit.forEach(content => {
        this.info('Sending chat message: ' + content);
        this.sendMessage({
          SendGameChatMessage: {
            content,
          },
        });
      });
    }
  }

  sendMessage(data: SendGameMessage) {
    if (this.gameWebSocket) {
      if (this.gameWebSocket.readyState === 1) {
        const payloads = Object.entries(data);
        for (const [message, payload] of payloads) {
          this.gameWebSocket.send(JSON.stringify({message, payload}));
        }
      } else if (this.gameWebSocket.readyState === 0) {
        setTimeout(() => {
          this.sendMessage(data);
        }, 100);
      }
    }
  }
}

export const gameSocket = new GameSocket();
