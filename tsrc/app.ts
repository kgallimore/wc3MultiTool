import { screen, keyboard, Point, mouse, straightTo } from "@nut-tree/nut-js";
require("@nut-tree/nl-matcher");
import {
  app,
  BrowserWindow,
  Tray,
  Menu,
  ipcMain,
  globalShortcut,
  dialog,
  shell,
  Notification,
} from "electron";
import { autoUpdater } from "electron-updater";
import * as log from "electron-log";
import { join } from "path";
import Store from "electron-store";
import {
  existsSync,
  readFileSync,
  rmSync,
  copyFileSync,
  mkdirSync,
  writeFileSync,
} from "fs";
import { play } from "sound-play";
import { discSingle } from "./modules/disc";
import { discRPCSingle } from "./modules/discordRPC";
import { warControl } from "./globals/warControl";
import { HubSingle } from "./modules/hub";
import { obsSocketSingle } from "./modules/obs";
import { SEClientSingle } from "./modules/stream";
import { performanceMode } from "./modules/performanceMode";
import { banWhiteListSingle } from "./modules/administration";
import { autoHost } from "./modules/autoHost";
import { protocolHandler } from "./modules/protocolHandler";
import { lobbyControl } from "./modules/lobbyControl";
import { replayHandler } from "./modules/replayHandler";

import type { EmitEvents } from "./moduleBasePre";

if (!app.isPackaged) {
  require("electron-reload")(__dirname, {
    electron: join(__dirname, "../node_modules", ".bin", "electron.cmd"),
    awaitWriteFinish: true,
  });
}
import { WindowSend, WindowReceive, BanWhiteList } from "./utility";

