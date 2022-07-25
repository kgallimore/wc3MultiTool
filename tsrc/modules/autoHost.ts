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
require("@nut-tree/nl-matcher");
import { GameState } from "./../globals/gameState";
import type { LobbyUpdatesExtended } from "./lobbyControl";
import type { Regions } from "wc3mt-lobby-container";
const exec = require("child_process").exec;

class AutoHost extends ModuleBase {
  voteStartVotes: Array<string> = [];
  wc3mtTargetFile = `${app.getPath("documents")}\\Warcraft III\\CustomMapData\\wc3mt.txt`;
  gameNumber = 0;
  voteTimer: NodeJS.Timeout | null = null;
  creatingGame: boolean = false;
  private lastAnnounceTime: number = 0;

  constructor() {
    super("AutoHost", {
      listeners: ["gameSocketEvent", "gameStateUpdates", "lobbyUpdate"],
    });
    this.setVPNState();
  }

  protected onLobbyUpdate(updates: LobbyUpdatesExtended): void {
    if (
      this.settings.values.autoHost.type === "off" ||
      this.settings.values.autoHost.type === "lobbyHost"
    ) {
      return;
    }
    if (updates.stale) {
      this.lobby.leaveGame();
      return;
    }
    if (updates.playerCleared) {
      this.announcement();
    }
    if (
      (updates.lobbyReady || updates.playerCleared || updates.lobbyBalanced) &&
      this.lobby.microLobby?.lobbyStatic.isHost
    ) {
      this.verbose("Lobby in new ready state. Checking for start conditions");
      if (!this.lobby.isLobbyReady()) {
        return;
      }
      let teams = this.lobby.exportDataStructure("Autohost 1", true);
      if (this.settings.values.autoHost.minPlayers !== 0) {
        if (
          this.lobby.microLobby.nonSpecPlayers.length <
          this.settings.values.autoHost.minPlayers
        ) {
          return;
        } else {
          this.info("Minimum player count met.");
        }
      } else if (
        // Any player team has any open slot
        Object.values(teams).some(
          (team) => team.filter((slot) => slot.slotStatus === 0).length > 0
        )
      ) {
        return;
      } else {
        this.info("All player teams full.");
      }
      // Is a shuffle required
      if (
        (this.settings.values.elo.type == "off" ||
          !this.settings.values.elo.balanceTeams) &&
        this.settings.values.autoHost.shufflePlayers
      ) {
        this.info("Shuffling players.");
        this.lobby.shufflePlayers();
        setTimeout(() => {
          if (this.lobby.isLobbyReady()) {
            this.lobby.startGame(this.settings.values.autoHost.delayStart);
          }
        }, 250);
      } else if (
        this.settings.values.elo.type !== "off" &&
        this.settings.values.elo.balanceTeams &&
        !updates.lobbyBalanced
      ) {
        this.info("Balancing players.");
        this.lobby.autoBalance();
      } else {
        this.lobby.startGame(this.settings.values.autoHost.delayStart);
      }
      if (this.settings.values.autoHost.sounds) {
        this.playSound("ready.wav");
      }
      this.clientState.updateClientState({
        currentStep: "Starting Game",
        currentStepProgress: 100,
      });
    }
    if (
      updates.playerData?.extraData &&
      this.settings.values.elo.type !== "off" &&
      this.settings.values.elo.announce
    ) {
      this.gameSocket.sendChatMessage(
        updates.playerData.name +
          " ELO: " +
          updates.playerData.extraData.rating +
          ", Rank: " +
          updates.playerData.extraData.rank +
          ", Played: " +
          updates.playerData.extraData.played +
          ", Wins: " +
          updates.playerData.extraData.wins +
          ", Losses: " +
          updates.playerData.extraData.losses +
          ", Last Change: " +
          updates.playerData.extraData.lastChange
      );
    }
  }

