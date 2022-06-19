import { ModuleBase } from "./../moduleBase";

import { CreateLobbyPayload, GameSocketEvents } from "./../globals/gameSocket";

import { app } from "electron";

import { getTargetRegion } from "./../utility";
import { existsSync, readFileSync, rmSync } from "fs";

import {
  keyboard,
  Key,
  screen,
  mouse,
  centerOf,
  imageResource,
  sleep,
  Point,
  straightTo,
} from "@nut-tree/nut-js";
import { GameState } from "./../globals/gameState";
require("@nut-tree/nl-matcher");

class AutoHost extends ModuleBase {
  voteStartVotes: Array<string> = [];
  wc3mtTargetFile = `${app.getPath("documents")}\\Warcraft III\\CustomMapData\\wc3mt.txt`;
  gameNumber = 1;
  voteTimer: NodeJS.Timeout | null = null;
  private lastAnnounceTime: number = 0;
  constructor() {
    super({ listeners: ["gameSocketEvent"] });
  }

  protected onGameSocketEvent(events: GameSocketEvents): void {
    if (events.OnNetProviderInitialized && this.settings.values.client.performanceMode) {
      setTimeout(this.autoHostGame.bind(this), 1000);
    }
    if (events.UpdateScoreInfo) {
      this.autoHostGame();
    }
    if (events.SetOverlayScreen?.screen === "AUTHENTICATION_OVERLAY") {
      setTimeout(() => this.warControl.handleBnetLogin(), 5000);
    }
    if (events.processedChat) {
      if (events.processedChat.content.match(/^\?votestart$/i)) {
        if (
          this.settings.values.autoHost.voteStart &&
          this.voteStartVotes &&
          this.lobby.microLobby?.lobbyStatic.isHost &&
          ["rapidHost", "smartHost"].includes(this.settings.values.autoHost.type)
        ) {
          if (!this.lobby.microLobby?.allPlayers.includes(events.processedChat.sender)) {
            this.gameSocket.sendChatMessage("Only players may vote start.");
            return;
          }
          if (this.voteStartVotes.length === 0) {
            if (
              (this.settings.values.autoHost.voteStartTeamFill &&
                this.lobby.allPlayerTeamsContainPlayers()) ||
              !this.settings.values.autoHost.voteStartTeamFill
            ) {
              this.voteTimer = setTimeout(this.cancelVote.bind(this), 60000);
              this.gameSocket.sendChatMessage("You have 60 seconds to ?votestart.");
            } else {
              this.gameSocket.sendChatMessage("Unavailable. Not all teams have players.");
              return;
            }
          }
          if (
            !this.voteStartVotes.includes(events.processedChat.sender) &&
            this.voteTimer
          ) {
            this.voteStartVotes.push(events.processedChat.sender);
            if (
              this.voteStartVotes.length >=
              this.lobby.microLobby?.nonSpecPlayers.length *
                (this.settings.values.autoHost.voteStartPercent / 100)
            ) {
              this.info("Vote start succeeded");
              this.lobby.startGame();
            } else {
              this.gameSocket.sendChatMessage(
                Math.ceil(
                  this.lobby.microLobby?.nonSpecPlayers.length *
                    (this.settings.values.autoHost.voteStartPercent / 100) -
                    this.voteStartVotes.length
                ).toString() + " more vote(s) required."
              );
            }
          }
        }
      }
    }
  }

  protected onGameStateUpdate(updates: Partial<GameState>): void {
    if (this.settings.values.autoHost.type === "smartHost") {
      this.info("Setting up smart host.");
      setTimeout(() => autoHost.smartQuit(), 15000);
    } else if (
      this.settings.values.autoHost.type === "rapidHost" &&
      this.settings.values.autoHost.rapidHostTimer > 0
    ) {
      this.info(
        "Setting rapid host timer to " + this.settings.values.autoHost.rapidHostTimer
      );
      setTimeout(
        () => this.lobby.leaveGame,
        this.settings.values.autoHost.rapidHostTimer * 1000 * 60
      );
    }
    screen.height().then((screenHeight) => {
      screen.width().then((screenWidth) => {
        let safeZone = new Point(screenWidth / 2, screenHeight - screenHeight / 4);
        mouse.move(straightTo(safeZone)).then(() => {
          this.warControl.sendInGameChat("");
        });
      });
    });
  }

