import { Global } from "../globalBase";

import WebSocket from "ws";
import fs from "fs";

import { gameState, GameState } from "./gameState";
import { settings } from "./settings";
import { isInt } from "../utility";

import { WarSingle } from "../modules/warControl";
import { GameClientLobbyPayload, Regions } from "wc3mt-lobby-container";

export interface GameSocketEvents {
  UpdateScoreInfo?: {
    scoreInfo: {
      localPlayerWon: boolean;
      isHDModeEnabled: boolean;
      localPlayerRace: number;
      gameName: string;
      gameId: string;
      players: Array<any>;
      mapInfo: Array<any>;
    };
  };
  ScreenTransitionInfo?: { screen: string };
  SetGlueScreen?: { screen: string };
  GameLobbySetup?: GameClientLobbyPayload;
  GameList?: { games: Array<{ name: string; id: string; mapFile: string }> };
  ChatMessage?: GameChatMessage;
  UpdateUserInfo?: {
    user: { battleTag: string; userRegion: Regions };
  };
  SetOverlayScreen: { screen: "AUTHENTICATION_OVERLAY" | string };
  // TODO: Fix these
  OnNetProviderInitialized?: any;
  OnChannelUpdate?: { gameChat: any };
  MultiplayerGameLeave?: any;
  MultiplayerGameCreateResult?: any;
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
}

export interface GameChatMessage {
  message: { sender: string; source: "gameChat" };
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
  LeaveGame?: {};
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
  sendingInGameChat: { active: boolean; queue: Array<string> } = {
    active: false,
    queue: [],
  };

  constructor() {
    super();
  }

