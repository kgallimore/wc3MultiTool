import { Module } from "./../moduleBase";

import type { GameState, MenuStates } from "./../globals/gameState";
import { CreateLobbyPayload, GameSocketEvents } from "./../globals/gameSocket";

import {app} from "electron"
import {join} from "path"
import Store from "electron-store"
const store = new Store();

import {getTargetRegion} from "./../utility"
import {readdirSync, statSync, existsSync, readFileSync, rmSync, createReadStream} from "fs";
import parser from "w3gjs";

import {
    keyboard,
    Key,
    screen,
    mouse,
    centerOf,
    imageResource,
    Point,
    sleep,
    straightTo,
  } from "@nut-tree/nut-js";
  require("@nut-tree/nl-matcher");

export interface mmdResults {
    list: {
      [key: string]: { pid: string; won: boolean; extra: { [key: string]: string } };
    };
    lookup: { [key: string]: string };
  }

class AutoHost extends Module {
    replayFolders: string = join(
        app.getPath("documents"),
        "Warcraft III\\BattleNet"
      );
    
      wc3mtTargetFile = `${app.getPath(
        "documents"
      )}\\Warcraft III\\CustomMapData\\wc3mt.txt`;
    gameNumber = 1;
    voteTimer: NodeJS.Timeout | null = null;
    private lastAnnounceTime: number = 0;
  constructor() {
    super();
  }

  protected onGameStateUpdate(updates: Partial<GameState>): void {
    if(updates.menuState){
        this.handleGlueScreen(updates.menuState);
      }
  }

  protected onGameSocketEvent(events: GameSocketEvents): void {
      if(events.UpdateScoreInfo){
          this.autoHostGame();
      }
      if(events.SetGlueScreen){
        this.handleGlueScreen(events.SetGlueScreen.screen as MenuStates);
      }
  }

