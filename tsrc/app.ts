import { screen, keyboard } from "@nut-tree/nut-js";
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

import { settings, SettingsUpdates } from "./globals/settings";
import { gameState, GameState } from "./globals/gameState";
import { gameSocket } from "./globals/gameSocket";
import { logger } from "./globals/logger";
import { clientState, ClientState } from "./globals/clientState";
import { warControl } from "./globals/warControl";

import { administration } from "./modules/administration";
import { autoHost } from "./modules/autoHost";
import { chatHandler } from "./modules/chatHandler";
import { commServer } from "./modules/comm";
import { discordBot } from "./modules/discordBot";
import { discordRPC } from "./modules/discordRPC";
import { HubSingle } from "./modules/hub";
import { lobbyControl } from "./modules/lobbyControl";
import { obsSocketSingle } from "./modules/obs";
import { performanceMode } from "./modules/performanceMode";
import { protocolHandler } from "./modules/protocolHandler";
import { replayHandler } from "./modules/replayHandler";
import { SEClientSingle } from "./modules/stream";
import { monitor } from "./modules/antiCrash";

import type { EmitEvents } from "./moduleBasePre";

if (!app.isPackaged) {
  require("electron-reload")(__dirname, {
    electron: join(__dirname, "../node_modules", ".bin", "electron.cmd"),
    awaitWriteFinish: true,
  });
}
import { WindowSend, WindowReceive, BanWhiteList } from "./utility";
import { LobbyUpdatesExtended } from "./modules/lobbyControl";

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  if (app.getVersion().includes("beta")) {
    settings.updateSettings({ client: { releaseChannel: "beta" } });
  } else if (app.getVersion().includes("alpha")) {
    settings.updateSettings({ client: { releaseChannel: "alpha" } });
  }
  autoUpdater.channel = settings.values.client.releaseChannel;
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
    administration,
    autoHost,
    chatHandler,
    commServer,
    discordBot,
    discordRPC,
    HubSingle,
    lobbyControl,
    obsSocketSingle,
    performanceMode,
    protocolHandler,
    replayHandler,
    SEClientSingle,
    monitor,
  ];

  settings.on("settingsUpdates", (newSettings: SettingsUpdates) => {
    sendWindow({ globalUpdate: { settings: newSettings } });
    if (newSettings.client?.releaseChannel) {
      autoUpdater.channel = newSettings.client.releaseChannel;
      autoUpdater.checkForUpdatesAndNotify();
    }
  });
  gameState.on("gameStateUpdates", (gameState: Partial<GameState>) =>
    sendWindow({ globalUpdate: { gameState } })
  );
  clientState.on("clientStateUpdates", (clientState: Partial<ClientState>) =>
    sendWindow({ globalUpdate: { clientState } })
  );

  lobbyControl.on("lobbyUpdate", (lobbyUpdate: LobbyUpdatesExtended) =>
    sendWindow({
      legacy: { messageType: "lobbyUpdate", data: { lobbyData: lobbyUpdate } },
    })
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
    discordBot.lobbyClosed();
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
    discordBot.lobbyClosed();
    if (process.platform !== "darwin") {
      app.quit();
    }
  });

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });

  function playSound(file: string) {
    if (!app.isPackaged) {
      play(join(__dirname, "sounds\\" + file));
    } else {
      play(join(app.getAppPath(), "\\src\\sounds\\" + file));
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
            administration.addAdmin(args.perm.player, "client", "client", args.perm.role);
          } else if (!args.perm.role) {
            administration.removeAdmin(args.perm.player, "client");
          }
        } else {
          log.info("No player in perm");
        }
        break;
      case "addWhiteBan":
        if (args.addWhiteBan) {
          if (args.addWhiteBan.type === "banList") {
            administration.banPlayer(
              args.addWhiteBan.player,
              "client",
              "client",
              args.addWhiteBan.reason
            );
          } else if (args.addWhiteBan.type === "whiteList") {
            administration.whitePlayer(
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
            administration.unBanPlayer(args.removeWhiteBan.player, "client");
          } else if (args.removeWhiteBan.type === "whiteList") {
            administration.unWhitePlayer(args.removeWhiteBan.player, "client");
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
          const whiteBanList = administration.fetchList(args.fetch);
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
            }
          })
          .catch((err) => {
            log.warn(err.message, err.stack);
          });
        break;
      case "getOpenVPNPath":
        dialog
          .showOpenDialog(win, {
            title: "Choose OpenVPN-GUI Executable",
            defaultPath: `C:\\Program Files\\OpenVPN\\bin`,
            properties: ["openFile"],
            filters: [{ name: "openvpn-gui", extensions: ["exe"] }],
          })
          .then((result) => {
            if (!result.canceled) {
              let pathChosen = result.filePaths[0].replace(/\\/g, "/");
              let executableName = pathChosen.split("/").pop();
              if (executableName !== "openvpn-gui.exe") {
                log.warn("Possibly wrong OpenVpn executable chosen.");
              }
              settings.updateSettings({ autoHost: { openVPNPath: pathChosen } });
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
          let list = administration.fetchList({ type: args.exportImport.type });
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
                    administration.banPlayer(
                      ban.username,
                      "client",
                      ban.region || "client",
                      ban.reason
                    );
                  } else if (args.exportImport?.type === "whiteList") {
                    administration.whitePlayer(
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
      discordBot.lobbyEnded(command.mmdResults);
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
          if (!update.leftLobby) {
            gameState.updateGameState({ action: "waitingInLobby" });
          }
        }
      }
    }
  }
}
