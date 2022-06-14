import { Global } from "../globalBase";

import WebSocket from "ws";

import { gameState, MenuStates } from "./gameState";
import { settings } from "./settings";

import { warControl } from "./warControl";
import type { GameClientLobbyPayload, Regions } from "wc3mt-lobby-container";

export interface GameList {
  games: Array<{ name: string; id: number; mapFile: string }>;
}

export type AvailableHandicaps = 50 | 60 | 70 | 80 | 90 | 100;

/*
Other Native Game events:
  "FriendsFriendUpdated",
  "TeamsInformation",
  "UpdateMapVetos",
  "UpdateMapPool",
  "UpdateSelectedGameMode",
  "UpdateReadyState",
  "UpdateGameModes",
  "FriendsInvitationData",
  "FriendsFriendData",
  "MultiplayerRecentPlayers",
  "UpdateLobbySelectedRace",
  "FriendsFriendRemoved",
  "GameModeResolved",
  "ShowAgeRatingScreen",
  "ClanInfoData",
  "ProfileAvatarId",
  "UpdateToonList",
  "OnGetAgeRatingRequired",
  "GameModeUpdated",
  "GameListRemove",
  "IMEUpdated",
  "LoadProgressUpdate",
  "GameListUpdate",
*/
export interface NativeGameSocketEvents {
  UpdateScoreInfo?: {
    scoreInfo: {
      localPlayerWon: boolean;
      isHDModeEnabled: boolean;
      localPlayerRace: number;
      gameName: string;
      gameId: number;
      players: Array<any>;
      mapInfo: Array<any>;
    };
  };
  ScreenTransitionInfo?: { screen: MenuStates };
  SetGlueScreen?: { screen: MenuStates };
  GameLobbySetup?: GameClientLobbyPayload;
  GameList?: GameList;
  ChatMessage?: GameChatMessage;
  UpdateUserInfo?: {
    user: { battleTag: string; userRegion: Regions };
  };
  SetOverlayScreen?: { screen: "AUTHENTICATION_OVERLAY" | string };
  // TODO: Fix these
  OnNetProviderInitialized?: any;
  OnChannelUpdate?: { gameChat: any };
  MultiplayerGameLeave?: any;
  MultiplayerGameCreateResult?: any;
}
export interface GameSocketEvents extends NativeGameSocketEvents {
  connected?: true;
  disconnected?: true;
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

export interface GameChatMessage {
  message: { sender: string; source: "gameChat"; content: string };
}

export interface SendGameMessage {
  PlaySound?: { sound: "MenuButtonClick" };
  CreateLobby?: CreateLobbyPayload;
  SendGameChatMessage?: { content: string };
  JoinGame?: {
    gameId: number;
    password: "";
    mapFile: string;
  };
  ScreenTransitionInfo?: {
    screen: "LOGIN_DOORS";
    type: "Screen";
    time: string;
  };
  SetHandicap?: { slot: number; handicap: AvailableHandicaps };
  SetTeam?: { slot: number; team: number };
  CloseSlot?: { slot: number };
  OpenSlot?: { slot: number };
  BanPlayerFromGameLobby?: { slot: number };
  KickPlayerFromGameLobby?: { slot: number };
  LobbyStart?: {};
  LeaveGame?: {};
  ExitGame?: {};
  LobbyCancel?: {};
  GetGameList?: {};
  SendGameListing?: {};
  GetLocalPlayerName?: {};
  FriendsGetInvitations?: {};
  FriendsGetFriends?: {};
  MultiplayerSendRecentPlayers?: {};
  ClanGetClanInfo?: {};
  ClanGetMembers?: {};
  StopOverworldMusic?: {};
  StopAmbientSound?: {};
  LoginDoorClose?: {};
  OnWebUILoad?: {};
}

class GameSocket extends Global {
  sentMessages: Array<String> = [];
  gameWebSocket: WebSocket | null = null;
  voteTimer: NodeJS.Timeout | null = null;
  gameState = gameState;
  //lobbyControl = lobbyControl;
  sendingInGameChat: { active: boolean; queue: Array<string> } = {
    active: false,
    queue: [],
  };

  constructor() {
    super();
  }

  emitEvent(event: GameSocketEvents): void {
    this.emit("gameSocketEvent", event);
  }

  connectGameSocket(connectInfo: string) {
    this.gameWebSocket = new WebSocket(connectInfo);
    this.info("Connecting to game client: ", connectInfo);
    this.gameWebSocket.on("open", () => {
      this.emitEvent({ connected: true });
    });
    this.gameWebSocket.on("message", (data) => {
      let parsedData = JSON.parse(data.toString());
      if (parsedData.messageType === "MultiplayerGameLeave") {
        this.sentMessages = [];
        gameState.updateGameState({ action: "nothing" });
      }
      if (parsedData.messageType === "ChatMessage") {
        this.emitEvent(parsedData);
      }
      switch (parsedData.messageType) {
        case "ScreenTransitionInfo":
          this.gameState.updateGameState({ screenState: parsedData.payload.screen });
          break;
        /*case "GameList":
          this.handleGlueScreen("CUSTOM_LOBBIES");
          break;
        case "MultiplayerGameCreateResult":
          if (this.gameState.values.menuState === "GAME_LOBBY") {
            setTimeout(() => {
              this.handleGlueScreen("CUSTOM_LOBBIES");
            }, 1000);
          }
          break;*/
        case "UpdateUserInfo":
          this.gameState.updateGameState({
            selfBattleTag: parsedData.payload.user.battleTag,
            selfRegion: parsedData.payload.user.userRegion,
          });
          break;
        case "SetOverlayScreen":
          if (parsedData.payload.screen === "AUTHENTICATION_OVERLAY") {
            setTimeout(warControl.handleBnetLogin, 5000);
          }
          break;
      }
    });
    this.gameWebSocket.on("close", () => {
      this.sentMessages = [];
      if (settings.values.client.antiCrash) {
        setTimeout(async () => {
          if (await warControl.checkProcess("BlizzardError.exe")) {
            this.error("Crash detected: BlizzardError.exe is running, restarting.");
            await warControl.forceQuitProcess("BlizzardError.exe");
            warControl.openWarcraft();
          }
        }, 1000);
      }
      this.emitEvent({ disconnected: true });
      this.error("Game client connection closed!");
    });
  }

  cancelStart() {
    this.info("Cancelling start");
    this.sendMessage({ LobbyCancel: {} });
  }

  sendChatMessage(content: string) {
    if (
      this.gameState.values.menuState === "GAME_LOBBY" ||
      this.gameState.values.menuState === "CUSTOM_GAME_LOBBY"
    ) {
      if (typeof content === "string" && content.length > 0) {
        let newChatSplit = content.match(/.{1,255}/g);
        if (!newChatSplit) {
          this.error("Could not split chat message into 255 character chunks");
          return;
        }
        this.sentMessages = this.sentMessages.concat(newChatSplit);
        newChatSplit.forEach((content) => {
          this.info("Sending chat message: " + content);
          this.sendMessage({
            SendGameChatMessage: {
              content,
            },
          });
        });
      }
    }
  }

  sendMessage(data: SendGameMessage) {
    if (this.gameWebSocket) {
      if (this.gameWebSocket.readyState === 1) {
        let payloads = Object.entries(data);
        for (const [message, payload] of payloads) {
          this.gameWebSocket.send(JSON.stringify({ message, payload }));
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