  async autoHostGame(override: boolean = false) {
    if (
      this.settings.values.autoHost.type !== "off" &&
      (!this.settings.values.client.commAddress || override)
    ) {
      let targetRegion = this.gameState.values.selfRegion;
      if (this.settings.values.autoHost.regionChange) {
        targetRegion = getTargetRegion(
          this.settings.values.autoHost.regionChangeTimeEU,
          this.settings.values.autoHost.regionChangeTimeNA
        );
      }
      if (
        this.gameState.values.selfRegion &&
        targetRegion &&
        this.gameState.values.selfRegion !== targetRegion
      ) {
        this.info(`Changing autohost region to ${targetRegion}`);
        await this.warControl.exitGame();
        this.warControl.openWarcraft(targetRegion);
        return true;
      } else {
        if (this.settings.values.autoHost.increment) {
          this.gameNumber += 1;
        }
        return await this.createGame();
      }
    }
  }

  async smartQuit() {
    if (
      this.gameState.values.inGame ||
      this.gameState.values.menuState === "LOADING_SCREEN"
    ) {
      if (existsSync(this.wc3mtTargetFile)) {
        // The library seems to create the file at the start of the game anyways, so if it is going to be written to, don't do ocr.
        if (
          readFileSync(this.wc3mtTargetFile)
            .toString()
            .match(/wc3mt-GameEnd/)
        ) {
          this.info("Game is over, quitting.");
          rmSync(this.wc3mtTargetFile);
          this.lobby.leaveGame();
        } else {
          setTimeout(this.smartQuit.bind(this), 1000);
        }
      } else {
        this.findQuit();
      }
    }
  }

  async findQuit() {
    if (
      this.gameState.values.inGame ||
      this.gameState.values.menuState === "LOADING_SCREEN"
    ) {
      if (await this.warControl.activeWindowWar()) {
        let foundTarget = false;
        let searchFiles = ["quitNormal.png", "quitHLW.png"];
        for (const file of searchFiles) {
          try {
            const foundImage = await screen.find(imageResource(file));
            if (foundImage) {
              foundTarget = true;
              this.info("Found " + file + ", leaving game.");
              break;
            }
          } catch (e) {
            console.log(e);
          }
        }
        if (foundTarget) {
          this.lobby.leaveGame();
          if (this.settings.values.autoHost.sounds) {
            this.playSound("quit.wav");
          }
        } else if (
          !this.lobby.microLobby?.nonSpecPlayers.includes(
            this.gameState.values.selfBattleTag
          )
        ) {
          if (this.settings.values.autoHost.leaveAlternate) {
            foundTarget = false;
            keyboard.type(Key.F12);
            try {
              const foundImage = await screen.find(imageResource("closeScoreboard.png"), {
                confidence: 0.8,
              });
              if (foundImage) {
                mouse.setPosition(await centerOf(foundImage));
                mouse.leftClick();
              }
            } catch (e) {
              console.log(e);
            }
            try {
              const foundImage = await screen.find(imageResource("soloObserver.png"), {
                confidence: 0.8,
              });
              if (foundImage) {
                foundTarget = true;
                this.info("Found soloObserver.png, leaving game.");
              }
            } catch (e) {
              console.log(e);
            }
            keyboard.type(Key.Escape);
            if (foundTarget) {
              this.lobby.leaveGame();
              if (this.settings.values.autoHost.sounds) {
                this.playSound("quit.wav");
              }
            }
          } else if (this.settings.values.obs.autoStream) {
            if (!this.warControl.sendingInGameChat.active) {
              keyboard.type(Key.Space);
            }
          }
        }
      }
      setTimeout(() => this.smartQuit(), 5000);
    }
  }