  async handleGlueScreen(newScreen: GameState["menuState"]) {
    // Create a new game at menu or if previously in game(score screen loads twice)
    // TODO: Keep tack of previous score screen for above note.
    if (
      !newScreen ||
      newScreen === "null" ||
      (newScreen === this.gameState.values.menuState && newScreen !== "SCORE_SCREEN")
    ) {
      return;
    }
    this.info("Screen changed to: ", newScreen);
    if (["CUSTOM_LOBBIES", "MAIN_MENU"].includes(newScreen)) {
      this.info("Checking to see if we should auto host or join a lobby link.");
      if (openLobbyParams?.lobbyName) {
        setTimeout(openParamsJoin, 250);
      } else {
        setTimeout(this.autoHostGame.bind(this), 250);
      }
    } else if (newScreen === "LOADING_SCREEN") {
      if (this.settings.values.autoHost.type === "rapidHost") {
        if (this.settings.values.autoHost.rapidHostTimer === 0) {
          this.info("Rapid Host leave game immediately");
          this.leaveGame();
        } else if (this.settings.values.autoHost.rapidHostTimer === -1) {
          this.info("Rapid Host exit game immediately");
          await this.warControl.forceQuitWar();
          this.warControl.openWarcraft();
        }
      }
    } else if (
      this.gameState.values.menuState === "LOADING_SCREEN" &&
      newScreen === "SCORE_SCREEN"
    ) {
      this.info("Game has finished loading in.");
      this.gameState.updateGameState({ inGame: true, action: "waitingToLeaveGame" });
      if (this.settings.values.autoHost.type === "smartHost") {
        this.info("Setting up smart host.");
        setTimeout(() => this.smartQuit(), 15000);
      }
      if (
        this.settings.values.autoHost.type === "rapidHost" &&
        this.settings.values.autoHost.rapidHostTimer > 0
      ) {
        this.info(
          "Setting rapid host timer to " + this.settings.values.autoHost.rapidHostTimer
        );
        setTimeout(this.leaveGame, this.settings.values.autoHost.rapidHostTimer * 1000 * 60);
      }
      let screenHeight = await screen.height();
      let safeZone = new Point(
        (await screen.width()) / 2,
        screenHeight - screenHeight / 4
      );
      await mouse.move(straightTo(safeZone));
      this.sendInGameChat("");
    } else if (newScreen === "LOGIN_DOORS") {
      if (this.settings.values.client.performanceMode) {
        [
          "GetLocalPlayerName",
          "FriendsGetInvitations",
          "FriendsGetFriends",
          "MultiplayerSendRecentPlayers",
          "ClanGetClanInfo",
          "ClanGetMembers",
          "StopOverworldMusic",
          "StopAmbientSound",
          "LoginDoorClose",
          "StopAmbientSound",
          "StopAmbientSound",
          "OnWebUILoad",
        ].forEach((message, index) => {
          setTimeout(() => {
            this.gameSocket.sendMessage({[message]: {}});
          }, 50 * index);
        });
      }
    } else {
      this.gameState.updateGameState({ inGame: false, action: "nothing" });
      if (this.settings.values.elo.handleReplays) {
        let mostModified = { file: "", mtime: 0 };
        readdirSync(this.replayFolders, { withFileTypes: true })
          .filter((dirent) => dirent.isDirectory())
          .map((dirent) => dirent.name)
          .forEach((folder) => {
            const targetFile = join(
              this.replayFolders,
              folder,
              "Replays",
              "LastReplay.w3g"
            );
            if (existsSync(targetFile)) {
              const stats = statSync(targetFile);
              if (stats.mtimeMs > mostModified.mtime) {
                mostModified.mtime = stats.mtimeMs;
                mostModified.file = targetFile;
              }
            }
          });
        if (
          mostModified.file &&
          mostModified.mtime > this.clientState.values.latestUploadedReplay
        ) {
          this.analyzeGame(mostModified.file).then((results) => {
            if (discSingle) discSingle.lobbyEnded(results);
          });
          this.clientState.updateClientState({ latestUploadedReplay: mostModified.mtime });
          store.set("latestUploadedReplay", this.clientState.values.latestUploadedReplay);
          if (this.settings.values.elo.type === "wc3stats") {
            let form = new FormData();
            form.append("replay", createReadStream(mostModified.file));
            fetch(
              `https://api.wc3stats.com/upload${
                this.settings.values.elo.privateKey ? "/" + this.settings.values.elo.privateKey : ""
              }?auto=true`,
              {
                method: "POST",
                body: form,
                headers: {
                  ...form.getHeaders(),
                },
              }
            ).then(
              (response) => {
                if (response.status !== 200) {
                  this.info(response.statusText);
                  this.sendWindow({messageType: "error",data: { error: response.statusText }});
                } else {
                  this.info("Uploaded replay to wc3stats");
                  this.emitProgress({step: "Uploaded replay", progress: 0});
                }
              },
              (error) => {
                this.info(error.message);
                this.sendWindow({messageType: "error", data: { error: error.message });
              }
            );
          }
        }
      }
    }
    this.gameState.updateGameState({ menuState: newScreen });
    this.sendWindow({messageType: "menusChange", data: { value: this.gameState.values.menuState }});
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
    if (this.gameState.values.inGame || this.gameState.values.menuState === "LOADING_SCREEN") {
      if (existsSync(this.wc3mtTargetFile)) {
        // The library seems to create the file at the start of the game anyways, so if it is going to be written to, don't do ocr.
        if (
          readFileSync(this.wc3mtTargetFile)
            .toString()
            .match(/wc3mt-GameEnd/)
        ) {
          this.info("Game is over, quitting.");
          rmSync(this.wc3mtTargetFile);
          leaveGame();
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
      (this.gameState.values.inGame || this.gameState.values.menuState === "LOADING_SCREEN")
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
          leaveGame();
          if (this.settings.values.autoHost.sounds) {
            playSound("quit.wav");
          }
        } else if (
          !this.lobby?.microLobby?.nonSpecPlayers.includes(this.gameState.values.selfBattleTag)
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
              leaveGame();
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
    customGameData:
      | CreateLobbyPayload
      | false = false,
    callCount: number = 0,
    lobbyName: string = ""
  ): Promise<boolean> {
    if (!(await this.warControl.isWarcraftOpen())) {
      await this.warControl.openWarcraft();
    }
    if (
      !this.lobby?.microLobby?.lobbyStatic.lobbyName &&
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
            settingObservers: parseInt(this.settings.values.autoHost.observers) as 0 | 1 | 2 | 3,
            settingVisibility: this.settings.values.autoHost.advancedMapOptions
              ? parseInt(this.settings.values.autoHost.settingVisibility) as 0 | 1 | 2 | 3
              : 0,
          },
          privateGame: this.settings.values.autoHost.private,
        };
        this.info("Sending autoHost payload", payloadData);
        this.gameSocket.sendMessage({"CreateLobby": payloadData});
      }
      await sleep(1000);
      return await this.createGame(false, callCount + 1, lobbyName);
    } else if (this.lobby?.microLobby?.lobbyStatic.lobbyName === lobbyName) {
      this.info("Game successfully created");
      return true;
    } else if (
      !this.lobby?.microLobby?.lobbyStatic.lobbyName.includes(
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
    if (this.lobby) {
      this.lobby.voteStartVotes = [];
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
        this.lastAnnounceTime + 1000 * this.settings.values.autoHost.announceRestingInterval
      ) {
        this.lastAnnounceTime = currentTime;
        if (["rapidHost", "smartHost"].includes(this.settings.values.autoHost.type)) {
          if (this.settings.values.autoHost.announceIsBot) {
            let text = "Welcome. I am a bot.";
            if (
              this.lobby?.microLobby?.statsAvailable &&
              this.settings.values.elo.type !== "off"
            ) {
              text += " I will fetch ELO from " + this.settings.values.elo.type + ".";
              if (this.settings.values.elo.balanceTeams) {
                text += " I will try to balance teams before we start.";
              }
            }
            if (
              (this.settings.values.elo.type === "off" || !this.settings.values.elo.balanceTeams) &&
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
            this.gameSocket.sendChatMessage(this.settings.values.autoHost.customAnnouncement);
          }
        } else if (
          this.settings.values.autoHost.type === "lobbyHost" &&
          this.settings.values.autoHost.announceCustom &&
          this.settings.values.autoHost.customAnnouncement
        ) {
          this.gameSocket.sendChatMessage(this.settings.values.autoHost.customAnnouncement);
        }
      }
    }
  }

  async analyzeGame(file: string) {
    let data = new Set();
    let dataTypes = new Set();
    let parse = new parser();
    let results: mmdResults = { list: {}, lookup: {} };
    parse.on("gamedatablock", (block) => {
      if (block.id === 0x1f) {
        block.commandBlocks.forEach((commandBlock) => {
          if (
            commandBlock.actions.length > 0 &&
            // @ts-ignore
            commandBlock.actions[0].filename === "MMD.Dat"
          ) {
            commandBlock.actions.forEach((block) => {
              // @ts-ignore
              let key = block.key as string;
              if (key && !/^\d+$/.test(key)) {
                if (!/^DefVarP/i.test(key)) {
                  if (key.match(/^init pid/i)) {
                    results.list[key.split(" ")[3]] = {
                      pid: key.split(" ")[2],
                      won: false,
                      extra: {},
                    };
                    results.lookup[key.split(" ")[2]] = key.split(" ")[3];
                  } else if (key.match(/^FlagP/i)) {
                    results.list[results.lookup[key.split(" ")[1]]].won =
                      key.split(" ")[2] === "winner";
                  } else if (key.match(/^VarP /i)) {
                    if (results.list[results.lookup[key.split(" ")[1]]]) {
                      results.list[results.lookup[key.split(" ")[1]]].extra[
                        key.split(" ")[2]
                      ] = key.split("=")[1].trim();
                    }
                  }
                  data.add(key);
                } else {
                  dataTypes.add(key);
                }
              }
            });
          }
        });
      }
    });
    await parse.parse(readFileSync(file));
    return results;
  }
}

export const autoHost = new AutoHost();