import { settings, SettingsUpdates } from "./globals/settings";
import { gameState, GameState } from "./globals/gameState";
import { webUISocket, WebUIEvents } from "./globals/webUISocket";
import { gameSocket } from "./globals/gameSocket";
import { clientState, ClientState } from "./globals/clientState";

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  autoUpdater.logger = log;
  log.catchErrors();

  screen.config.confidence = 0.8;
  keyboard.config.autoDelayMs = 25;

  if (!app.isPackaged) {
    screen.config.autoHighlight = true;
    screen.config.highlightDurationMs = 1500;
    screen.config.highlightOpacity = 0.75;
  }

  log.info("App starting...");

  const store = new Store();

  const wc3mtTargetFile = `${app.getPath(
    "documents"
  )}\\Warcraft III\\CustomMapData\\wc3mt.txt`;

  var win: BrowserWindow;
  var appIcon: Tray | null;

  var warInstallLoc: string = store.get("warInstallLoc") as string;
  if (!warInstallLoc || warInstallLoc.includes(".exe")) {
    let data = readFileSync("warInstallLoc.txt");
    {
      warInstallLoc = data.toString();
      if (existsSync(warInstallLoc + "\\_retail_\\x86_64\\Warcraft III.exe")) {
        store.set("warInstallLoc", warInstallLoc);
      } else {
        // TODO this needs to be checked to make sure it doesn't mess with WarSingle. Also creating a temp window seems like a bad idea
        let tempWindow = new BrowserWindow();
        dialog
          .showOpenDialog(tempWindow, {
            title: "Please Choose Warcraft III Launcher.exe",
            defaultPath: `C:\\Program Files (x86)`,
            properties: ["openFile"],
            filters: [{ name: "Warcraft 3 Executable", extensions: ["exe"] }],
          })
          .then((result) => {
            tempWindow.close();
            if (!result.canceled) {
              if (result.filePaths[0].includes("Warcraft III")) {
                warInstallLoc = result.filePaths[0].split(
                  /(\\*|\/*)Warcraft III[^\\\/]*\.exe/
                )[0];
                log.info(`Change install location to ${warInstallLoc}`);
                store.set("warInstallLoc", warInstallLoc);
              } else {
                log.warn("Invalid Warcraft file?");
              }
            }
          })
          .catch((err) => {
            log.warn(err.message, err.stack);
          });
      }
    }
  }

  let modules = [
    discSingle,
    lobbyControl,
    discRPCSingle,
    HubSingle,
    obsSocketSingle,
    SEClientSingle,
    performanceMode,
    protocolHandler,
    autoHost,
    replayHandler,
  ];

  webUISocket.on("webUIEvent", (data: WebUIEvents) => sendWindow);

  settings.on("settingsUpdates", (newSettings: SettingsUpdates) =>
    sendWindow({ globalUpdate: { settings: newSettings } })
  );
  gameState.on("gameStateUpdates", (gameState: Partial<GameState>) =>
    sendWindow({ globalUpdate: { gameState } })
  );
  clientState.on("clientStateUpdates", (clientState: Partial<ClientState>) =>
    sendWindow({ globalUpdate: { clientState } })
  );

  app.setAsDefaultProtocolClient("wc3mt");

  app.on("open-url", function (event, url) {
    if (url.substring(0, 5) === "wc3mt") {
      event.preventDefault();
      protocolHandler.processURL(url);
      log.info("Handling Protocol Once Ready");
    }
  });

  app.on("second-instance", (event, args) => {
    if (args[2] && args[2].substring(0, 5) === "wc3mt") {
      log.info("Handling Protocol Now");
      protocolHandler.processURL(args[2]);
    }
  });

  app.on("before-quit", () => {
    HubSingle.sendToHub({ lobbyUpdates: { leftLobby: true } });
    discSingle.lobbyClosed();
    lobbyControl.clear();
  });

  ipcMain.on("toMain", (event, args: WindowSend) => {
    commandClient(args);
  });

  autoUpdater.on("checking-for-update", () => {});
  autoUpdater.on("update-available", (info) => {
    log.info("Update available");
  });
  autoUpdater.on("update-not-available", (info) => {});
  autoUpdater.on("error", (err) => {
    new Notification({
      title: "Update Error",
      body: "There was an error with the auto updater!",
    }).show();
    log.warn(err);
    sendWindow({
      legacy: { messageType: "updater", data: { value: "Update error! Check logs." } },
    });
  });
  autoUpdater.on("download-progress", (progressObj) => {
    let log_message = "Download speed: " + progressObj.bytesPerSecond;
    log_message = log_message + " - Downloaded " + progressObj.percent + "%";
    log_message =
      log_message + " (" + progressObj.transferred + "/" + progressObj.total + ")";
    sendWindow({ legacy: { messageType: "updater", data: { value: log_message } } });
  });
  autoUpdater.on("update-downloaded", (info) => {
    log.info("Update downloaded");

    if (settings.values.client.restartOnUpdate) {
      new Notification({
        title: "Update Downloaded",
        body: "The latest version has been downloaded and will now be installed.",
      }).show();
      autoUpdater.quitAndInstall(true, true);
    } else {
      new Notification({
        title: "Update Downloaded",
        body: "The latest version has been downloaded. Please restart the app",
      }).show();
      sendWindow({
        legacy: {
          messageType: "updater",
          data: { value: "Update downloaded. Please restart the app." },
        },
      });
    }
  });

  const createWindow = () => {
    win = new BrowserWindow({
      width: 600,
      height: 800,
      title: "WC3 MultiTool v" + app.getVersion(),
      show: false,
      icon: join(__dirname, "images/wc3_auto_balancer_v2.png"),
      webPreferences: {
        preload: join(__dirname, "preload.js"),
        nodeIntegration: false,
        contextIsolation: true,
      },
    });
    win.setMenuBarVisibility(false);
    const contextMenu = Menu.buildFromTemplate([
      {
        label: "Show App",
        click: function () {
          if (appIcon) {
            appIcon.destroy();
            appIcon = null;
            win.show();
          }
        },
      },
      {
        label: "Quit",
        click: function () {
          app.quit();
        },
      },
    ]);
    win.once("ready-to-show", () => {
      sendWindow({
        init: {
          settings: settings.values,
          gameState: gameState.values,
          clientState: clientState.values,
        },
      });
      win.show();
    });
    win.on("minimize", function (event: any) {
      event.preventDefault();
      appIcon = new Tray(join(__dirname, "images/wc3_auto_balancer_v2.png"));

      appIcon.setContextMenu(contextMenu);

      new Notification({
        title: "Still Running",
        body: "WC3 MultiTool will keep running in your taskbar",
      }).show();
      win.hide();
    });
    win.loadFile(join(__dirname, "../public/index.html"));
  };

  app.on("ready", function () {
    if (app.isPackaged) {
      setInterval(() => {
        if (settings.values.client.checkForUpdates) {
          autoUpdater.checkForUpdatesAndNotify();
        }
      }, 30 * 60 * 1000);
    }
    log.info("App ready");

    if (existsSync(wc3mtTargetFile)) {
      log.info("Removing leftover file");
      rmSync(wc3mtTargetFile);
    }

    initModules();

    globalShortcut.register("Alt+CommandOrControl+O", () => {});
    createWindow();

    if (settings.values.client.checkForUpdates) {
      autoUpdater.checkForUpdatesAndNotify();
    }

    if (process.argv[1] && process.argv[1] !== ".") {
      setTimeout(() => {
        protocolHandler.processURL(process.argv[1]);
      }, 3000);
    } else if (settings.values.client.openWarcraftOnStart) {
      setTimeout(warControl.openWarcraft, 3000);
    }
  });

  app.on("window-all-closed", () => {
    HubSingle.sendToHub({ lobbyUpdates: { leftLobby: true } });
    discSingle.lobbyClosed();
    lobbyControl?.clear();
    if (process.platform !== "darwin") {
      app.quit();
    }
  });

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });

  async function handleGlueScreen(newScreen: GameState["menuState"]) {
    // Create a new game at menu or if previously in game(score screen loads twice)
    // TODO: Keep tack of previous score screen for above note.
    if (
      !newScreen ||
      newScreen === "null" ||
      (newScreen === gameState.values.menuState && newScreen !== "SCORE_SCREEN")
    ) {
      return;
    }
    log.info("Screen changed to: ", newScreen);
    if (["CUSTOM_LOBBIES", "MAIN_MENU"].includes(newScreen)) {
      log.info("Checking to see if we should auto host or join a lobby link.");
      if (gameState.values.openLobbyParams.lobbyName) {
        setTimeout(protocolHandler.openParamsJoin, 250);
      } else {
        setTimeout(autoHost.autoHostGame, 250);
      }
    } else if (newScreen === "LOADING_SCREEN") {
      if (settings.values.autoHost.type === "rapidHost") {
        if (settings.values.autoHost.rapidHostTimer === 0) {
          log.info("Rapid Host leave game immediately");
          lobbyControl.leaveGame();
        } else if (settings.values.autoHost.rapidHostTimer === -1) {
          log.info("Rapid Host exit game immediately");
          await warControl.forceQuitWar();
          warControl.openWarcraft();
        }
      }
    } else if (
      gameState.values.menuState === "LOADING_SCREEN" &&
      newScreen === "SCORE_SCREEN"
    ) {
      log.info("Game has finished loading in.");
      gameState.updateGameState({ inGame: true, action: "waitingToLeaveGame" });
      if (settings.values.autoHost.type === "smartHost") {
        log.info("Setting up smart host.");
        setTimeout(() => autoHost.smartQuit(), 15000);
      }
      if (
        settings.values.autoHost.type === "rapidHost" &&
        settings.values.autoHost.rapidHostTimer > 0
      ) {
        log.info(
          "Setting rapid host timer to " + settings.values.autoHost.rapidHostTimer
        );
        setTimeout(
          () => lobbyControl.leaveGame,
          settings.values.autoHost.rapidHostTimer * 1000 * 60
        );
      }
      let screenHeight = await screen.height();
      let safeZone = new Point(
        (await screen.width()) / 2,
        screenHeight - screenHeight / 4
      );
      await mouse.move(straightTo(safeZone));
      warControl.sendInGameChat("");
    } else if (newScreen === "LOGIN_DOORS") {
      if (settings.values.client.performanceMode) {
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
            gameSocket.sendMessage({ [message]: {} });
          }, 50 * index);
        });
      }
    }
    gameState.updateGameState({ menuState: newScreen });
    sendWindow({
      legacy: {
        messageType: "menusChange",
        data: { value: gameState.values.menuState },
      },
    });
  }

  function playSound(file: string) {
    if (!app.isPackaged) {
      play(join(__dirname, "sounds\\" + file));
    } else {
      play(join(app.getAppPath(), "\\src\\sounds\\" + file));
    }
  }

  function clearLobby() {
    // TODO: fix lobby close if game was started
    if (
      gameState.values.menuState !== "LOADING_SCREEN" &&
      lobbyControl.microLobby?.lobbyStatic.lobbyName
    ) {
      sendWindow({
        legacy: {
          messageType: "lobbyUpdate",
          data: { lobbyData: { leftLobby: true } },
        },
      });
      HubSingle.sendToHub({ lobbyUpdates: { leftLobby: true } });
    }
  }

  function sendWindow(data: WindowReceive) {
    if (win?.webContents) {
      win.webContents.send("fromMain", data);
    }
  }

  function commandClient(args: WindowSend) {
    switch (args.messageType) {
      case "changePerm":
        if (args.perm?.player) {
          if (args.perm.role === "moderator" || args.perm.role === "admin") {
            banWhiteListSingle.addAdmin(
              args.perm.player,
              "client",
              "client",
              args.perm.role
            );
          } else if (!args.perm.role) {
            banWhiteListSingle.removeAdmin(args.perm.player, "client");
          }
        } else {
          log.info("No player in perm");
        }
        break;
      case "addWhiteBan":
        if (args.addWhiteBan) {
          if (args.addWhiteBan.type === "banList") {
            banWhiteListSingle.banPlayer(
              args.addWhiteBan.player,
              "client",
              "client",
              args.addWhiteBan.reason
            );
          } else if (args.addWhiteBan.type === "whiteList") {
            banWhiteListSingle.whitePlayer(
              args.addWhiteBan.player,
              "client",
              "client",
              args.addWhiteBan.reason
            );
          }
        }
        break;
      case "removeWhiteBan":
        if (args.removeWhiteBan) {
          if (args.removeWhiteBan.type === "banList") {
            banWhiteListSingle.unBanPlayer(args.removeWhiteBan.player, "client");
          } else if (args.removeWhiteBan.type === "whiteList") {
            banWhiteListSingle.unWhitePlayer(args.removeWhiteBan.player, "client");
          }
        }
        break;
      case "init":
        sendWindow({
          init: {
            settings: settings.values,
            gameState: gameState.values,
            clientState: clientState.values,
          },
        });
        if (lobbyControl.microLobby) {
          sendWindow({
            legacy: {
              messageType: "lobbyUpdate",
              data: {
                lobbyData: { newLobby: lobbyControl.microLobby?.exportMin() },
              },
            },
          });
        }
        break;
      case "openLogs":
        shell.openPath(log.transports.file.getFile().path);
        break;
      case "openWar":
        warControl.openWarcraft();
        break;
      case "fetchWhiteBanList":
        if (args.fetch) {
          const whiteBanList = banWhiteListSingle.fetchList(args.fetch);
          sendWindow({
            legacy: {
              messageType: "fetchedWhiteBanList",
              data: {
                fetched: {
                  type: args.fetch.type,
                  list: whiteBanList,
                  page: args.fetch.page ?? 0,
                },
              },
            },
          });
        }
        break;
      case "getMapPath":
        dialog
          .showOpenDialog(win, {
            title: "Choose Map",
            defaultPath: `${app.getPath("home")}\\Documents\\Warcraft III\\Maps`,
            properties: ["openFile"],
            filters: [{ name: "Warcraft 3 Map", extensions: ["w3m", "w3x"] }],
          })
          .then((result) => {
            if (!result.canceled) {
              let newMapPath = result.filePaths[0].replace(/\\/g, "/");
              let mapName = newMapPath.split("/").pop();
              if (!newMapPath.includes("/Maps/")) {
                log.info("Map path is potentially dangerous.");
                let copyDir = `${app
                  .getPath("home")
                  .replace(/\\/g, "/")}/Documents/Warcraft III/Maps/MultiTool/`;
                if (!existsSync(copyDir)) {
                  mkdirSync(copyDir);
                }
                newMapPath = copyDir + mapName;
                try {
                  if (!existsSync(newMapPath)) {
                    log.info("Copying map to safe path.");
                    copyFileSync(result.filePaths[0], newMapPath);
                  } else {
                    log.info("Map already exists, not copying.");
                  }
                } catch (e) {
                  log.warn(e);
                  return;
                }
              }
              settings.updateSettings({ autoHost: { mapPath: newMapPath } });
              log.info(`Change map to ${settings.values.autoHost.mapPath}`);
              if (mapName) {
                mapName = mapName.substring(0, mapName.length - 4);
                settings.updateSettings({ autoHost: { mapName } });
                lobbyControl
                  .eloMapName(settings.values.autoHost.mapName, settings.values.elo.type)
                  .then((data) => {
                    settings.updateSettings({
                      elo: { available: data.elo, lookupName: data.name },
                    });
                  });
              }
            }
          })
          .catch((err) => {
            log.warn(err.message, err.stack);
          });
        break;
      case "updateSettingSingle":
        // TODO: Update this to new update system
        let update = args.update;
        if (update) {
          settings.updateSettings(update);
        }
        break;
      case "autoHostLobby":
        log.info("Comm AutoHost lobby");
        autoHost.autoHostGame(true);
        break;
      case "exportWhitesBans":
        if (args.exportImport) {
          let list = banWhiteListSingle.fetchList({ type: args.exportImport.type });
          if (args.exportImport.type === "banList") {
            let path = app.getPath("documents") + "\\bans.json";
            writeFileSync(path, JSON.stringify(list));
            console.log(path);
            shell.showItemInFolder(path);
          } else if (args.exportImport.type === "whiteList") {
            let path = app.getPath("documents") + "\\whiteList.json";
            writeFileSync(path, JSON.stringify(list));
            console.log(path);
            shell.showItemInFolder(path);
          }
        }
        break;
      case "importWhitesBans":
        if (args.exportImport) {
          dialog
            .showOpenDialog(win, {
              title: "Choose List",
              defaultPath: `${app.getPath("downloads")}`,
              properties: ["multiSelections"],
              filters: [{ name: "Ban List", extensions: ["json"] }],
            })
            .then((result) => {
              result.filePaths.forEach((file) => {
                let bans = JSON.parse(readFileSync(file).toString());
                bans.forEach((ban: BanWhiteList) => {
                  if (args.exportImport?.type === "banList") {
                    banWhiteListSingle.banPlayer(
                      ban.username,
                      "client",
                      ban.region || "client",
                      ban.reason
                    );
                  } else if (args.exportImport?.type === "whiteList") {
                    banWhiteListSingle.whitePlayer(
                      ban.username,
                      "client",
                      ban.region || "client",
                      ban.reason
                    );
                  }
                });
              });
            });
        }
        break;
      default:
        log.info("Unknown client command:", args);
        break;
    }
  }

  function initModules() {
    modules.forEach((module) => {
      module.on("event", moduleHandler);
    });
  }

  function moduleHandler(command: EmitEvents) {
    if (command.notification) {
      new Notification(command.notification).show();
    }
    if (command.sendWindow) {
      sendWindow(command.sendWindow);
    }
    if (command.playSound) {
      playSound(command.playSound);
    }
    if (command.mmdResults) {
      discSingle.lobbyEnded(command.mmdResults);
    }
    if (command.lobbyUpdate) {
      // TODO Move the below code to the module system.
      let update = command.lobbyUpdate;
      if (lobbyControl.microLobby) {
        if (
          update.playerPayload ||
          update.playerData ||
          update.newLobby ||
          update.leftLobby
        ) {
          if (update.leftLobby) {
            clearLobby();
          } else {
            gameState.updateGameState({ action: "waitingInLobby" });
          }
          sendWindow({
            legacy: { messageType: "lobbyUpdate", data: { lobbyData: update } },
          });
          HubSingle.sendToHub({ lobbyUpdates: update });
          if (settings.values.obs.textSource) {
            writeFileSync(
              join(app.getPath("documents"), "wc3mt.txt"),
              lobbyControl.exportTeamStructureString()
            );
          }
          if (update.playerData) {
            if (update.playerData.extraData) {
              if (settings.values.elo.announce) {
                gameSocket.sendChatMessage(
                  update.playerData.name +
                    " ELO: " +
                    update.playerData.extraData.rating +
                    ", Rank: " +
                    update.playerData.extraData.rank +
                    ", Played: " +
                    update.playerData.extraData.played +
                    ", Wins: " +
                    update.playerData.extraData.wins +
                    ", Losses: " +
                    update.playerData.extraData.losses +
                    ", Last Change: " +
                    update.playerData.extraData.lastChange
                );
              }
            } else {
              log.error("Player data update missing data");
            }
          }
        } else if (update.stale) {
          lobbyControl.leaveGame();
        } else if (update.playerLeft) {
          log.info("Player left: " + update.playerLeft);
        } else if (update.playerJoined) {
          if (update.playerJoined.name) {
            let row = banWhiteListSingle.isBanned(update.playerJoined.name);
            if (row) {
              lobbyControl.banSlot(update.playerJoined.slot);
              gameSocket.sendChatMessage(
                update.playerJoined.name +
                  " is permanently banned" +
                  (row.reason ? ": " + row.reason : "")
              );
              log.info(
                "Kicked " +
                  update.playerJoined.name +
                  " for being banned" +
                  (row.reason ? " for: " + row.reason : "")
              );
              return;
            }
            if (settings.values.autoHost.whitelist) {
              if (
                update.playerJoined.name !== gameState.values.selfBattleTag &&
                !banWhiteListSingle.isWhiteListed(update.playerJoined.name)
              ) {
                lobbyControl.banSlot(update.playerJoined.slot);
                gameSocket.sendChatMessage(
                  update.playerJoined.name + " is not whitelisted"
                );
                log.info(
                  "Kicked " + update.playerJoined.name + " for not being whitelisted"
                );
                return;
              }
            }
            log.info("Player joined: " + update.playerJoined.name);
            autoHost.announcement();
            if (
              settings.values.autoHost.minPlayers !== 0 &&
              lobbyControl.microLobby.nonSpecPlayers.length >=
                settings.values.autoHost.minPlayers
            ) {
              lobbyControl.startGame(settings.values.autoHost.delayStart);
            }
          } else {
            log.warn("Nameless player joined");
          }
        } else if (update.lobbyReady) {
          if (lobbyControl.microLobby.lobbyStatic.isHost) {
            if (settings.values.autoHost.sounds) {
              playSound("ready.wav");
            }
            if (
              settings.values.autoHost.type === "smartHost" ||
              settings.values.autoHost.type === "rapidHost"
            ) {
              clientState.updateClientState({
                currentStep: "Starting Game",
                currentStepProgress: 100,
              });
              if (
                (settings.values.elo.type == "off" ||
                  !settings.values.elo.balanceTeams) &&
                settings.values.autoHost.shufflePlayers
              ) {
                lobbyControl.shufflePlayers();
              }
              // Wait a quarter second to make sure shuffles are done
              setTimeout(() => {
                if (lobbyControl.isLobbyReady()) {
                  lobbyControl.startGame(settings.values.autoHost.delayStart);
                }
              }, 250);
            }
          }
        }
      }
    }
  }
}