  async createGame(
    customGameData: CreateLobbyPayload | false = false,
    callCount: number = 0,
    lobbyName: string = ""
  ): Promise<boolean> {
    if (!(await this.warControl.isWarcraftOpen())) {
      await this.warControl.openWarcraft();
    }
    if (
      !this.lobby.microLobby?.lobbyStatic.lobbyName &&
      !this.gameState.values.inGame &&
      !["CUSTOM_GAME_LOBBY", "LOADING_SCREEN", "GAME_LOBBY"].includes(
        this.gameState.values.menuState
      )
    ) {
      this.gameState.updateGameState({ action: "creatingLobby" });
      if ((callCount + 5) % 10 === 0) {
        if (this.settings.values.autoHost.increment) {
          if (callCount > 45) {
            return false;
          }
          this.gameNumber += 1;
          this.warn("Failed to create game. Incrementing game name");
        } else {
          this.warn("Failed to create game. Stopping attempts.");
          return false;
        }
      }
      if (callCount % 10 === 0) {
        lobbyName =
          lobbyName ||
          this.settings.values.autoHost.gameName +
            (this.settings.values.autoHost.increment ? ` #${this.gameNumber}` : "");
        const payloadData: CreateLobbyPayload = customGameData || {
          filename: this.settings.values.autoHost.mapPath.replace(/\\/g, "/"),
          gameSpeed: 2,
          gameName: lobbyName,
          mapSettings: {
            flagLockTeams: this.settings.values.autoHost.advancedMapOptions
              ? this.settings.values.autoHost.flagLockTeams
              : true,
            flagPlaceTeamsTogether: this.settings.values.autoHost.advancedMapOptions
              ? this.settings.values.autoHost.flagPlaceTeamsTogether
              : true,
            flagFullSharedUnitControl: this.settings.values.autoHost.advancedMapOptions
              ? this.settings.values.autoHost.flagFullSharedUnitControl
              : false,
            flagRandomRaces: this.settings.values.autoHost.advancedMapOptions
              ? this.settings.values.autoHost.flagRandomRaces
              : false,
            flagRandomHero: this.settings.values.autoHost.advancedMapOptions
              ? this.settings.values.autoHost.flagRandomHero
              : false,
            settingObservers: parseInt(this.settings.values.autoHost.observers) as
              | 0
              | 1
              | 2
              | 3,
            settingVisibility: this.settings.values.autoHost.advancedMapOptions
              ? (parseInt(this.settings.values.autoHost.settingVisibility) as
                  | 0
                  | 1
                  | 2
                  | 3)
              : 0,
          },
          privateGame: this.settings.values.autoHost.private,
        };
        this.info("Sending autoHost payload", payloadData);
        this.gameSocket.sendMessage({ CreateLobby: payloadData });
      }
      await sleep(1000);
      return await this.createGame(false, callCount + 1, lobbyName);
    } else if (this.lobby.microLobby?.lobbyStatic.lobbyName === lobbyName) {
      this.info("Game successfully created");
      return true;
    } else if (
      !this.lobby.microLobby?.lobbyStatic.lobbyName.includes(
        this.settings.values.autoHost.gameName
      )
    ) {
      this.info("Game created with incorrect increment.");
      return true;
    } else {
      this.warn("Failed to create game?");
      return false;
    }
  }

  cancelVote() {
    if (this.voteTimer) {
      clearTimeout(this.voteTimer);
      this.voteTimer = null;
      this.gameSocket.sendChatMessage("Vote cancelled.");
      this.info("Vote cancelled");
    } else {
      this.gameSocket.sendChatMessage("Vote timed out.");
      this.info("Vote timed out");
    }
    this.voteStartVotes = [];
  }

  announcement() {
    if (
      (this.gameState.values.menuState === "CUSTOM_GAME_LOBBY" ||
        this.gameState.values.menuState === "GAME_LOBBY") &&
      this.lobby.microLobby?.lobbyStatic.isHost
    ) {
      let currentTime = Date.now();
      if (
        currentTime >
        this.lastAnnounceTime +
          1000 * this.settings.values.autoHost.announceRestingInterval
      ) {
        this.lastAnnounceTime = currentTime;
        if (["rapidHost", "smartHost"].includes(this.settings.values.autoHost.type)) {
          if (this.settings.values.autoHost.announceIsBot) {
            let text = "Welcome. I am a bot.";
            if (
              this.lobby.microLobby?.statsAvailable &&
              this.settings.values.elo.type !== "off"
            ) {
              text += " I will fetch ELO from " + this.settings.values.elo.type + ".";
              if (this.settings.values.elo.balanceTeams) {
                text += " I will try to balance teams before we start.";
              }
            }
            if (
              (this.settings.values.elo.type === "off" ||
                !this.settings.values.elo.balanceTeams) &&
              this.settings.values.autoHost.shufflePlayers
            ) {
              text += " I will shuffle players before we start.";
            }
            if (["smartHost", "rapidHost".includes(this.settings.values.autoHost.type)]) {
              text += " I will start when slots are full.";
            }
            if (this.settings.values.autoHost.voteStart) {
              text += " You can vote start with ?votestart";
            }
            if (this.settings.values.autoHost.regionChange) {
              text += " I switch regions.";
            }
            this.gameSocket.sendChatMessage(text);
          }
          if (
            this.settings.values.autoHost.announceCustom &&
            this.settings.values.autoHost.customAnnouncement
          ) {
            this.gameSocket.sendChatMessage(
              this.settings.values.autoHost.customAnnouncement
            );
          }
        } else if (
          this.settings.values.autoHost.type === "lobbyHost" &&
          this.settings.values.autoHost.announceCustom &&
          this.settings.values.autoHost.customAnnouncement
        ) {
          this.gameSocket.sendChatMessage(
            this.settings.values.autoHost.customAnnouncement
          );
        }
      }
    }
  }
}

export const autoHost = new AutoHost();