  connectGameSocket(connectInfo: string) {
    this.gameWebSocket = new WebSocket(connectInfo);
    this.info("Connecting to game client: ", connectInfo);
    this.gameWebSocket.on("open", function open() {
      if (openLobbyParams?.lobbyName) {
        openParamsJoin();
      }
    });
    this.gameWebSocket.on(
      "message",
      (data: {
        messageType: string;
        payload:
          | any
          | {
              scoreInfo?: {
                localPlayerWon: boolean;
                isHDModeEnabled: boolean;
                localPlayerRace: number;
                gameName: string;
                gameId: string;
                players: Array<any>;
                mapInfo: Array<any>;
              };
            };
      }) => {
        data = JSON.parse(data.toString());
        switch (data.messageType) {
          case "UpdateScoreInfo":
            autoHostGame();
            break;
          case "ScreenTransitionInfo":
            this.gameState.updateGameState({ screenState: data.payload.screen });
            break;
          case "SetGlueScreen":
            if (data.payload.screen) {
              this.handleGlueScreen(data.payload.screen);
            }
            break;
          case "OnNetProviderInitialized":
            if (settings.values.client.performanceMode) {
              setTimeout(autoHostGame, 1000);
            }
            break;
          case "GameLobbySetup":
            handleLobbyUpdate(data.payload);
            break;
          case "GameList":
            if (
              openLobbyParams &&
              (openLobbyParams.lobbyName || openLobbyParams.gameId)
            ) {
              this.info("GameList received, trying to find lobby.");
              handleGameList(data.payload);
            } else {
              this.handleGlueScreen("CUSTOM_LOBBIES");
            }
            break;
          case "OnChannelUpdate":
            if (data.payload.gameChat) {
              //console.log(data.payload);
            }
            break;
          case "ChatMessage":
            handleChatMessage(data.payload);
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
              selfBattleTag: data.payload.user.battleTag,
              selfRegion: data.payload.user.userRegion,
            });
            break;
          case "SetOverlayScreen":
            if (data.payload.screen === "AUTHENTICATION_OVERLAY") {
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
              ].includes(data.messageType) === false
            ) {
              if (data.messageType === "GameList") {
                //console.log(data.payload.games);
              } else {
                //console.log(JSON.stringify(data));
              }
            }
        }
      }
    );
    this.gameWebSocket.on("close", function close() {
      clearLobby();
      this.error("Game client connection closed!");
      if (settings.values.client.antiCrash) {
        setTimeout(async () => {
          if (await WarSingle.checkProcess("BlizzardError.exe")) {
            this.error("Crash detected: BlizzardError.exe is running, restarting.");
            await WarSingle.forceQuitProcess("BlizzardError.exe");
            WarSingle.openWarcraft();
          }
        }, 1000);
      }
    });
  }

  handleClientMessage(message: { data: string }) {}

  async handleBnetLogin() {
    if (settings.values.client.bnetUsername && settings.values.client.bnetPassword) {
      this.info("Attempting to login to Battle.net.");
      clipboard.writeText(settings.values.client.bnetUsername);
      await keyboard.type(Key.Tab);
      await keyboard.type(Key.LeftControl, Key.V);
      await keyboard.type(Key.Tab);
      clipboard.writeText(settings.values.client.bnetPassword);
      await keyboard.type(Key.LeftControl, Key.V);
      await keyboard.type(Key.Enter);
    }
  }

  handleGameList(data: { games: Array<{ name: string; id: string; mapFile: string }> }) {
    if (data.games && data.games.length > 0) {
      data.games.some((game) => {
        if (openLobbyParams?.lobbyName && game.name === openLobbyParams.lobbyName) {
          this.info("Found game by name");
          this.sendMessage("JoinGame", {
            gameId: game.id,
            password: "",
            mapFile: game.mapFile,
          });
          return true;
        } else if (openLobbyParams?.gameId && game.id === openLobbyParams.gameId) {
          this.info("Found game by Id");
          this.sendMessage("JoinGame", {
            gameId: game.id,
            password: "",
            mapFile: game.mapFile,
          });
          return true;
        }
      });
      openLobbyParams = null;
    }
  }

  async sendInGameChat(chat: string) {
    let newChatSplit = chat.match(/.{1,125}/g);
    if (newChatSplit) {
      this.sendingInGameChat.queue = this.sendingInGameChat.queue.concat(newChatSplit);
      this.info("Queued chat: " + chat);
    }
    if (this.sendingInGameChat.active) {
      return;
    }
    await WarSingle.activeWindowWar();
    try {
      if (this.gameState.values.inGame && WarSingle.inFocus) {
        this.sendingInGameChat.active = true;
        let nextMessage = this.sendingInGameChat.queue.shift();
        while (nextMessage) {
          if (this.gameState.values.inGame && WarSingle.inFocus) {
            this.info("Sending chat: " + nextMessage);
            clipboard.writeText(nextMessage);
            await mouse.leftClick();
            await keyboard.type(Key.LeftShift, Key.Enter);
            await keyboard.type(Key.LeftControl, Key.V);
            await keyboard.type(Key.Enter);
            nextMessage = this.sendingInGameChat.queue.shift();
          } else {
            this.info(
              "Forced to stop sending messages. In Game: " +
                this.gameState.values.inGame +
                " Warcraft in focus: " +
                WarSingle.inFocus
            );
            this.sendingInGameChat.queue.unshift(nextMessage);
            nextMessage = undefined;
          }
        }
      }
      if (this.sendingInGameChat.queue.length === 0) {
        this.info("Chat queue now empty.");
      }
      this.sendingInGameChat.active = false;
      return true;
    } catch (e) {
      this.error(e);
      this.sendingInGameChat.active = false;
      return false;
    }
  }

  cancelStart() {
    this.info("Cancelling start");
    this.sendMessage("LobbyCancel", {});
  }

  startGame(delay: number = 0) {
    this.lobby?.this.startGame(delay);
  }

  async leaveGame() {
    this.info("Leaving Game");
    if (
      this.gameState.values.inGame ||
      ["GAME_LOBBY", "CUSTOM_GAME_LOBBY"].includes(this.gameState.values.menuState)
    ) {
      this.sendMessage("LeaveGame", {});
      if (this.lobby?.microLobby?.lobbyStatic?.lobbyName) {
        let oldLobbyName = this.lobby?.microLobby?.lobbyStatic.lobbyName;
        await sleep(1000);
        if (this.lobby?.microLobby?.lobbyStatic.lobbyName === oldLobbyName) {
          this.info("Lobby did not leave, trying again");
          await WarSingle.exitGame();
          WarSingle.openWarcraft();
        }
      }
    }
  }

  announcement() {
    if (
      (this.gameState.values.menuState === "CUSTOM_GAME_LOBBY" ||
        this.gameState.values.menuState === "GAME_LOBBY") &&
      this.lobby?.microLobby?.lobbyStatic.isHost
    ) {
      let currentTime = Date.now();
      if (
        currentTime >
        lastAnnounceTime + 1000 * settings.values.autoHost.announceRestingInterval
      ) {
        lastAnnounceTime = currentTime;
        if (["rapidHost", "smartHost"].includes(settings.values.autoHost.type)) {
          if (settings.values.autoHost.announceIsBot) {
            let text = "Welcome. I am a bot.";
            if (
              this.lobby?.microLobby?.statsAvailable &&
              settings.values.elo.type !== "off"
            ) {
              text += " I will fetch ELO from " + settings.values.elo.type + ".";
              if (settings.values.elo.balanceTeams) {
                text += " I will try to balance teams before we start.";
              }
            }
            if (
              (settings.values.elo.type === "off" || !settings.values.elo.balanceTeams) &&
              settings.values.autoHost.shufflePlayers
            ) {
              text += " I will shuffle players before we start.";
            }
            if (["smartHost", "rapidHost".includes(settings.values.autoHost.type)]) {
              text += " I will start when slots are full.";
            }
            if (settings.values.autoHost.voteStart) {
              text += " You can vote start with ?votestart";
            }
            if (settings.values.autoHost.regionChange) {
              text += " I switch regions.";
            }
            this.sendChatMessage(text);
          }
          if (
            settings.values.autoHost.announceCustom &&
            settings.values.autoHost.customAnnouncement
          ) {
            this.sendChatMessage(settings.values.autoHost.customAnnouncement);
          }
        } else if (
          settings.values.autoHost.type === "lobbyHost" &&
          settings.values.autoHost.announceCustom &&
          settings.values.autoHost.customAnnouncement
        ) {
          this.sendChatMessage(settings.values.autoHost.customAnnouncement);
        }
      }
    }
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
          this.sendMessage("SendGameChatMessage", {
            content,
          });
        });
      }
    }
  }

  async handleChatMessage(payload: GameChatMessage) {
    // TODO: logging
    if (payload.message?.sender && payload.message.source === "gameChat") {
      if (payload.message.sender.includes("#")) {
        var sender = payload.message.sender;
      } else if (
        this.gameState.values.selfBattleTag.toLowerCase().includes(payload.message.sender)
      ) {
        var sender = this.gameState.values.selfBattleTag;
      } else {
        let possiblePlayers = this.lobby?.microLobby?.searchPlayer(
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
        if (sentMessages.includes(payload.message.content)) {
          sentMessages.splice(sentMessages.indexOf(payload.message.content), 1);
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
      {
        if (!this.lobby?.microLobby?.newChat(sender, payload.message.content)) {
          // Filter out repeated messages sent w/in 1 second
          // TODO: more spam filters
          return;
        }
        if (
          sender !== this.gameState.values.selfBattleTag &&
          payload.message.content.match(/^!debug/)
        ) {
          this.lobby?.banPlayer(sender);
        } else if (payload.message.content.match(/^\?votestart$/i)) {
          if (
            settings.values.autoHost.voteStart &&
            this.lobby?.voteStartVotes &&
            this.lobby?.microLobby?.lobbyStatic.isHost &&
            ["rapidHost", "smartHost"].includes(settings.values.autoHost.type)
          ) {
            if (!this.lobby?.microLobby?.allPlayers.includes(sender)) {
              this.sendChatMessage("Only players may vote start.");
              return;
            }
            if (this.lobby?.voteStartVotes.length === 0) {
              if (
                (settings.values.autoHost.voteStartTeamFill &&
                  this.lobby?.allPlayerTeamsContainPlayers()) ||
                !settings.values.autoHost.voteStartTeamFill
              ) {
                voteTimer = setTimeout(cancelVote, 60000);
                this.sendChatMessage("You have 60 seconds to ?votestart.");
              } else {
                this.sendChatMessage("Unavailable. Not all teams have players.");
                return;
              }
            }
            if (!this.lobby?.voteStartVotes.includes(sender) && voteTimer) {
              this.lobby?.voteStartVotes.push(sender);
              if (
                this.lobby?.voteStartVotes.length >=
                this.lobby?.microLobby?.nonSpecPlayers.length *
                  (settings.values.autoHost.voteStartPercent / 100)
              ) {
                this.info("Vote start succeeded");
                this.startGame();
              } else {
                this.sendChatMessage(
                  Math.ceil(
                    this.lobby?.microLobby?.nonSpecPlayers.length *
                      (settings.values.autoHost.voteStartPercent / 100) -
                      this.lobby?.voteStartVotes.length
                  ).toString() + " more vote(s) required."
                );
              }
            }
          }
        } else if (payload.message.content.match(/^\?stats/)) {
          if (
            this.lobby?.microLobby?.lobbyStatic?.isHost &&
            settings.values.elo.type !== "off" &&
            this.lobby?.microLobby?.statsAvailable
          ) {
            let data: false | PlayerData;
            let playerTarget = payload.message.content.split(" ")[1];
            if (playerTarget) {
              let targets = this.lobby?.microLobby?.searchPlayer(playerTarget);
              if (targets.length === 1) {
                sender = targets[0];
                data = this.lobby?.getPlayerData(sender);
              } else if (targets.length > 1) {
                this.sendChatMessage("Multiple players found. Please be more specific.");
                return;
              } else {
                this.sendChatMessage("No player found.");
                return;
              }
            } else {
              data = this.lobby?.getPlayerData(sender);
            }
            if (data) {
              if (!data.extra || data.extra?.rating === -1) {
                this.sendChatMessage("Data pending");
              } else {
                this.sendChatMessage(
                  sender +
                    " ELO: " +
                    data.extra.rating +
                    ", Rank: " +
                    data.extra.rank +
                    ", Played: " +
                    data.extra.played +
                    ", Wins: " +
                    data.extra.wins +
                    ", Losses: " +
                    data.extra.losses +
                    ", Last Change: " +
                    data.extra.lastChange
                );
              }
            } else {
              this.sendChatMessage("No data available or pending?");
            }
          } else {
            this.sendChatMessage("Data not available");
          }
        } else if (payload.message.content.match(/^\?sp$/i)) {
          if (
            this.lobby?.microLobby?.lobbyStatic.isHost &&
            banWhiteListSingle.checkRole(sender, "moderator")
          ) {
            this.lobby?.shufflePlayers();
          }
        } else if (payload.message.content.match(/^\?st$/i)) {
          if (
            this.lobby?.microLobby?.lobbyStatic?.isHost &&
            banWhiteListSingle.checkRole(sender, "moderator")
          ) {
            this.lobby?.shufflePlayers(false);
          }
        } else if (payload.message.content.match(/^\?start$/i)) {
          if (
            this.lobby?.microLobby?.lobbyStatic.isHost &&
            banWhiteListSingle.checkRole(sender, "moderator")
          ) {
            this.startGame();
          }
        } else if (payload.message.content.match(/^\?a$/i)) {
          if (
            this.lobby?.microLobby?.lobbyStatic.isHost &&
            banWhiteListSingle.checkRole(sender, "moderator")
          ) {
            cancelStart();
          }
        } else if (payload.message.content.match(/^\?closeall$/i)) {
          if (
            this.lobby?.microLobby?.lobbyStatic.isHost &&
            banWhiteListSingle.checkRole(sender, "moderator")
          ) {
            this.sendChatMessage("!closeall");
          }
        } else if (payload.message.content.match(/^\?hold$/i)) {
          if (
            this.lobby?.microLobby?.lobbyStatic.isHost &&
            banWhiteListSingle.checkRole(sender, "moderator")
          ) {
            let targetPlayer = payload.message.content.split(" ")[1];
            if (targetPlayer) {
              this.sendChatMessage("!hold " + targetPlayer);
            } else {
              this.sendChatMessage("Player target required.");
            }
          }
        } else if (payload.message.content.match(/^\?mute$/i)) {
          if (banWhiteListSingle.checkRole(sender, "moderator")) {
            let targetPlayer = payload.message.content.split(" ")[1];
            if (targetPlayer) {
              this.sendChatMessage("!mute " + targetPlayer);
              this.info(sender + " muted " + targetPlayer);
            } else {
              this.sendChatMessage("Player target required.");
            }
          }
        } else if (payload.message.content.match(/^\?unmute$/i)) {
          if (banWhiteListSingle.checkRole(sender, "moderator")) {
            let targetPlayer = payload.message.content.split(" ")[1];
            if (targetPlayer) {
              this.sendChatMessage("!unmute " + targetPlayer);
              this.info(sender + " unmuted " + targetPlayer);
            } else {
              this.sendChatMessage("Player target required.");
            }
          }
        } else if (payload.message.content.match(/^\?openall$/i)) {
          if (
            this.lobby?.microLobby?.lobbyStatic.isHost &&
            banWhiteListSingle.checkRole(sender, "moderator")
          ) {
            this.sendChatMessage("!openall");
          }
        } else if (payload.message.content.match(/^\?swap/i)) {
          if (
            this.lobby?.microLobby?.lobbyStatic.isHost &&
            banWhiteListSingle.checkRole(sender, "baswapper")
          ) {
            let [command, ...args] = payload.message.content.split(" ");
            if (args.length === 2) {
              let playerData = this.lobby?.microLobby?.getAllPlayerData();
              let tenMinutesAgo = Date.now() - 10 * 60 * 1000;
              if (isInt(args[1], 24, 1) && isInt(args[0], 24, 1)) {
                if (
                  banWhiteListSingle.checkRole(sender, "swapper") ||
                  (playerData[this.lobby?.microLobby?.slots[parseInt(args[0]) - 1].name]
                    .joinedAt > tenMinutesAgo &&
                    playerData[this.lobby?.microLobby?.slots[parseInt(args[1]) - 1].name]
                      .joinedAt > tenMinutesAgo)
                ) {
                  this.lobby?.swapPlayers({
                    slots: [
                      ensureInt(args[0]) as SlotNumbers,
                      ensureInt(args[1]) as SlotNumbers,
                    ],
                  });
                } else {
                  this.sendChatMessage(
                    "You can only swap players who joined within the last 10 minutes."
                  );
                }
              } else if (
                this.lobby?.microLobby?.searchPlayer(args[1]).length === 1 &&
                this.lobby?.microLobby?.searchPlayer(args[0]).length === 1
              ) {
                if (
                  banWhiteListSingle.checkRole(sender, "swapper") ||
                  (playerData[this.lobby?.microLobby?.searchPlayer(args[1])[0]].joinedAt >
                    tenMinutesAgo &&
                    playerData[this.lobby?.microLobby?.searchPlayer(args[0])[0]]
                      .joinedAt > tenMinutesAgo)
                ) {
                  this.lobby?.swapPlayers({ players: [args[0], args[1]] });
                } else {
                  this.sendChatMessage(
                    "You can only swap players who joined within the last 10 minutes."
                  );
                }
              } else {
                this.sendChatMessage("All swap players not found, or too many matches.");
              }
            } else {
              this.sendChatMessage("Invalid swap arguments");
            }
          }
        } else if (payload.message.content.match(/^\?handi/i)) {
          if (
            this.lobby?.microLobby?.lobbyStatic.isHost &&
            banWhiteListSingle.checkRole(sender, "moderator")
          ) {
            if (payload.message.content.split(" ").length === 3) {
              var target = payload.message.content.split(" ")[1];
              var handicap = parseInt(payload.message.content.split(" ")[2]);
              if (handicap) {
                if (isInt(target, 24, 1)) {
                  this.lobby?.setHandicapSlot(parseInt(target) - 1, handicap);
                } else {
                  this.lobby?.setPlayerHandicap(target, handicap);
                }
              } else {
                this.sendChatMessage("Invalid handicap");
              }
            } else {
              this.sendChatMessage("Invalid number of arguments");
            }
          }
        } else if (payload.message.content.match(/^\?close/i)) {
          if (
            this.lobby?.microLobby?.lobbyStatic.isHost &&
            banWhiteListSingle.checkRole(sender, "moderator")
          ) {
            var target = payload.message.content.split(" ")[1];
            if (target) {
              if (isInt(target, 24, 1)) {
                this.lobby?.closeSlot(parseInt(target) - 1);
              } else {
                let targets = this.lobby?.microLobby?.searchPlayer(target);
                if (targets.length === 1) {
                  this.lobby?.closePlayer(targets[0]);
                } else if (targets.length > 1) {
                  this.sendChatMessage(
                    "Multiple matches found. Please be more specific."
                  );
                } else {
                  this.sendChatMessage("No matches found.");
                }
              }
            } else {
              this.sendChatMessage("Kick target required");
            }
          }
        } else if (payload.message.content.match(/^\?open/i)) {
          if (
            this.lobby?.microLobby?.lobbyStatic.isHost &&
            banWhiteListSingle.checkRole(sender, "moderator")
          ) {
            var target = payload.message.content.split(" ")[1];
            if (target) {
              if (isInt(target, 24, 1)) {
                this.lobby?.openSlot(parseInt(target) - 1);
              } else {
                let targets = this.lobby?.microLobby?.searchPlayer(target);
                if (targets.length === 1) {
                  this.lobby?.kickPlayer(targets[0]);
                } else if (targets.length > 1) {
                  this.sendChatMessage(
                    "Multiple matches found. Please be more specific."
                  );
                } else {
                  this.sendChatMessage("No matches found.");
                }
              }
            } else {
              this.sendChatMessage("Kick target required");
            }
          }
        } else if (payload.message.content.match(/^\?kick/i)) {
          if (
            this.lobby?.microLobby?.lobbyStatic.isHost &&
            banWhiteListSingle.checkRole(sender, "moderator")
          ) {
            var target = payload.message.content.split(" ")[1];
            if (target) {
              if (isInt(target, 24, 1)) {
                this.lobby?.kickSlot(parseInt(target) - 1);
              } else {
                let targets = this.lobby?.microLobby?.searchPlayer(target);
                if (targets.length === 1) {
                  this.lobby?.kickPlayer(targets[0]);
                } else if (targets.length > 1) {
                  this.sendChatMessage(
                    "Multiple matches found. Please be more specific."
                  );
                } else {
                  this.sendChatMessage("No matches found.");
                }
              }
            } else {
              this.sendChatMessage("Kick target required");
            }
          }
        } else if (payload.message.content.match(/^\?ban/i)) {
          if (
            this.lobby?.microLobby?.lobbyStatic.isHost &&
            banWhiteListSingle.checkRole(sender, "moderator")
          ) {
            var targetPlayer = payload.message.content.split(" ")[1];
            if (targetPlayer) {
              var reason = payload.message.content.split(" ").slice(2).join(" ") || "";
              if (isInt(targetPlayer, 24, 1)) {
                this.lobby?.banSlot(parseInt(targetPlayer) - 1);
                banWhiteListSingle.banPlayer(
                  this.lobby?.microLobby?.slots[targetPlayer].name,
                  sender,
                  this.lobby?.microLobby?.region,
                  reason
                );
              } else {
                if (targetPlayer.match(/^\D\S{2,11}#\d{4,8}$/)) {
                  this.sendChatMessage("Banning out of lobby player.");
                  banWhiteListSingle.banPlayer(
                    targetPlayer,
                    sender,
                    this.lobby?.microLobby?.region,
                    reason
                  );
                } else {
                  let targets = this.lobby?.microLobby?.searchPlayer(targetPlayer);
                  if (targets.length === 1) {
                    banWhiteListSingle.banPlayer(
                      targets[0],
                      sender,
                      this.lobby?.microLobby?.region,
                      reason
                    );
                  } else if (targets.length > 1) {
                    this.sendChatMessage(
                      "Multiple matches found. Please be more specific."
                    );
                  } else {
                    this.sendChatMessage("No matches found.");
                  }
                }
              }
            } else {
              this.sendChatMessage("Target required");
            }
          }
        } else if (payload.message.content.match(/^\?unban/i)) {
          if (
            this.lobby?.microLobby?.lobbyStatic.isHost &&
            banWhiteListSingle.checkRole(sender, "moderator")
          ) {
            var target = payload.message.content.split(" ")[1];
            if (target) {
              if (target.match(/^\D\S{2,11}#\d{4,8}$/)) {
                this.sendChatMessage("Unbanning out of lobby player.");
                banWhiteListSingle.unBanPlayer(target, sender);
              } else {
                this.sendChatMessage("Full battleTag required");
                this.info("Full battleTag required");
              }
            } else {
              this.sendChatMessage("Ban target required");
              this.info("Ban target required");
            }
          }
        } else if (payload.message.content.match(/^\?white/i)) {
          if (
            this.lobby?.microLobby?.lobbyStatic?.isHost &&
            banWhiteListSingle.checkRole(sender, "moderator")
          ) {
            var targetPlayer = payload.message.content.split(" ")[1];
            if (targetPlayer) {
              var reason = payload.message.content.split(" ").slice(2).join(" ") || "";
              if (isInt(targetPlayer, 24, 1)) {
                banWhiteListSingle.whitePlayer(
                  this.lobby?.microLobby?.slots[targetPlayer].name,
                  sender,
                  this.lobby?.microLobby?.region,
                  reason
                );
              } else {
                if (targetPlayer.match(/^\D\S{2,11}#\d{4,8}$/)) {
                  this.sendChatMessage("Whitelisting out of lobby player.");
                  banWhiteListSingle.whitePlayer(
                    targetPlayer,
                    sender,
                    this.lobby?.microLobby?.region,
                    reason
                  );
                } else {
                  let targets = this.lobby?.microLobby?.searchPlayer(targetPlayer);
                  if (targets.length === 1) {
                    banWhiteListSingle.whitePlayer(
                      targets[0],
                      sender,
                      this.lobby?.microLobby?.region,
                      reason
                    );
                  } else if (targets.length > 1) {
                    this.sendChatMessage(
                      "Multiple matches found. Please be more specific."
                    );
                  } else {
                    this.sendChatMessage("No matches found.");
                  }
                }
              }
            } else {
              this.sendChatMessage("Target required");
            }
          }
        } else if (payload.message.content.match(/^\?unwhite/i)) {
          // TODO: In lobby search and removal
          if (
            this.lobby?.microLobby?.lobbyStatic.isHost &&
            banWhiteListSingle.checkRole(sender, "moderator")
          ) {
            var target = payload.message.content.split(" ")[1];
            if (target) {
              if (target.match(/^\D\S{2,11}#\d{4,8}$/)) {
                this.sendChatMessage("Un-whitelisting out of lobby player.");
                banWhiteListSingle.unWhitePlayer(target, sender);
              } else {
                this.sendChatMessage("Full battleTag required");
                this.info("Full battleTag required");
              }
            } else {
              this.sendChatMessage("Un-whitelist target required");
              this.info("Un-whitelist target required");
            }
          }
        } else if (payload.message.content.match(/^\?perm/i)) {
          if (
            this.lobby?.microLobby?.lobbyStatic.isHost &&
            banWhiteListSingle.checkRole(sender, "admin")
          ) {
            var target = payload.message.content.split(" ")[1];
            var perm: "mod" | "baswapper" | "swapper" | "moderator" | "admin" =
              (payload.message.content.split(" ")[2]?.toLowerCase() as
                | null
                | "baswapper"
                | "swapper"
                | "moderator"
                | "admin") ?? "mod";
            perm = perm === "mod" ? "moderator" : perm;
            if (target) {
              if (["baswapper", "swapper", "moderator", "admin"].includes(perm)) {
                if (target.match(/^\D\S{2,11}#\d{4,8}$/)) {
                  this.sendChatMessage("Assigning out of lobby player " + perm + ".");
                  banWhiteListSingle.addAdmin(
                    target,
                    sender,
                    this.lobby?.microLobby?.region,
                    perm
                  );
                } else {
                  let targets = this.lobby?.microLobby?.searchPlayer(target);
                  if (targets.length === 1) {
                    if (
                      banWhiteListSingle.addAdmin(
                        targets[0],
                        sender,
                        this.lobby?.microLobby?.region,
                        perm
                      )
                    ) {
                      this.sendChatMessage(
                        targets[0] + " has been promoted to " + perm + "."
                      );
                    } else {
                      this.sendChatMessage(
                        "Could not promote " + targets[0] + " to " + perm + "."
                      );
                    }
                  } else if (targets.length > 1) {
                    this.sendChatMessage(
                      "Multiple matches found. Please be more specific."
                    );
                  } else {
                    this.sendChatMessage("No matches found.");
                  }
                }
              } else {
                this.sendChatMessage("Invalid permission");
              }
            } else {
              this.sendChatMessage("Target required");
            }
          }
        } else if (payload.message.content.match(/^\?unperm/i)) {
          if (
            this.lobby?.microLobby?.lobbyStatic?.isHost &&
            banWhiteListSingle.checkRole(sender, "admin")
          ) {
            var target = payload.message.content.split(" ")[1];
            if (target) {
              if (target.match(/^\D\S{2,11}#\d{4,8}$/)) {
                if (banWhiteListSingle.removeAdmin(target, sender)) {
                  this.sendChatMessage(
                    "Removed perm from out of lobby player: " + target
                  );
                } else {
                  this.sendChatMessage(
                    "Could not remove perm from out of lobby player: " + target
                  );
                }
              } else {
                let targets = this.lobby?.microLobby?.searchPlayer(target);
                if (targets.length === 1) {
                  if (banWhiteListSingle.removeAdmin(targets[0], sender)) {
                    this.sendChatMessage(targets[0] + " has been demoted.");
                  } else {
                    this.sendChatMessage(targets[0] + " has no permissions.");
                  }
                } else if (targets.length > 1) {
                  this.sendChatMessage(
                    "Multiple matches found. Please be more specific."
                  );
                } else {
                  this.sendChatMessage("No matches found.");
                }
              }
            } else {
              this.sendChatMessage("Target required");
            }
          }
        } else if (payload.message.content.match(/^\?autohost/i)) {
          if (
            this.lobby?.microLobby?.lobbyStatic.isHost &&
            banWhiteListSingle.checkRole(sender, "admin")
          ) {
            var target = payload.message.content.split(" ")[1];
            if (target) {
              target = target.toLowerCase();
              if (["off", "rapid", "lobby", "smart"].includes(target)) {
                if (target !== "off") {
                  target += "Host";
                }
                this.sendChatMessage("Setting autohost type to: " + target);
                settings.updateSettings({
                  autoHost: { type: target as AutoHostSettings["type"] },
                });
              } else {
                this.sendChatMessage("Invalid autohost type");
              }
            } else {
              this.sendChatMessage(
                "Autohost current type: " + settings.values.autoHost.type
              );
            }
          } else {
            this.sendChatMessage("You do not have permission to use this command.");
          }
        } else if (payload.message.content.match(/^\?autostart/i)) {
          if (
            this.lobby?.microLobby?.lobbyStatic.isHost &&
            banWhiteListSingle.checkRole(sender, "admin")
          ) {
            var target = payload.message.content.split(" ")[1];
            if (target) {
              if (isInt(target, 24, 0)) {
                var startTarget = parseInt(target);
                this.sendChatMessage(
                  "Setting autostart number to: " + startTarget.toString()
                );
                if (settings.values.autoHost.type === "off") {
                  this.sendChatMessage("Autohost must be enabled to autostart.");
                }
                settings.updateSettings({ autoHost: { minPlayers: startTarget } });
              } else {
                this.sendChatMessage("Invalid autostart number");
              }
            } else {
              this.sendChatMessage(
                "Autostart current number: " + settings.values.autoHost.minPlayers
              );
            }
          } else {
            this.sendChatMessage("You do not have permission to use this command.");
          }
        } else if (payload.message.content.match(/^\?(help)|(commands)/i)) {
          if (this.lobby?.microLobby?.lobbyStatic.isHost) {
            if (this.lobby?.microLobby?.statsAvailable) {
              this.sendChatMessage(
                "?stats <?player>: Return back your stats, or target player stats"
              );
            }
            if (
              ["rapidHost", "smartHost"].includes(settings.values.autoHost.type) &&
              settings.values.autoHost.voteStart
            ) {
              this.sendChatMessage("?voteStart: Starts or accepts a vote to start");
            }
            if (banWhiteListSingle.checkRole(sender, "moderator")) {
              this.sendChatMessage("?a: Aborts game start");
              this.sendChatMessage(
                "?ban <name|slotNumber> <?reason>: Bans a player forever"
              );
              this.sendChatMessage(
                "?close<?all> <name|slotNumber>: Closes all / a slot/player"
              );
              this.sendChatMessage(
                "?handi <name|slotNumber> <50|60|70|80|100>: Sets slot/player handicap"
              );
              this.sendChatMessage("?hold <name>: Holds a slot");
              this.sendChatMessage(
                "?kick <name|slotNumber> <?reason>: Kicks a slot/player"
              );
              this.sendChatMessage("?<un>mute <player>: Mutes/un-mutes a player");
              this.sendChatMessage(
                "?open<?all> <name|slotNumber> <?reason>: Opens all / a slot/player"
              );
              this.sendChatMessage("?unban <name>: Un-bans a player");
              this.sendChatMessage("?white <name>: Whitelists a player");
              this.sendChatMessage("?unwhite <name>: Un-whitelists a player");
              this.sendChatMessage("?start: Starts game");
              this.sendChatMessage(
                "?swap <name|slotNumber> <name|slotNumber>: Swaps players"
              );
              this.sendChatMessage("?sp: Shuffles players completely randomly");
              this.sendChatMessage("?st: Shuffles players randomly between teams");
            }
            if (banWhiteListSingle.checkRole(sender, "admin")) {
              this.sendChatMessage(
                "?perm <name> <?admin|mod|swapper>: Promotes a player to a role (mod by default)"
              );
              this.sendChatMessage("?unperm <name>: Demotes player to normal");
              this.sendChatMessage(
                "?autohost <?off|rapid|lobby|smart>: Gets/?Sets autohost type"
              );
            }
            this.sendChatMessage(
              "?help: Shows commands with <required arg> <?optional arg>"
            );
          }
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
            log.verbose("Translating '" + payload.message.content);
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

  handleLobbyUpdate(payload: GameClientLobbyPayload) {
    if (payload.teamData.playableSlots > 1) {
      this.lobby?.ingestLobby(payload, this.gameState.values.selfRegion as Regions);
    }
  }
}

export const gameSocket = new GameSocket();