  protected onGameSocketEvent(events: GameSocketEvents): void {
    if (events.OnNetProviderInitialized && this.settings.values.client.performanceMode) {
      setTimeout(this.autoHostGame.bind(this), 1000);
    }
    if (events.SetOverlayScreen?.screen) {
      if (events.SetOverlayScreen.screen === "AUTHENTICATION_OVERLAY") {
        setTimeout(() => this.warControl.handleBnetLogin(), 5000);
      }
    }
    if (events.nonAdminChat) {
      if (events.nonAdminChat.content.match(/^\?votestart$/i)) {
        if (
          this.settings.values.autoHost.voteStart &&
          this.lobby.microLobby?.lobbyStatic.isHost &&
          ["rapidHost", "smartHost"].includes(this.settings.values.autoHost.type)
        ) {
          if (!this.lobby.microLobby.allPlayers.includes(events.nonAdminChat.sender)) {
            this.gameSocket.sendChatMessage("Only players may vote start.");
            return;
          }
          if (this.voteStartVotes.length === 0) {
            let numPlayers = Object.values(
              this.lobby.exportDataStructure("Autohost 2", true)
            )
              .flatMap((team) => team)
              .filter((player) => player.realPlayer).length;
            if (numPlayers < 2) {
              this.gameSocket.sendChatMessage("Unavailable. Not enough players.");
              return;
            }
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
            !this.voteStartVotes.includes(events.nonAdminChat.sender) &&
            this.voteTimer
          ) {
            this.voteStartVotes.push(events.nonAdminChat.sender);
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
    if (updates.inGame) {
      if (this.settings.values.autoHost.type === "smartHost") {
        this.info("Setting up smart host.");
        setTimeout(() => autoHost.smartQuit(), 15000);
      } else if (this.settings.values.autoHost.type === "rapidHost") {
        if (this.settings.values.autoHost.rapidHostTimer > 0) {
          this.info(
            "Setting rapid host timer to " + this.settings.values.autoHost.rapidHostTimer
          );
          setTimeout(
            () => this.lobby.leaveGame,
            this.settings.values.autoHost.rapidHostTimer * 1000 * 60
          );
        } else {
          this.lobby.leaveGame();
        }
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
    if (updates.menuState) {
      if (updates.menuState === "LOADING_SCREEN") {
        if (this.settings.values.autoHost.type === "rapidHost") {
          if (this.settings.values.autoHost.rapidHostTimer === -1) {
            this.info("Rapid Host exit game immediately");
            this.warControl.forceQuitWar().then(() => {
              this.openWarcraftRegion();
            });
          }
        }
      } else if (
        ["CUSTOM_LOBBIES", "MAIN_MENU", "SCORE_SCREEN"].includes(updates.menuState)
      ) {
        if (this.gameState.values.openLobbyParams.lobbyName) {
          this.verbose("Skipping autohost since a lobby is being joined.");
        } else {
          setTimeout(this.autoHostGame.bind(this), 1000);
        }
      }
    }
  }

  async openWarcraftRegion() {
    this.verbose("Opening warcraft with region settings.");
    if (
      this.settings.values.autoHost.regionChangeType === "openVPN" ||
      this.settings.values.autoHost.regionChangeType === "both"
    ) {
      if (await this.setVPNState()) {
        this.verbose("Correct region VPN set.");
      }
    }
    let targetRegion: undefined | Regions;
    if (
      this.settings.values.autoHost.regionChangeType === "both" ||
      this.settings.values.autoHost.regionChangeType === "realm"
    ) {
      targetRegion = getTargetRegion(
        this.settings.values.autoHost.regionChangeTimeEU,
        this.settings.values.autoHost.regionChangeTimeNA
      );
    }
    this.warControl.openWarcraft(targetRegion);
  }

  async autoHostGame(override: boolean = false) {
    if (this.settings.values.autoHost.type === "off" || this.creatingGame) {
      return false;
    }
    if (this.settings.values.client.commAddress || override) {
      this.verbose(
        "Not auto-hosting game: " + this.settings.values.client.commAddress
          ? "Comm Address"
          : "Over-ridden"
      );
      return false;
    }
    {
      if (this.settings.values.autoHost.regionChangeType !== "off") {
        let newRegion = getTargetRegion(
          this.settings.values.autoHost.regionChangeTimeEU,
          this.settings.values.autoHost.regionChangeTimeNA
        );
        if (
          ["realm", "both"].includes(this.settings.values.autoHost.regionChangeType) &&
          this.gameState.values.selfRegion !== newRegion.toLowerCase()
        ) {
          this.info(
            `Changing realm region to ${newRegion} from ${this.gameState.values.selfRegion}`
          );
          await this.warControl.exitGame();
          this.openWarcraftRegion();
          return true;
        }
        if (
          ["openVPN", "both"].includes(this.settings.values.autoHost.regionChangeType) &&
          newRegion !== this.clientState.values.vpnActive
        ) {
          this.info(`Changing VPN region to ${newRegion}`);
          await this.warControl.exitGame();
          this.openWarcraftRegion();
          return true;
        }
      }
      if (this.settings.values.autoHost.increment) {
        this.gameNumber += 1;
      }
      return await this.createGame();
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
    if (this.creatingGame === true && callCount === 0) {
      return false;
    }
    this.creatingGame = true;
    if (!this.gameState.values.connected) {
      this.warn("Tried to create game when no connection exists.");
      this.creatingGame = false;
      return false;
    }
    if (this.gameState.values.inGame) {
      this.info("Cancelling lobby creation: Already in game.");
      this.creatingGame = false;
      return false;
    }
    if (this.lobby.microLobby?.lobbyStatic.lobbyName) {
      if (this.lobby.microLobby.lobbyStatic.lobbyName === lobbyName) {
        this.info("Game successfully created: " + lobbyName);
        this.creatingGame = false;
        return true;
      }
      if (
        this.lobby.microLobby.lobbyStatic.lobbyName.includes(
          this.settings.values.autoHost.gameName
        )
      ) {
        this.info(
          "Game created with incorrect increment: " +
            this.lobby.microLobby.lobbyStatic.lobbyName
        );
        this.creatingGame = false;
        return true;
      }
    }
    if (
      ["CUSTOM_GAME_LOBBY", "LOADING_SCREEN", "GAME_LOBBY"].includes(
        this.gameState.values.menuState
      )
    ) {
      this.info("Cancelling lobby creation: Already in lobby.");
      this.creatingGame = false;
      return false;
    }
    this.gameState.updateGameState({ action: "creatingLobby" });
    if ((callCount + 5) % 10 === 0) {
      if (this.settings.values.autoHost.increment) {
        if (callCount > 45) {
          this.creatingGame = false;
          return false;
        }
        this.gameNumber += 1;
        this.warn("Failed to create game. Incrementing game name");
      } else {
        this.warn("Failed to create game. Stopping attempts.");
        this.creatingGame = false;
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
            ? (parseInt(this.settings.values.autoHost.settingVisibility) as 0 | 1 | 2 | 3)
            : 0,
        },
        privateGame: this.settings.values.autoHost.private,
      };
      this.info("Sending autoHost payload", payloadData);
      this.gameSocket.sendMessage({ CreateLobby: payloadData });
    }
    await sleep(1000);
    return await this.createGame(false, callCount + 1, lobbyName);
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

  async setVPNState(): Promise<boolean> {
    if (
      this.settings.values.autoHost.regionChangeType !== "both" &&
      this.settings.values.autoHost.regionChangeType !== "openVPN"
    ) {
      return false;
    }
    if (!this.settings.values.autoHost.openVPNPath) {
      this.warn("Please set a path for openvpn.exe");
      return false;
    }
    let region = getTargetRegion(
      this.settings.values.autoHost.regionChangeTimeEU,
      this.settings.values.autoHost.regionChangeTimeNA
    );
    if (region !== this.clientState.values.vpnActive) {
      if (this.clientState.values.vpnActive) {
        this.info("Turning off " + this.clientState.values.vpnActive + " OpenVPN");
        exec(`"${this.settings.values.autoHost.openVPNPath}" --command disconnect_all`);
        this.clientState.values.vpnActive = false;
        await sleep(1500);
        return await this.enableVPN(region);
      } else {
        this.verbose("No OpenVPN currently active.");
        return await this.enableVPN(region);
      }
    } else {
      return true;
    }
  }

  async enableVPN(region: "eu" | "us"): Promise<boolean> {
    if (region === "eu") {
      if (this.settings.values.autoHost.regionChangeOpenVPNConfigEU) {
        this.info("Turning on EU OpenVPN");
        exec(
          `"${this.settings.values.autoHost.openVPNPath}" --command connect ${this.settings.values.autoHost.regionChangeOpenVPNConfigEU} --silent_connection 1`
        );
        if (await this.checkForIPChange()) {
          this.clientState.values.vpnActive = "eu";
          this.info("EU VPN successfully enabled");
          return true;
        } else {
          this.error("Something went wrong setting up OpenVPN EU.");
          return false;
        }
      } else {
        return true;
      }
    } else if (region === "us") {
      if (this.settings.values.autoHost.regionChangeOpenVPNConfigNA) {
        this.info("Turning on US OpenVPN");
        exec(
          `"${this.settings.values.autoHost.openVPNPath}" --command connect ${this.settings.values.autoHost.regionChangeOpenVPNConfigNA} --silent_connection 1`
        );
        if (await this.checkForIPChange()) {
          this.clientState.values.vpnActive = "us";
          this.info("US VPN successfully enabled");
          return true;
        } else {
          this.error("Something went wrong setting up OpenVPN US.");
          return false;
        }
      } else {
        return true;
      }
    }
    return false;
  }

  async checkForIPChange(callNumber: number = 0): Promise<boolean> {
    let newIP = await this.clientState.getPublicIP();
    if (newIP.current) {
      return true;
    } else if (callNumber > 10) {
      return false;
    } else {
      await sleep(500);
      callNumber++;
      return await this.checkForIPChange(callNumber);
    }
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
              if (this.settings.values.autoHost.minPlayers > 0) {
                text += ` I will start with ${this.settings.values.autoHost.minPlayers} players.`;
              } else {
                text += " I will start when slots are full.";
              }
            }
            if (this.settings.values.autoHost.voteStart) {
              text += " You can vote start with ?votestart";
            }
            if (this.settings.values.autoHost.regionChangeType) {
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
