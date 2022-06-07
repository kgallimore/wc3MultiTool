import { Global } from "../globalBase";

import WebSocket from "ws";
import fs from "fs";

import { gameState, GameState, MenuStates } from "./gameState";
import { settings } from "./settings";
import { isInt } from "../utility";
import { lobbyControl } from "./../modules/lobbyControl";

import { warControl } from "./warControl";
import { GameClientLobbyPayload, Regions } from "wc3mt-lobby-container";

export interface GameList {
  games: Array<{ name: string; id: number; mapFile: string }>;
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
  lobbyControl = lobbyControl;
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
      if (openLobbyParams?.lobbyName) {
        openParamsJoin();
      }
    });
    this.gameWebSocket.on("message", (data) => {
      let parsedData = JSON.parse(data.toString());
      if (parsedData.messageType === "ChatMessage") {
        this.handleChatMessage(parsedData.payload);
      } else {
        this.emitEvent(parsedData);
      }
      switch (parsedData.messageType) {
        case "ScreenTransitionInfo":
          this.gameState.updateGameState({ screenState: parsedData.payload.screen });
          break;
        case "GameList":
          if (openLobbyParams && (openLobbyParams.lobbyName || openLobbyParams.gameId)) {
            this.info("GameList received, trying to find lobby.");
            handleGameList(parsedData.payload);
          } else {
            this.handleGlueScreen("CUSTOM_LOBBIES");
          }
          break;
        case "MultiplayerGameLeave":
          clearLobby();
          break;
        case "MultiplayerGameCreateResult":
          if (this.gameState.values.menuState === "GAME_LOBBY") {
            setTimeout(() => {
              this.handleGlueScreen("CUSTOM_LOBBIES");
            }, 1000);
          }
          break;
        case "UpdateUserInfo":
          this.gameState.updateGameState({
            selfBattleTag: parsedData.payload.user.battleTag,
            selfRegion: parsedData.payload.user.userRegion,
          });
          break;
        case "SetOverlayScreen":
          if (parsedData.payload.screen === "AUTHENTICATION_OVERLAY") {
            setTimeout(handleBnetLogin, 5000);
          }
          break;
        default:
          //console.log(data);
          if (
            [
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
            ].includes(parsedData.messageType) === false
          ) {
            if (parsedData.messageType === "GameList") {
              //console.log(data.payload.games);
            } else {
              //console.log(JSON.stringify(data));
            }
          }
      }
    });
    this.gameWebSocket.on("close", () => {
      this.emitEvent({ disconnected: true });
      // TODO: Remove from global
      clearLobby();
      this.error("Game client connection closed!");
      if (settings.values.client.antiCrash) {
        setTimeout(async () => {
          if (await warControl.checkProcess("BlizzardError.exe")) {
            this.error("Crash detected: BlizzardError.exe is running, restarting.");
            await warControl.forceQuitProcess("BlizzardError.exe");
            warControl.openWarcraft();
          }
        }, 1000);
      }
    });
  }

  handleClientMessage(message: { data: string }) {}

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

  async handleChatMessage(payload: GameChatMessage) {
    // TODO: logging
    // TODO: Move into modules
    if (payload.message?.sender && payload.message.source === "gameChat") {
      if (payload.message.sender.includes("#")) {
        var sender = payload.message.sender;
      } else if (
        this.gameState.values.selfBattleTag.toLowerCase().includes(payload.message.sender)
      ) {
        var sender = this.gameState.values.selfBattleTag;
      } else {
        let possiblePlayers = this.lobbyControl?.microLobby?.searchPlayer(
          payload.message.sender
        );
        if (possiblePlayers && possiblePlayers.length === 1) {
          var sender = possiblePlayers[0];
        } else {
          this.error(
            `Unknown sender: ${payload.message.sender} for message: ${payload.message.content}`
          );
          return;
        }
      }
      if (sender === this.gameState.values.selfBattleTag) {
        if (this.sentMessages.includes(payload.message.content)) {
          this.sentMessages.splice(this.sentMessages.indexOf(payload.message.content), 1);
          return;
        } else if (
          payload.message.content.match(
            /^((\d{1,2}: (\[Closed]|\[Open]))|(Map Upload (Started|Offset|Complete): \d+)|(Name: ((([A-zÀ-ú][A-zÀ-ú0-9]{2,11})|(^([а-яёА-ЯЁÀ-ú][а-яёА-ЯЁ0-9À-ú]{2,11})))(#[0-9]{4,})|\w{2,11}), Key: (?:[0-9]{1,3}\.){3}[0-9]{1,3}))$/
          )
        ) {
          // Escape debug messages
          return;
        } else if (
          payload.message.content.match(/^(executed '!)|(Unknown command ')|(Command ')/i)
        ) {
          // Filter out some command returns from !swap etc
          return;
        }
      }
      // Message has a sender and is probably not a debug message.
      if (!this.lobbyControl?.microLobby?.newChat(sender, payload.message.content)) {
        // Filter out repeated messages sent w/in 1 second
        // TODO: more spam filters
        return;
      }
      this.emitEvent({
        ChatMessage: {
          message: { sender, content: payload.message.content, source: "gameChat" },
        },
      });
      {
        if (
          sender !== this.gameState.values.selfBattleTag &&
          payload.message.content.match(/^!debug/)
        ) {
          this.lobbyControl?.banPlayer(sender);
        }
        var translatedMessage = "";
        if (payload.message.content.length > 4) {
          var detectLangs = detectLang.detect(payload.message.content, 1);
          console.log(detectLangs);
          if (
            settings.values.client.language &&
            !payload.message.content.startsWith("?") &&
            (!detectLangs ||
              detectLangs.length === 0 ||
              (![settings.values.client.language, null, "null"].includes(
                detectLangs[0][0]
              ) &&
                detectLangs[0][1] > 0.3))
          ) {
            this.verbose("Translating '" + payload.message.content);
            try {
              translatedMessage = await translate(payload.message.content, {
                to: settings.values.client.language,
              });
              if (
                translatedMessage.toLowerCase() === payload.message.content.toLowerCase()
              ) {
                translatedMessage = "";
              }
            } catch (e) {
              this.error(e);
            }
          }
        }

        if (settings.values.client.translateToLobby && translatedMessage) {
          this.sendChatMessage(sender + ": " + translatedMessage);
        }

        if (!settings.values.autoHost.private || !app.isPackaged) {
          HubSingle.sendToHub({
            lobbyUpdates: {
              chatMessage: {
                name: sender,
                message:
                  payload.message.content +
                  ": " +
                  (translatedMessage ? translatedMessage : payload.message.content),
              },
            },
          });
        }
        if (discSingle) {
          discSingle.this.sendMessage(
            sender +
              ": " +
              (translatedMessage
                ? `${translatedMessage} ||${payload.message.content}||`
                : payload.message.content)
          );
        }
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
