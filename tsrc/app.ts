import {
  screen,
  mouse,
  centerOf,
  imageResource,
  Point,
  Key,
  keyboard,
  straightTo,
} from "@nut-tree/nut-js";
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
  clipboard,
} from "electron";
import { autoUpdater } from "electron-updater";
import fetch from "cross-fetch";
import * as log from "electron-log";
import * as path from "path";
import Store from "electron-store";
import fs from "fs";
import WebSocket from "ws";
import { play } from "sound-play";
import sqlite3 from "better-sqlite3";
import { DisClient } from "./modules/disc";
import { SEClient } from "./modules/stream";
import { LobbyControl } from "./modules/lobbyControl";
import { DiscordRPC } from "./modules/discordRPC";
import { OBSSocket } from "./modules/obs";
import { WarControl } from "./modules/warControl";
import { HubControl } from "./modules/hub";
import type { EmitEvents } from "./moduleBase";
import parser from "w3gjs";
import LanguageDetect from "languagedetect";

const FormData = require("form-data");
const translate = require("translate-google");
if (!app.isPackaged) {
  require("electron-reload")(__dirname, {
    electron: path.join(__dirname, "../node_modules", ".bin", "electron.cmd"),
    awaitWriteFinish: true,
  });
}
import {
  WindowSend,
  GameClientMessage,
  WindowReceive,
  mmdResults,
  getTargetRegion,
  OpenLobbyParams,
  ensureInt,
  BanWhiteList,
} from "./utility";

import { AutoHostSettings, settings, SettingsUpdates } from "./globals/settings";
import { GameState, gameState } from "./globals/gameState";

import {
  GameClientLobbyPayload,
  PlayerData,
  Regions,
  SlotNumbers,
} from "wc3mt-lobby-container";
import { Comm } from "./modules/comm";

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  const db = new sqlite3(app.getPath("userData") + "/wc3mt.db");

  autoUpdater.logger = log;
  log.catchErrors();

  screen.config.confidence = 0.8;
  keyboard.config.autoDelayMs = 25;

  if (!app.isPackaged) {
    screen.config.autoHighlight = true;
    screen.config.highlightDurationMs = 1500;
    screen.config.highlightOpacity = 0.75;
  }

  let detectLang = new LanguageDetect();
  detectLang.setLanguageType("iso2");

  log.info("App starting...");

  const store = new Store();
  const replayFolders: string = path.join(
    app.getPath("documents"),
    "Warcraft III\\BattleNet"
  );

  const wc3mtTargetFile = `${app.getPath(
    "documents"
  )}\\Warcraft III\\CustomMapData\\wc3mt.txt`;

  var win: BrowserWindow;
  var appIcon: Tray | null;
  var currentStatus = false;
  var gameNumber = 0;
  var wss: WebSocket.Server | null = null;
  var webUISocket: WebSocket | null = null;
  var clientWebSocket: WebSocket;
  var voteTimer: NodeJS.Timeout | null;
  var openLobbyParams: OpenLobbyParams | null;
  // Get the tableVersion, if it's not set then we are going to create the most up to date table, so we set it to the most recent version.
  let tableVersion: number = store.get("tableVersion") as number;
  if (!tableVersion) {
    tableVersion = 2;
    store.set("tableVersion", 2);
  }
  var clientState: { tableVersion: number; latestUploadedReplay: number } = {
    tableVersion,
    latestUploadedReplay: (store.get("latestUploadedReplay") as number) ?? 0,
  };
  var sendingInGameChat: { active: boolean; queue: Array<string> } = {
    active: false,
    queue: [],
  };

  var warInstallLoc: string = store.get("warInstallLoc") as string;
  if (!warInstallLoc || warInstallLoc.includes(".exe")) {
    fs.readFile("warInstallLoc.txt", (err, data) => {
      if (err) {
        console.error(err);
        return;
      }
      warInstallLoc = data.toString();
      if (fs.existsSync(warInstallLoc + "\\_retail_\\x86_64\\Warcraft III.exe")) {
        store.set("warInstallLoc", warInstallLoc);
      } else {
        dialog
          .showOpenDialog(win, {
            title: "Please Choose Warcraft III Launcher.exe",
            defaultPath: `C:\\Program Files (x86)`,
            properties: ["openFile"],
            filters: [{ name: "Warcraft 3 Executable", extensions: ["exe"] }],
          })
          .then((result) => {
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
    });
  }

  const lobbyController = new LobbyControl();
  const discRPC = new DiscordRPC();
  const warControl = new WarControl(warInstallLoc, app.getAppPath());
  const discClient = new DisClient();
  const seClient = new SEClient();
  const commClient = new Comm();
  const hubConnection = new HubControl(app.isPackaged, app.getVersion());
  const obsSocket = new OBSSocket();

  let modules = [
    lobbyController,
    discRPC,
    warControl,
    discClient,
    seClient,
    hubConnection,
    obsSocket,
  ];

  screen.height().then((height) => {
    warControl.setResourceDir(height);
  });

  var lastAnnounceTime = 0;
  var sentMessages: Array<String> = [];

  app.setAsDefaultProtocolClient("wc3mt");

  app.on("open-url", function (event, url) {
    if (url.substring(0, 5) === "wc3mt") {
      event.preventDefault();
      protocolHandler(url);
      log.info("Handling Protocol Once Ready");
    }
  });

  app.on("second-instance", (event, args) => {
    if (args[2] && args[2].substring(0, 5) === "wc3mt") {
      log.info("Handling Protocol Now");
      protocolHandler(args[2]);
    }
  });

  app.on("before-quit", () => {
    hubConnection.sendToHub({ lobbyUpdates: { leftLobby: true } });
    discClient?.lobbyClosed();
    lobbyController?.clear();
  });

  async function protocolHandler(url: string) {
    if (url) {
      openLobbyParams = getQueryVariables(url.split("?", 2)[1]);
      if (openLobbyParams.lobbyName || openLobbyParams.gameId) {
        log.info(openLobbyParams);
        if (await warControl.isWarcraftOpen()) {
          if (
            openLobbyParams?.region &&
            openLobbyParams?.region !== gameState.values.selfRegion
          ) {
            log.info(`Changing region to ${openLobbyParams.region}`);
            await exitGame();
            warControl.openWarcraft(openLobbyParams?.region);
          } else {
            openParamsJoin();
          }
        } else {
          log.info(
            "Warcraft is not open, opening. " + openLobbyParams?.region
              ? openLobbyParams?.region
              : ""
          );
          try {
            warControl.openWarcraft(openLobbyParams?.region);
          } catch (e) {
            log.warn(e);
          }
        }
      }
    }
  }

  function getQueryVariables(url: string) {
    var vars = url?.split("&");
    let pairs: { [key: string]: string } = {};
    if (vars) {
      for (var i = 0; i < vars.length; i++) {
        if (vars[i]) pairs[vars[i].split("=")[0]] = decodeURI(vars[i].split("=")[1]);
      }
    }

    return pairs;
  }

  ipcMain.on("toMain", (event, args: WindowSend) => {
    commandClient(args);
  });

  async function eloMapNameCheck(type: "wc3stats" | "pyroTD" | "off", mapName: string) {
    // Clean the name from the map name
    let clean = await lobbyController.eloMapName(mapName);
    settings.updateSettings({
      elo: { lookupName: clean.name, available: clean.elo, wc3StatsVariant: "" },
    });
    if (!clean.elo) {
      if (!settings.values.elo.available) {
        sendWindow("error", {
          error:
            "We couldn't find any ELO data for your map. Please raise an issue on <a href='https://github.com/trenchguns/wc3multitool/issues/new?title=Map%20Request&body=Map%20Name%3A%0A&labels=Map%20Request' class='alert-link'> Github</a> if you think there should be.",
        });
      }
    }
  }

  function togglePerformanceMode(enabled: boolean) {
    if (enabled) {
      if (fs.existsSync(warInstallLoc + "\\_retail_\\webui\\GlueManagerAltered.js")) {
        fs.renameSync(
          warInstallLoc + "\\_retail_\\webui\\GlueManagerAltered.js",
          warInstallLoc + "\\_retail_\\webui\\GlueManagerAltered.js.bak"
        );
      }
    } else {
      if (fs.existsSync(warInstallLoc + "\\_retail_\\webui\\GlueManagerAltered.js.bak")) {
        fs.renameSync(
          warInstallLoc + "\\_retail_\\webui\\GlueManagerAltered.js.bak",
          warInstallLoc + "\\_retail_\\webui\\GlueManagerAltered.js"
        );
      }
    }
  }

  autoUpdater.on("checking-for-update", () => {
    // Do nothing for now
    //log.info("checking-for-update");
  });
  autoUpdater.on("update-available", (info) => {
    // Do nothing for now since update is immediately downloaded
    log.info("Update available");
  });
  autoUpdater.on("update-not-available", (info) => {
    // Do nothing for now
  });
  autoUpdater.on("error", (err) => {
    new Notification({
      title: "Update Error",
      body: "There was an error with the auto updater!",
    }).show();
    log.warn(err);
    sendWindow("updater", { value: "Update error! Check logs." });
  });
  autoUpdater.on("download-progress", (progressObj) => {
    let log_message = "Download speed: " + progressObj.bytesPerSecond;
    log_message = log_message + " - Downloaded " + progressObj.percent + "%";
    log_message =
      log_message + " (" + progressObj.transferred + "/" + progressObj.total + ")";
    sendWindow("updater", { value: log_message });
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
      sendWindow("updater", { value: "Update downloaded. Please restart the app." });
    }
  });

  const createWindow = () => {
    win = new BrowserWindow({
      width: 600,
      height: 800,
      title: "WC3 MultiTool v" + app.getVersion(),
      show: false,
      icon: path.join(__dirname, "images/wc3_auto_balancer_v2.png"),
      webPreferences: {
        preload: path.join(__dirname, "preload.js"),
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
      sendStatus(currentStatus);
      win.show();
    });
    win.on("minimize", function (event: any) {
      event.preventDefault();
      appIcon = new Tray(path.join(__dirname, "images/wc3_auto_balancer_v2.png"));

      appIcon.setContextMenu(contextMenu);

      new Notification({
        title: "Still Running",
        body: "WC3 MultiTool will keep running in your taskbar",
      }).show();
      win.hide();
    });
    win.loadFile(path.join(__dirname, "../public/index.html"));
  };

  app.on("ready", function () {
    togglePerformanceMode(settings.values.client.performanceMode);
    if (app.isPackaged) {
      setInterval(() => {
        if (settings.values.client.checkForUpdates) {
          autoUpdater.checkForUpdatesAndNotify();
        }
      }, 30 * 60 * 1000);
    }
    log.info("App ready");
    db.exec(
      "CREATE TABLE IF NOT EXISTS banList(id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT NOT NULL, add_date DATETIME default current_timestamp NOT NULL, admin TEXT NOT NULL, region TEXT NOT NULL, reason TEXT, removal_date DATETIME)"
    );
    db.exec(
      "CREATE TABLE IF NOT EXISTS whiteList(id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT NOT NULL, add_date DATETIME default current_timestamp NOT NULL, admin TEXT NOT NULL, region TEXT NOT NULL, reason TEXT, removal_date DATETIME)"
    );
    db.exec(
      "CREATE TABLE IF NOT EXISTS lobbyEvents(id INTEGER PRIMARY KEY AUTOINCREMENT, event TEXT NOT NULL, time DATETIME default current_timestamp NOT NULL, data TEXT, username TEXT)"
    );
    db.exec(
      "CREATE TABLE IF NOT EXISTS adminList(id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT NOT NULL, add_date DATETIME default current_timestamp NOT NULL, admin TEXT NOT NULL, region TEXT NOT NULL, role TEXT NOT NULL)"
    );
    if (clientState.tableVersion < 1) {
      log.info("Updating tables");
      try {
        db.exec("ALTER TABLE banList rename to banListBackup");
        db.exec(
          "CREATE TABLE IF NOT EXISTS banList(id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT NOT NULL, add_date DATETIME default current_timestamp NOT NULL, admin TEXT NOT NULL, region TEXT NOT NULL, reason TEXT, removal_date DATETIME)"
        );
        db.exec("INSERT INTO banList SELECT * FROM banListBackup;");
      } catch (e) {
        log.info("Already at table version 1");
      }
      store.set("tableVersion", 1);
      clientState.tableVersion = 1;
    }
    if (clientState.tableVersion < 2) {
      log.info("Updating tables");
      try {
        db.exec("ALTER TABLE whiteList RENAME COLUMN white_date TO add_date");
        db.exec("ALTER TABLE whiteList RENAME COLUMN unwhite_date TO removal_date");
        db.exec("ALTER TABLE banList RENAME COLUMN ban_date TO add_date");
        db.exec("ALTER TABLE banList RENAME COLUMN unban_date TO removal_date");
      } catch (e) {
        log.error("Already at table version 2");
      }
      store.set("tableVersion", 2);
      clientState.tableVersion = 2;
    }
    wss = new WebSocket.Server({ port: 8888 });
    wss.on("connection", function connection(ws) {
      log.info("Connection");
      webUISocket = ws;
      sendSocket("autoHost", settings.values.autoHost);
      sendStatus(true);
      ws.on("message", handleWebUIMessage);
      ws.on("close", function close() {
        log.warn("Socket closed");
        webUISocket = null;
        sendProgress();
        sendStatus(false);
        handleGlueScreen("OUT_OF_MENUS");
      });
    });
    wss.on("error", function (err) {
      if (err.message.includes("EADDRINUSE")) {
        throw new Error(
          "The app may already be open. Check your taskbar or task manager for another instance, or clear port 8888"
        );
      } else {
        log.warn(err.message);
        throw err;
      }
    });
    if (fs.existsSync(wc3mtTargetFile)) {
      log.info("Removing leftover file");
      fs.rmSync(wc3mtTargetFile);
    }

    initModules();

    globalShortcut.register("Alt+CommandOrControl+S", () => {
      sendMessage("PlaySound", { sound: "MenuButtonClick" });
    });
    globalShortcut.register("Alt+CommandOrControl+O", () => {});
    createWindow();

    if (settings.values.client.checkForUpdates) {
      autoUpdater.checkForUpdatesAndNotify();
    }

    if (process.argv[1] && process.argv[1] !== ".") {
      setTimeout(() => {
        protocolHandler(process.argv[1]);
      }, 3000);
    } else if (settings.values.client.openWarcraftOnStart) {
      setTimeout(warControl.openWarcraft, 3000);
    }
  });

  app.on("window-all-closed", () => {
    hubConnection.sendToHub({ lobbyUpdates: { leftLobby: true } });
    discClient?.lobbyClosed();
    lobbyController?.clear();
    if (process.platform !== "darwin") {
      app.quit();
    }
  });

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });

  async function triggerOBS() {
    if (settings.values.obs.enabled) {
      if (settings.values.obs.sceneSwitchType === "hotkeys") {
        if (gameState.values.inGame && settings.values.obs.inGameHotkey) {
          log.info("Triggering OBS In-Game");
          let modifiers: Array<Key> = [];
          if (settings.values.obs.inGameHotkey) {
            if (settings.values.obs.inGameHotkey.altKey) {
              modifiers.push(Key.LeftAlt);
            }
            if (settings.values.obs.inGameHotkey.ctrlKey) {
              modifiers.push(Key.LeftControl);
            }
            if (settings.values.obs.inGameHotkey.shiftKey) {
              modifiers.push(Key.LeftShift);
            }
            try {
              await keyboard.type(
                ...modifiers,
                // @ts-ignore
                Key[settings.values.obs.inGameHotkey.key.toUpperCase()]
              );
            } catch (e) {
              log.warn("Failed to trigger OBS In-Game", e);
            }
          }
        } else if (!gameState.values.inGame && settings.values.obs.outOfGameHotkey) {
          log.info("Triggering OBS Out of Game");
          let modifiers: Array<Key> = [];
          if (settings.values.obs.outOfGameHotkey.altKey) {
            modifiers.push(Key.LeftAlt);
          }
          if (settings.values.obs.outOfGameHotkey.ctrlKey) {
            modifiers.push(Key.LeftControl);
          }
          if (settings.values.obs.outOfGameHotkey.shiftKey) {
            modifiers.push(Key.LeftShift);
          }
          try {
            await keyboard.type(
              ...modifiers,
              // @ts-ignore
              Key[settings.values.obs.outOfGameHotkey.key.toUpperCase()]
            );
          } catch (e) {
            log.warn("Failed to trigger OBS Out of Game", e);
          }
        }
      } else if (settings.values.obs.sceneSwitchType === "websockets") {
        if (obsSocket) {
          if (gameState.values.inGame && settings.values.obs.inGameWSScene) {
            log.info("Triggering OBS In-Game");
            obsSocket.switchScene(settings.values.obs.inGameWSScene);
          } else if (!gameState.values.inGame && settings.values.obs.outOfGameWSScene) {
            log.info("Triggering OBS Out of Game");
            obsSocket.switchScene(settings.values.obs.outOfGameWSScene);
          }
        }
      }
    }
  }

  function sendProgress(step = "Nothing", progress = 0) {
    sendWindow("progress", { progress: { step, progress } });
  }

  function sendStatus(status = false) {
    sendWindow("statusChange", { connected: status });
  }

  async function handleWebUIMessage(message: string) {
    let data = JSON.parse(message) as { messageType: string; data: GameState | any };
    switch (data.messageType) {
      case "state":
        if (typeof data.data !== "string" && data.data.menuState) {
          let newState: GameState = data.data as GameState;
          if (newState.menuState) {
            setTimeout(() => {
              handleGlueScreen(newState.menuState);
              Object.entries(newState).forEach(([key, value]) => {
                // @ts-expect-error
                gameState.values[key] = value;
              });
            }, 250);
          } else {
            Object.entries(newState).forEach(([key, value]) => {
              // @ts-expect-error
              gameState.values[key] = value;
            });
          }
        } else {
          log.warn("New state error: ", data.data);
        }
        break;
      case "sendMessage":
        if (data.data.message === "StopGameAdvertisements") {
          if (
            gameState.values.menuState !== "LOADING_SCREEN" &&
            lobbyController.microLobby?.lookupName
          ) {
            log.info("Re-hosting Stale Lobby");
            sendChatMessage("Re-hosting Stale Lobby");
            leaveGame();
          }
        } else if (
          data.data.message === "ScreenTransitionInfo" &&
          data.data.payload.screen
        ) {
          handleGlueScreen(data.data.payload.screen);
        }
        break;
      case "clientWebSocket":
        handleClientMessage(data);
        break;
      case "toggleAutoHost":
        log.info("Toggling autoHost");
        settings.values.autoHost.type =
          settings.values.autoHost.type === "off" ? "lobbyHost" : "off";
        store.set("autoHost", settings.values.autoHost);
        sendSocket("autoHost", settings.values.autoHost);
      case "error":
        log.warn(data);
        win.webContents.send("fromMain", data);
        break;
      case "echo":
        //log.verbose(data);
        break;
      case "info":
        log.info(JSON.stringify(data.data));
        break;
      default:
        log.info(data);
    }
  }

  async function autoHostGame(override: boolean = false) {
    if (
      settings.values.autoHost.type !== "off" &&
      (!settings.values.client.commAddress || override)
    ) {
      let targetRegion = gameState.values.selfRegion;
      if (settings.values.autoHost.regionChange) {
        targetRegion = getTargetRegion(
          settings.values.autoHost.regionChangeTimeEU,
          settings.values.autoHost.regionChangeTimeNA
        );
      }
      if (
        gameState.values.selfRegion &&
        targetRegion &&
        gameState.values.selfRegion !== targetRegion
      ) {
        log.info(`Changing autohost region to ${targetRegion}`);
        await exitGame();
        warControl.openWarcraft(targetRegion);
        return true;
      } else {
        if (settings.values.autoHost.increment) {
          gameNumber += 1;
        }
        return await createGame();
      }
    }
  }

  async function createGame(
    customGameData:
      | {
          filename: string;
          gameSpeed: number;
          gameName: string;
          mapSettings: {
            flagLockTeams: boolean;
            flagPlaceTeamsTogether: boolean;
            flagFullSharedUnitControl: boolean;
            flagRandomRaces: boolean;
            flagRandomHero: boolean;
            settingObservers: number;
            settingVisibility: number;
          };
          privateGame: boolean;
        }
      | false = false,
    callCount: number = 0,
    lobbyName: string = ""
  ): Promise<boolean> {
    if (!(await warControl.isWarcraftOpen())) {
      await warControl.openWarcraft();
    }
    if (
      !lobbyController.microLobby?.lobbyStatic.lobbyName &&
      !gameState.values.inGame &&
      !["CUSTOM_GAME_LOBBY", "LOADING_SCREEN", "GAME_LOBBY"].includes(
        gameState.values.menuState
      )
    ) {
      gameState.values.action = "creatingLobby";
      if ((callCount + 5) % 10 === 0) {
        if (settings.values.autoHost.increment) {
          if (callCount > 45) {
            return false;
          }
          gameNumber += 1;
          log.warn("Failed to create game. Incrementing game name");
        } else {
          log.warn("Failed to create game. Stopping attempts.");
          return false;
        }
      }
      if (callCount % 10 === 0) {
        lobbyName =
          lobbyName ||
          settings.values.autoHost.gameName +
            (settings.values.autoHost.increment ? ` #${gameNumber}` : "");
        const payloadData = customGameData || {
          filename: settings.values.autoHost.mapPath.replace(/\\/g, "/"),
          gameSpeed: 2,
          gameName: lobbyName,
          mapSettings: {
            flagLockTeams: settings.values.autoHost.advancedMapOptions
              ? settings.values.autoHost.flagLockTeams
              : true,
            flagPlaceTeamsTogether: settings.values.autoHost.advancedMapOptions
              ? settings.values.autoHost.flagPlaceTeamsTogether
              : true,
            flagFullSharedUnitControl: settings.values.autoHost.advancedMapOptions
              ? settings.values.autoHost.flagFullSharedUnitControl
              : false,
            flagRandomRaces: settings.values.autoHost.advancedMapOptions
              ? settings.values.autoHost.flagRandomRaces
              : false,
            flagRandomHero: settings.values.autoHost.advancedMapOptions
              ? settings.values.autoHost.flagRandomHero
              : false,
            settingObservers: parseInt(settings.values.autoHost.observers),
            settingVisibility: settings.values.autoHost.advancedMapOptions
              ? parseInt(settings.values.autoHost.settingVisibility)
              : 0,
          },
          privateGame: settings.values.autoHost.private,
        };
        log.info("Sending autoHost payload", payloadData);
        sendMessage("CreateLobby", payloadData);
      }
      await sleep(1000);
      return await createGame(false, callCount + 1, lobbyName);
    } else if (lobbyController.microLobby?.lobbyStatic.lobbyName === lobbyName) {
      log.info("Game successfully created");
      return true;
    } else if (
      !lobbyController.microLobby?.lobbyStatic.lobbyName.includes(
        settings.values.autoHost.gameName
      )
    ) {
      log.info("Game created with incorrect increment.");
      return true;
    } else {
      log.warn("Failed to create game?");
      return false;
    }
  }

  async function handleGlueScreen(newScreen: GameState["menuState"]) {
    // Create a new game at menu or if previously in game(score screen loads twice)
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
      if (openLobbyParams?.lobbyName) {
        setTimeout(openParamsJoin, 250);
      } else {
        setTimeout(autoHostGame, 250);
      }
    } else if (newScreen === "LOADING_SCREEN") {
      discClient?.lobbyStarted();
      if (settings.values.autoHost.type === "rapidHost") {
        if (settings.values.autoHost.rapidHostTimer === 0) {
          log.info("Rapid Host leave game immediately");
          leaveGame();
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
      gameState.values.inGame = true;
      gameState.values.action = "waitingToLeaveGame";
      if (settings.values.autoHost.type === "smartHost") {
        log.info("Setting up smart host.");
        setTimeout(smartQuit, 15000);
      }
      triggerOBS();
      if (
        settings.values.autoHost.type === "rapidHost" &&
        settings.values.autoHost.rapidHostTimer > 0
      ) {
        log.info(
          "Setting rapid host timer to " + settings.values.autoHost.rapidHostTimer
        );
        setTimeout(leaveGame, settings.values.autoHost.rapidHostTimer * 1000 * 60);
      }
      let screenHeight = await screen.height();
      let safeZone = new Point(
        (await screen.width()) / 2,
        screenHeight - screenHeight / 4
      );
      await mouse.move(straightTo(safeZone));
      sendInGameChat("");
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
        ].forEach(function (message, index) {
          setTimeout(() => {
            sendMessage(message);
            /*if (message === "StopAmbientSound") {
              sendMessage("ScreenTransitionInfo", {
                screen: "LOGIN_DOORS",
                type: "Screen",
                time: Date.now().toString(),
              });
            }*/
          }, 50 * index);
        });
      }
    } else {
      triggerOBS();
      gameState.values.inGame = false;
      gameState.values.action = "nothing";
      if (settings.values.elo.handleReplays) {
        let mostModified = { file: "", mtime: 0 };
        fs.readdirSync(replayFolders, { withFileTypes: true })
          .filter((dirent) => dirent.isDirectory())
          .map((dirent) => dirent.name)
          .forEach((folder) => {
            const targetFile = path.join(
              replayFolders,
              folder,
              "Replays",
              "LastReplay.w3g"
            );
            if (fs.existsSync(targetFile)) {
              const stats = fs.statSync(targetFile);
              if (stats.mtimeMs > mostModified.mtime) {
                mostModified.mtime = stats.mtimeMs;
                mostModified.file = targetFile;
              }
            }
          });
        if (mostModified.file && mostModified.mtime > clientState.latestUploadedReplay) {
          // TODO parse file for results and update discord etc
          analyzeGame(mostModified.file).then((results) => {
            if (discClient) discClient.lobbyEnded(results);
          });
          clientState.latestUploadedReplay = mostModified.mtime;
          store.set("latestUploadedReplay", clientState.latestUploadedReplay);
          if (settings.values.elo.type === "wc3stats") {
            let form = new FormData();
            form.append("replay", fs.createReadStream(mostModified.file));
            fetch(
              `https://api.wc3stats.com/upload${
                settings.values.elo.privateKey ? "/" + settings.values.elo.privateKey : ""
              }?auto=true`,
              {
                method: "POST",
                body: form,
                headers: {
                  ...form.getHeaders(),
                },
              }
            ).then(
              function (response) {
                if (response.status !== 200) {
                  log.info(response.statusText);
                  sendWindow("error", { error: response.statusText });
                } else {
                  log.info("Uploaded replay to wc3stats");
                  sendProgress("Uploaded replay", 0);
                }
              },
              function (error) {
                log.info(error.message);
                sendWindow("error", { error: error.message });
              }
            );
          }
        }
      }
    }
    gameState.values.menuState = newScreen;
    sendWindow("menusChange", { value: gameState.values.menuState });
  }

  function handleClientMessage(message: { data: string }) {
    if (message.data) {
      clientWebSocket = new WebSocket(message.data);
      log.info("Connecting to game client: ", message.data);
      clientWebSocket.on("open", function open() {
        if (openLobbyParams?.lobbyName) {
          openParamsJoin();
        }
      });
      clientWebSocket.on(
        "message",
        function incoming(data: {
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
        }) {
          data = JSON.parse(data.toString());
          switch (data.messageType) {
            case "UpdateScoreInfo":
              autoHostGame();
              break;
            case "ScreenTransitionInfo":
              gameState.values.screenState = data.payload.screen;
              break;
            case "SetGlueScreen":
              if (data.payload.screen) {
                handleGlueScreen(data.payload.screen);
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
                log.info("GameList received, trying to find lobby.");
                handleGameList(data.payload);
              } else {
                handleGlueScreen("CUSTOM_LOBBIES");
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
              if (gameState.values.menuState === "GAME_LOBBY") {
                setTimeout(() => {
                  handleGlueScreen("CUSTOM_LOBBIES");
                }, 1000);
              }
              break;
            case "UpdateUserInfo":
              gameState.values.selfBattleTag = data.payload.user.battleTag;
              gameState.values.selfRegion = data.payload.user.userRegion;
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
      clientWebSocket.on("close", function close() {
        clearLobby();
        log.warn("Game client connection closed!");
        if (settings.values.client.antiCrash) {
          setTimeout(async () => {
            if (await warControl.checkProcess("BlizzardError.exe")) {
              log.warn("Crash detected: BlizzardError.exe is running, restarting.");
              await warControl.forceQuitProcess("BlizzardError.exe");
              warControl.openWarcraft();
            }
          }, 1000);
        }
      });
    }
  }

  async function handleBnetLogin() {
    if (settings.values.client.bnetUsername && settings.values.client.bnetPassword) {
      log.info("Attempting to login to Battle.net.");
      clipboard.writeText(settings.values.client.bnetUsername);
      await keyboard.type(Key.Tab);
      await keyboard.type(Key.LeftControl, Key.V);
      await keyboard.type(Key.Tab);
      clipboard.writeText(settings.values.client.bnetPassword);
      await keyboard.type(Key.LeftControl, Key.V);
      await keyboard.type(Key.Enter);
    }
  }

  function handleGameList(data: {
    games: Array<{ name: string; id: string; mapFile: string }>;
  }) {
    if (data.games && data.games.length > 0) {
      data.games.some((game) => {
        if (openLobbyParams?.lobbyName && game.name === openLobbyParams.lobbyName) {
          log.info("Found game by name");
          sendMessage("JoinGame", {
            gameId: game.id,
            password: "",
            mapFile: game.mapFile,
          });
          return true;
        } else if (openLobbyParams?.gameId && game.id === openLobbyParams.gameId) {
          log.info("Found game by Id");
          sendMessage("JoinGame", {
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

  function clearLobby() {
    // TODO: fix lobby close if game was started
    sentMessages = [];
    if (
      gameState.values.menuState !== "LOADING_SCREEN" &&
      lobbyController.microLobby?.lobbyStatic.lobbyName
    ) {
      sendWindow("lobbyUpdate", { lobbyData: { leftLobby: true } });
      hubConnection.sendToHub({ lobbyUpdates: { leftLobby: true } });
      discClient?.lobbyClosed();
      gameState.values.action = "nothing";
      lobbyController.clear();
    }
  }

  async function openParamsJoin() {
    // TODO: make this more robust
    if (
      openLobbyParams?.lobbyName ||
      (openLobbyParams?.gameId && openLobbyParams.mapFile)
    ) {
      log.info("Setting autoHost to off to join a lobby link.");
      settings.updateSettings({ autoHost: { type: "off" } });
      if (
        (openLobbyParams.region &&
          openLobbyParams.region !== gameState.values.selfRegion) ||
        gameState.values.menuState === "LOADING_SCREEN"
      ) {
        log.info(`Changing region to match lobby of region ${openLobbyParams.region}`);
        await exitGame();
        warControl.openWarcraft(openLobbyParams.region);
        return;
      }
      if (gameState.values.inGame || lobbyController.microLobby?.lookupName) {
        leaveGame();
        return;
      }
      if (openLobbyParams.lobbyName) {
        sendMessage("SendGameListing", {});
        setTimeout(() => {
          sendMessage("GetGameList", {});
        }, 500);
      } else if (openLobbyParams.gameId && openLobbyParams.mapFile) {
        sendMessage("JoinGame", {
          gameId: openLobbyParams.gameId,
          password: "",
          mapFile: openLobbyParams.mapFile,
        });
        openLobbyParams = null;
      }
    }
  }

  async function handleChatMessage(payload: GameClientMessage) {
    // TODO: logging
    if (payload.message?.sender && payload.message.source === "gameChat") {
      if (payload.message.sender.includes("#")) {
        var sender = payload.message.sender;
      } else if (
        gameState.values.selfBattleTag.toLowerCase().includes(payload.message.sender)
      ) {
        var sender = gameState.values.selfBattleTag;
      } else {
        let possiblePlayers = lobbyController.microLobby?.searchPlayer(
          payload.message.sender
        );
        if (possiblePlayers && possiblePlayers.length === 1) {
          var sender = possiblePlayers[0];
        } else {
          log.error(
            `Unknown sender: ${payload.message.sender} for message: ${payload.message.content}`
          );
          return;
        }
      }
      if (sender === gameState.values.selfBattleTag) {
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
        if (!lobbyController.microLobby?.newChat(sender, payload.message.content)) {
          // Filter out repeated messages sent w/in 1 second
          // TODO: more spam filters
          return;
        }
        if (
          sender !== gameState.values.selfBattleTag &&
          payload.message.content.match(/^!debug/)
        ) {
          lobbyController.banPlayer(sender);
        } else if (payload.message.content.match(/^\?votestart$/i)) {
          if (
            settings.values.autoHost.voteStart &&
            lobbyController.voteStartVotes &&
            lobbyController.microLobby?.lobbyStatic.isHost &&
            ["rapidHost", "smartHost"].includes(settings.values.autoHost.type)
          ) {
            if (!lobbyController.microLobby?.allPlayers.includes(sender)) {
              sendChatMessage("Only players may vote start.");
              return;
            }
            if (lobbyController.voteStartVotes.length === 0) {
              if (
                (settings.values.autoHost.voteStartTeamFill &&
                  lobbyController.allPlayerTeamsContainPlayers()) ||
                !settings.values.autoHost.voteStartTeamFill
              ) {
                voteTimer = setTimeout(cancelVote, 60000);
                sendChatMessage("You have 60 seconds to ?votestart.");
              } else {
                sendChatMessage("Unavailable. Not all teams have players.");
                return;
              }
            }
            if (!lobbyController.voteStartVotes.includes(sender) && voteTimer) {
              lobbyController.voteStartVotes.push(sender);
              if (
                lobbyController.voteStartVotes.length >=
                lobbyController.microLobby?.nonSpecPlayers.length *
                  (settings.values.autoHost.voteStartPercent / 100)
              ) {
                log.info("Vote start succeeded");
                startGame();
              } else {
                sendChatMessage(
                  Math.ceil(
                    lobbyController.microLobby?.nonSpecPlayers.length *
                      (settings.values.autoHost.voteStartPercent / 100) -
                      lobbyController.voteStartVotes.length
                  ).toString() + " more vote(s) required."
                );
              }
            }
          }
        } else if (payload.message.content.match(/^\?stats/)) {
          if (
            lobbyController.microLobby?.lobbyStatic?.isHost &&
            settings.values.elo.type !== "off" &&
            lobbyController.microLobby?.statsAvailable
          ) {
            let data: false | PlayerData;
            let playerTarget = payload.message.content.split(" ")[1];
            if (playerTarget) {
              let targets = lobbyController.microLobby?.searchPlayer(playerTarget);
              if (targets.length === 1) {
                sender = targets[0];
                data = lobbyController.getPlayerData(sender);
              } else if (targets.length > 1) {
                sendChatMessage("Multiple players found. Please be more specific.");
                return;
              } else {
                sendChatMessage("No player found.");
                return;
              }
            } else {
              data = lobbyController.getPlayerData(sender);
            }
            if (data) {
              if (!data.extra || data.extra?.rating === -1) {
                sendChatMessage("Data pending");
              } else {
                sendChatMessage(
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
              sendChatMessage("No data available or pending?");
            }
          } else {
            sendChatMessage("Data not available");
          }
        } else if (payload.message.content.match(/^\?sp$/i)) {
          if (
            lobbyController.microLobby?.lobbyStatic.isHost &&
            checkRole(sender, "moderator")
          ) {
            lobbyController.shufflePlayers();
          }
        } else if (payload.message.content.match(/^\?st$/i)) {
          if (
            lobbyController.microLobby?.lobbyStatic?.isHost &&
            checkRole(sender, "moderator")
          ) {
            lobbyController.shufflePlayers(false);
          }
        } else if (payload.message.content.match(/^\?start$/i)) {
          if (
            lobbyController.microLobby?.lobbyStatic.isHost &&
            checkRole(sender, "moderator")
          ) {
            startGame();
          }
        } else if (payload.message.content.match(/^\?a$/i)) {
          if (
            lobbyController.microLobby?.lobbyStatic.isHost &&
            checkRole(sender, "moderator")
          ) {
            cancelStart();
          }
        } else if (payload.message.content.match(/^\?closeall$/i)) {
          if (
            lobbyController.microLobby?.lobbyStatic.isHost &&
            checkRole(sender, "moderator")
          ) {
            sendChatMessage("!closeall");
          }
        } else if (payload.message.content.match(/^\?hold$/i)) {
          if (
            lobbyController.microLobby?.lobbyStatic.isHost &&
            checkRole(sender, "moderator")
          ) {
            let targetPlayer = payload.message.content.split(" ")[1];
            if (targetPlayer) {
              sendChatMessage("!hold " + targetPlayer);
            } else {
              sendChatMessage("Player target required.");
            }
          }
        } else if (payload.message.content.match(/^\?mute$/i)) {
          if (checkRole(sender, "moderator")) {
            let targetPlayer = payload.message.content.split(" ")[1];
            if (targetPlayer) {
              sendChatMessage("!mute " + targetPlayer);
              log.info(sender + " muted " + targetPlayer);
            } else {
              sendChatMessage("Player target required.");
            }
          }
        } else if (payload.message.content.match(/^\?unmute$/i)) {
          if (checkRole(sender, "moderator")) {
            let targetPlayer = payload.message.content.split(" ")[1];
            if (targetPlayer) {
              sendChatMessage("!unmute " + targetPlayer);
              log.info(sender + " unmuted " + targetPlayer);
            } else {
              sendChatMessage("Player target required.");
            }
          }
        } else if (payload.message.content.match(/^\?openall$/i)) {
          if (
            lobbyController.microLobby?.lobbyStatic.isHost &&
            checkRole(sender, "moderator")
          ) {
            sendChatMessage("!openall");
          }
        } else if (payload.message.content.match(/^\?swap/i)) {
          if (
            lobbyController.microLobby?.lobbyStatic.isHost &&
            checkRole(sender, "baswapper")
          ) {
            let [command, ...args] = payload.message.content.split(" ");
            if (args.length === 2) {
              let playerData = lobbyController.microLobby?.getAllPlayerData();
              let tenMinutesAgo = Date.now() - 10 * 60 * 1000;
              if (isInt(args[1], 24, 1) && isInt(args[0], 24, 1)) {
                if (
                  checkRole(sender, "swapper") ||
                  (playerData[
                    lobbyController.microLobby?.slots[parseInt(args[0]) - 1].name
                  ].joinedAt > tenMinutesAgo &&
                    playerData[
                      lobbyController.microLobby?.slots[parseInt(args[1]) - 1].name
                    ].joinedAt > tenMinutesAgo)
                ) {
                  lobbyController.swapPlayers({
                    slots: [
                      ensureInt(args[0]) as SlotNumbers,
                      ensureInt(args[1]) as SlotNumbers,
                    ],
                  });
                } else {
                  sendChatMessage(
                    "You can only swap players who joined within the last 10 minutes."
                  );
                }
              } else if (
                lobbyController.microLobby?.searchPlayer(args[1]).length === 1 &&
                lobbyController.microLobby?.searchPlayer(args[0]).length === 1
              ) {
                if (
                  checkRole(sender, "swapper") ||
                  (playerData[lobbyController.microLobby?.searchPlayer(args[1])[0]]
                    .joinedAt > tenMinutesAgo &&
                    playerData[lobbyController.microLobby?.searchPlayer(args[0])[0]]
                      .joinedAt > tenMinutesAgo)
                ) {
                  lobbyController.swapPlayers({ players: [args[0], args[1]] });
                } else {
                  sendChatMessage(
                    "You can only swap players who joined within the last 10 minutes."
                  );
                }
              } else {
                sendChatMessage("All swap players not found, or too many matches.");
              }
            } else {
              sendChatMessage("Invalid swap arguments");
            }
          }
        } else if (payload.message.content.match(/^\?handi/i)) {
          if (
            lobbyController.microLobby?.lobbyStatic.isHost &&
            checkRole(sender, "moderator")
          ) {
            if (payload.message.content.split(" ").length === 3) {
              var target = payload.message.content.split(" ")[1];
              var handicap = parseInt(payload.message.content.split(" ")[2]);
              if (handicap) {
                if (isInt(target, 24, 1)) {
                  lobbyController.setHandicapSlot(parseInt(target) - 1, handicap);
                } else {
                  lobbyController.setPlayerHandicap(target, handicap);
                }
              } else {
                sendChatMessage("Invalid handicap");
              }
            } else {
              sendChatMessage("Invalid number of arguments");
            }
          }
        } else if (payload.message.content.match(/^\?close/i)) {
          if (
            lobbyController.microLobby?.lobbyStatic.isHost &&
            checkRole(sender, "moderator")
          ) {
            var target = payload.message.content.split(" ")[1];
            if (target) {
              if (isInt(target, 24, 1)) {
                lobbyController.closeSlot(parseInt(target) - 1);
              } else {
                let targets = lobbyController.microLobby?.searchPlayer(target);
                if (targets.length === 1) {
                  lobbyController.closePlayer(targets[0]);
                } else if (targets.length > 1) {
                  sendChatMessage("Multiple matches found. Please be more specific.");
                } else {
                  sendChatMessage("No matches found.");
                }
              }
            } else {
              sendChatMessage("Kick target required");
            }
          }
        } else if (payload.message.content.match(/^\?open/i)) {
          if (
            lobbyController.microLobby?.lobbyStatic.isHost &&
            checkRole(sender, "moderator")
          ) {
            var target = payload.message.content.split(" ")[1];
            if (target) {
              if (isInt(target, 24, 1)) {
                lobbyController.openSlot(parseInt(target) - 1);
              } else {
                let targets = lobbyController.microLobby?.searchPlayer(target);
                if (targets.length === 1) {
                  lobbyController.kickPlayer(targets[0]);
                } else if (targets.length > 1) {
                  sendChatMessage("Multiple matches found. Please be more specific.");
                } else {
                  sendChatMessage("No matches found.");
                }
              }
            } else {
              sendChatMessage("Kick target required");
            }
          }
        } else if (payload.message.content.match(/^\?kick/i)) {
          if (
            lobbyController.microLobby?.lobbyStatic.isHost &&
            checkRole(sender, "moderator")
          ) {
            var target = payload.message.content.split(" ")[1];
            if (target) {
              if (isInt(target, 24, 1)) {
                lobbyController.kickSlot(parseInt(target) - 1);
              } else {
                let targets = lobbyController.microLobby?.searchPlayer(target);
                if (targets.length === 1) {
                  lobbyController.kickPlayer(targets[0]);
                } else if (targets.length > 1) {
                  sendChatMessage("Multiple matches found. Please be more specific.");
                } else {
                  sendChatMessage("No matches found.");
                }
              }
            } else {
              sendChatMessage("Kick target required");
            }
          }
        } else if (payload.message.content.match(/^\?ban/i)) {
          if (
            lobbyController.microLobby?.lobbyStatic.isHost &&
            checkRole(sender, "moderator")
          ) {
            var targetPlayer = payload.message.content.split(" ")[1];
            if (targetPlayer) {
              var reason = payload.message.content.split(" ").slice(2).join(" ") || "";
              if (isInt(targetPlayer, 24, 1)) {
                lobbyController.banSlot(parseInt(targetPlayer) - 1);
                banPlayer(
                  lobbyController.microLobby?.slots[targetPlayer].name,
                  sender,
                  lobbyController.microLobby?.region,
                  reason
                );
              } else {
                if (targetPlayer.match(/^\D\S{2,11}#\d{4,8}$/)) {
                  sendChatMessage("Banning out of lobby player.");
                  banPlayer(
                    targetPlayer,
                    sender,
                    lobbyController.microLobby?.region,
                    reason
                  );
                } else {
                  let targets = lobbyController.microLobby?.searchPlayer(targetPlayer);
                  if (targets.length === 1) {
                    banPlayer(
                      targets[0],
                      sender,
                      lobbyController.microLobby?.region,
                      reason
                    );
                  } else if (targets.length > 1) {
                    sendChatMessage("Multiple matches found. Please be more specific.");
                  } else {
                    sendChatMessage("No matches found.");
                  }
                }
              }
            } else {
              sendChatMessage("Target required");
            }
          }
        } else if (payload.message.content.match(/^\?unban/i)) {
          if (
            lobbyController.microLobby?.lobbyStatic.isHost &&
            checkRole(sender, "moderator")
          ) {
            var target = payload.message.content.split(" ")[1];
            if (target) {
              if (target.match(/^\D\S{2,11}#\d{4,8}$/)) {
                sendChatMessage("Unbanning out of lobby player.");
                unBanPlayer(target, sender);
              } else {
                sendChatMessage("Full battleTag required");
                log.info("Full battleTag required");
              }
            } else {
              sendChatMessage("Ban target required");
              log.info("Ban target required");
            }
          }
        } else if (payload.message.content.match(/^\?white/i)) {
          if (
            lobbyController.microLobby?.lobbyStatic?.isHost &&
            checkRole(sender, "moderator")
          ) {
            var targetPlayer = payload.message.content.split(" ")[1];
            if (targetPlayer) {
              var reason = payload.message.content.split(" ").slice(2).join(" ") || "";
              if (isInt(targetPlayer, 24, 1)) {
                whitePlayer(
                  lobbyController.microLobby?.slots[targetPlayer].name,
                  sender,
                  lobbyController.microLobby?.region,
                  reason
                );
              } else {
                if (targetPlayer.match(/^\D\S{2,11}#\d{4,8}$/)) {
                  sendChatMessage("Whitelisting out of lobby player.");
                  whitePlayer(
                    targetPlayer,
                    sender,
                    lobbyController.microLobby?.region,
                    reason
                  );
                } else {
                  let targets = lobbyController.microLobby?.searchPlayer(targetPlayer);
                  if (targets.length === 1) {
                    whitePlayer(
                      targets[0],
                      sender,
                      lobbyController.microLobby?.region,
                      reason
                    );
                  } else if (targets.length > 1) {
                    sendChatMessage("Multiple matches found. Please be more specific.");
                  } else {
                    sendChatMessage("No matches found.");
                  }
                }
              }
            } else {
              sendChatMessage("Target required");
            }
          }
        } else if (payload.message.content.match(/^\?unwhite/i)) {
          // TODO: In lobby search and removal
          if (
            lobbyController.microLobby?.lobbyStatic.isHost &&
            checkRole(sender, "moderator")
          ) {
            var target = payload.message.content.split(" ")[1];
            if (target) {
              if (target.match(/^\D\S{2,11}#\d{4,8}$/)) {
                sendChatMessage("Un-whitelisting out of lobby player.");
                unWhitePlayer(target, sender);
              } else {
                sendChatMessage("Full battleTag required");
                log.info("Full battleTag required");
              }
            } else {
              sendChatMessage("Un-whitelist target required");
              log.info("Un-whitelist target required");
            }
          }
        } else if (payload.message.content.match(/^\?perm/i)) {
          if (
            lobbyController.microLobby?.lobbyStatic.isHost &&
            checkRole(sender, "admin")
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
                  sendChatMessage("Assigning out of lobby player " + perm + ".");
                  addAdmin(target, sender, lobbyController.microLobby?.region, perm);
                } else {
                  let targets = lobbyController.microLobby?.searchPlayer(target);
                  if (targets.length === 1) {
                    if (
                      addAdmin(
                        targets[0],
                        sender,
                        lobbyController.microLobby?.region,
                        perm
                      )
                    ) {
                      sendChatMessage(targets[0] + " has been promoted to " + perm + ".");
                    } else {
                      sendChatMessage(
                        "Could not promote " + targets[0] + " to " + perm + "."
                      );
                    }
                  } else if (targets.length > 1) {
                    sendChatMessage("Multiple matches found. Please be more specific.");
                  } else {
                    sendChatMessage("No matches found.");
                  }
                }
              } else {
                sendChatMessage("Invalid permission");
              }
            } else {
              sendChatMessage("Target required");
            }
          }
        } else if (payload.message.content.match(/^\?unperm/i)) {
          if (
            lobbyController.microLobby?.lobbyStatic?.isHost &&
            checkRole(sender, "admin")
          ) {
            var target = payload.message.content.split(" ")[1];
            if (target) {
              if (target.match(/^\D\S{2,11}#\d{4,8}$/)) {
                if (removeAdmin(target, sender)) {
                  sendChatMessage("Removed perm from out of lobby player: " + target);
                } else {
                  sendChatMessage(
                    "Could not remove perm from out of lobby player: " + target
                  );
                }
              } else {
                let targets = lobbyController.microLobby?.searchPlayer(target);
                if (targets.length === 1) {
                  if (removeAdmin(targets[0], sender)) {
                    sendChatMessage(targets[0] + " has been demoted.");
                  } else {
                    sendChatMessage(targets[0] + " has no permissions.");
                  }
                } else if (targets.length > 1) {
                  sendChatMessage("Multiple matches found. Please be more specific.");
                } else {
                  sendChatMessage("No matches found.");
                }
              }
            } else {
              sendChatMessage("Target required");
            }
          }
        } else if (payload.message.content.match(/^\?autohost/i)) {
          if (
            lobbyController.microLobby?.lobbyStatic.isHost &&
            checkRole(sender, "admin")
          ) {
            var target = payload.message.content.split(" ")[1];
            if (target) {
              target = target.toLowerCase();
              if (["off", "rapid", "lobby", "smart"].includes(target)) {
                if (target !== "off") {
                  target += "Host";
                }
                sendChatMessage("Setting autohost type to: " + target);
                settings.updateSettings({
                  autoHost: { type: target as AutoHostSettings["type"] },
                });
              } else {
                sendChatMessage("Invalid autohost type");
              }
            } else {
              sendChatMessage("Autohost current type: " + settings.values.autoHost.type);
            }
          } else {
            sendChatMessage("You do not have permission to use this command.");
          }
        } else if (payload.message.content.match(/^\?autostart/i)) {
          if (
            lobbyController.microLobby?.lobbyStatic.isHost &&
            checkRole(sender, "admin")
          ) {
            var target = payload.message.content.split(" ")[1];
            if (target) {
              if (isInt(target, 24, 0)) {
                var startTarget = parseInt(target);
                sendChatMessage("Setting autostart number to: " + startTarget.toString());
                if (settings.values.autoHost.type === "off") {
                  sendChatMessage("Autohost must be enabled to autostart.");
                }
                settings.updateSettings({ autoHost: { minPlayers: startTarget } });
              } else {
                sendChatMessage("Invalid autostart number");
              }
            } else {
              sendChatMessage(
                "Autostart current number: " + settings.values.autoHost.minPlayers
              );
            }
          } else {
            sendChatMessage("You do not have permission to use this command.");
          }
        } else if (payload.message.content.match(/^\?(help)|(commands)/i)) {
          if (lobbyController.microLobby?.lobbyStatic.isHost) {
            if (lobbyController.microLobby?.statsAvailable) {
              sendChatMessage(
                "?stats <?player>: Return back your stats, or target player stats"
              );
            }
            if (
              ["rapidHost", "smartHost"].includes(settings.values.autoHost.type) &&
              settings.values.autoHost.voteStart
            ) {
              sendChatMessage("?voteStart: Starts or accepts a vote to start");
            }
            if (checkRole(sender, "moderator")) {
              sendChatMessage("?a: Aborts game start");
              sendChatMessage("?ban <name|slotNumber> <?reason>: Bans a player forever");
              sendChatMessage(
                "?close<?all> <name|slotNumber>: Closes all / a slot/player"
              );
              sendChatMessage(
                "?handi <name|slotNumber> <50|60|70|80|100>: Sets slot/player handicap"
              );
              sendChatMessage("?hold <name>: Holds a slot");
              sendChatMessage("?kick <name|slotNumber> <?reason>: Kicks a slot/player");
              sendChatMessage("?<un>mute <player>: Mutes/un-mutes a player");
              sendChatMessage(
                "?open<?all> <name|slotNumber> <?reason>: Opens all / a slot/player"
              );
              sendChatMessage("?unban <name>: Un-bans a player");
              sendChatMessage("?white <name>: Whitelists a player");
              sendChatMessage("?unwhite <name>: Un-whitelists a player");
              sendChatMessage("?start: Starts game");
              sendChatMessage("?swap <name|slotNumber> <name|slotNumber>: Swaps players");
              sendChatMessage("?sp: Shuffles players completely randomly");
              sendChatMessage("?st: Shuffles players randomly between teams");
            }
            if (checkRole(sender, "admin")) {
              sendChatMessage(
                "?perm <name> <?admin|mod|swapper>: Promotes a player to a role (mod by default)"
              );
              sendChatMessage("?unperm <name>: Demotes player to normal");
              sendChatMessage(
                "?autohost <?off|rapid|lobby|smart>: Gets/?Sets autohost type"
              );
            }
            sendChatMessage("?help: Shows commands with <required arg> <?optional arg>");
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
              log.error(e);
            }
          }
        }

        if (settings.values.client.translateToLobby && translatedMessage) {
          sendChatMessage(sender + ": " + translatedMessage);
        }

        if (!settings.values.autoHost.private || !app.isPackaged) {
          hubConnection.sendToHub({
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
        if (discClient) {
          discClient.sendMessage(
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

  function banPlayer(
    player: string,
    admin: string,
    region: Regions | "client",
    reason = ""
  ) {
    if (checkRole(admin, "moderator")) {
      if (player.match(/^\D\S{2,11}#\d{4,8}$/i)) {
        db.prepare(
          "INSERT INTO banList (username, admin, region, reason) VALUES (?, ?, ?, ?)"
        ).run(player, admin, region, reason);
        log.info("Banned " + player + " by " + admin + (reason ? " for " + reason : ""));
        sendWindow("action", {
          value: "Banned " + player + " by " + admin + (reason ? " for " + reason : ""),
        });
        if (lobbyController.microLobby?.allPlayers.includes(player)) {
          lobbyController.banPlayer(player);
          sendChatMessage(player + " banned" + (reason ? " for " + reason : ""));
        }
      } else {
        log.warn("Failed to ban, invalid battleTag: " + player);
      }
    }
  }

  function whitePlayer(
    player: string,
    admin: string,
    region: Regions | "client",
    reason = ""
  ) {
    if (checkRole(admin, "moderator")) {
      if (player.match(/^\D\S{2,11}#\d{4,8}$/i)) {
        db.prepare(
          "INSERT INTO whiteList (username, admin, region, reason) VALUES (?, ?, ?, ?)"
        ).run(player, admin, region, reason);
        log.info(
          "Whitelisted " + player + " by " + admin + (reason ? " for " + reason : "")
        );
        sendWindow("action", {
          value:
            "Whitelisted " + player + " by " + admin + (reason ? " for " + reason : ""),
        });
        if (lobbyController.microLobby?.allPlayers.includes(player)) {
          sendChatMessage(player + " whitelisted" + (reason ? " for " + reason : ""));
        }
      } else {
        log.warn("Failed to whitelist, invalid battleTag: " + player);
      }
    }
  }

  function unWhitePlayer(player: string, admin: string) {
    db.prepare(
      "UPDATE whiteList SET removal_date = DateTime('now') WHERE username = ? AND removal_date IS NULL"
    ).run(player);
    log.info("Un-whitelisted " + player + " by " + admin);
    sendWindow("action", { value: "Un-whitelisted " + player + " by " + admin });
  }

  function unBanPlayer(player: string, admin: string) {
    db.prepare(
      "UPDATE banList SET removal_date = DateTime('now') WHERE username = ? AND removal_date IS NULL"
    ).run(player);
    log.info("Unbanned " + player + " by " + admin);
    sendWindow("action", { value: "Unbanned " + player + " by " + admin });
  }

  function addAdmin(
    player: string,
    admin: string,
    region: Regions | "client",
    role: "baswapper" | "swapper" | "moderator" | "admin" = "moderator"
  ) {
    if (checkRole(admin, "admin")) {
      if (["baswapper", "swapper", "moderator", "admin"].includes(role)) {
        if (player.match(/^\D\S{2,11}#\d{4,8}$/i)) {
          if (checkRole(player, "moderator")) {
            db.prepare("UPDATE adminList SET role = ?, admin = ?WHERE username = ?").run(
              role,
              admin,
              player
            );
            log.info("Updated " + player + " to " + role + " by " + admin);
            sendWindow("action", {
              value: "Updated " + player + " to " + role + " by " + admin,
            });
            return true;
          } else {
            db.prepare(
              "INSERT INTO adminList (username, admin, region, role) VALUES (?, ?, ?, ?)"
            ).run(player, admin, region, role);
            log.info("Added " + player + " to " + role + " by " + admin);
            sendWindow("action", {
              value: "Added " + player + " to " + role + " by " + admin,
            });
            return true;
          }
        } else {
          log.info("Failed to add admin, invalid battleTag: " + player);
          return false;
        }
      } else {
        log.info("Failed to add admin, invalid role: " + role);
        return false;
      }
    } else {
      log.info(admin + " is not an admin and can not set perms.");
      return false;
    }
  }

  function removeAdmin(player: string, admin: string) {
    if (checkRole(admin, "admin")) {
      if (player.match(/^\D\S{2,11}#\d{4,8}$/i)) {
        if (checkRole(player, "baswapper")) {
          db.prepare("DELETE FROM adminList WHERE username = ?").run(player);
          log.info("Removed permissions from " + player);
          sendWindow("action", { value: "Removed permissions from " + player });
        } else {
          log.info(player + " is not a moderator");
          return false;
        }
      } else {
        log.warn("Failed to remove admin, invalid battleTag: " + player);
        return false;
      }
      return true;
    }
  }

  function checkRole(
    player: string,
    minPerms: "baswapper" | "swapper" | "moderator" | "admin"
  ) {
    if (!player) return false;
    if (player === gameState.values.selfBattleTag || player === "client") {
      return true;
    }
    const targetRole = db
      .prepare("SELECT role FROM adminList WHERE username = ?")
      .get(player)?.role;
    if (targetRole) {
      if (
        minPerms === "baswapper" &&
        (targetRole === "baswapper" ||
          targetRole === "swapper" ||
          targetRole === "moderator")
      ) {
        return true;
      } else if (
        minPerms === "swapper" &&
        (targetRole === "swapper" || targetRole === "moderator")
      ) {
        return true;
      } else if (minPerms === "moderator" && targetRole === "moderator") {
        return true;
      } else if (targetRole === "admin") {
        return true;
      }
    }
    return false;
  }

  function cancelVote() {
    if (voteTimer) {
      clearTimeout(voteTimer);
      voteTimer = null;
      sendChatMessage("Vote cancelled.");
      log.info("Vote cancelled");
    } else {
      sendChatMessage("Vote timed out.");
      log.info("Vote timed out");
    }
    if (lobbyController) {
      lobbyController.voteStartVotes = [];
    }
  }

  function handleLobbyUpdate(payload: GameClientLobbyPayload) {
    if (payload.teamData.playableSlots > 1) {
      lobbyController.ingestLobby(payload, gameState.values.selfRegion as Regions);
    }
  }

  function cancelStart() {
    log.info("Cancelling start");
    sendMessage("LobbyCancel", {});
  }

  function startGame(delay: number = 0) {
    lobbyController.startGame(delay);
  }

  async function leaveGame() {
    log.info("Leaving Game");
    if (
      gameState.values.inGame ||
      ["GAME_LOBBY", "CUSTOM_GAME_LOBBY"].includes(gameState.values.menuState)
    ) {
      sendMessage("LeaveGame", {});
      if (lobbyController.microLobby?.lobbyStatic?.lobbyName) {
        let oldLobbyName = lobbyController.microLobby?.lobbyStatic.lobbyName;
        await sleep(1000);
        if (lobbyController.microLobby?.lobbyStatic.lobbyName === oldLobbyName) {
          log.info("Lobby did not leave, trying again");
          await exitGame();
          warControl.openWarcraft();
        }
      }
    }
  }

  async function exitGame(callCount: number = 0): Promise<boolean> {
    if (await warControl.isWarcraftOpen()) {
      if (callCount < 5) {
        return await warControl.forceQuitWar();
      } else if (gameState.values.menuState === "LOADING_SCREEN") {
        log.info("Warcraft is loading game, forcing quit");
        return await warControl.forceQuitWar();
      } else {
        log.info("Sending Exit Game");
        sendMessage("ExitGame", {});
        await sleep(200);
        return exitGame(callCount + 1);
      }
    } else {
      log.info("Warcraft is no longer open.");
      return true;
    }
  }

  function isInt(
    string: string,
    max: number | boolean = false,
    min: number | boolean = false
  ): boolean {
    var isInt = /^-?\d+$/.test(string);
    if (isInt) {
      let intTest = parseInt(string);
      if (max !== false && min !== false) {
        return intTest <= max && intTest >= min;
      } else if (max !== false) {
        return intTest <= max;
      } else if (min !== false) {
        return intTest >= min;
      }
    }
    return isInt;
  }

  function announcement() {
    if (
      (gameState.values.menuState === "CUSTOM_GAME_LOBBY" ||
        gameState.values.menuState === "GAME_LOBBY") &&
      lobbyController.microLobby?.lobbyStatic.isHost
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
              lobbyController.microLobby?.statsAvailable &&
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
            sendChatMessage(text);
          }
          if (
            settings.values.autoHost.announceCustom &&
            settings.values.autoHost.customAnnouncement
          ) {
            sendChatMessage(settings.values.autoHost.customAnnouncement);
          }
        } else if (
          settings.values.autoHost.type === "lobbyHost" &&
          settings.values.autoHost.announceCustom &&
          settings.values.autoHost.customAnnouncement
        ) {
          sendChatMessage(settings.values.autoHost.customAnnouncement);
        }
      }
    }
  }

  function sendWindow(
    messageType: WindowReceive["messageType"],
    message: WindowReceive["data"]
  ) {
    commClient.commSend(message);
    if (win?.webContents) {
      win.webContents.send("fromMain", <WindowReceive>{
        messageType: messageType,
        data: message,
      });
    }
  }

  function sendSocket(messageType = "info", data: string | object = "none") {
    if (webUISocket) {
      if (webUISocket.readyState === 1) {
        webUISocket.send(JSON.stringify({ messageType: messageType, data: data }));
      } else if (webUISocket.readyState === 0) {
        setTimeout(() => {
          sendSocket(messageType, data);
        }, 100);
      }
    }
  }

  function playSound(file: string) {
    if (!app.isPackaged) {
      play(path.join(__dirname, "sounds\\" + file));
    } else {
      play(path.join(app.getAppPath(), "\\..\\..\\sounds\\" + file));
    }
  }

  async function smartQuit() {
    if (gameState.values.inGame || gameState.values.menuState === "LOADING_SCREEN") {
      if (fs.existsSync(wc3mtTargetFile)) {
        // The library seems to create the file at the start of the game anyways, so if it is going to be written to, don't do ocr.
        if (
          fs
            .readFileSync(wc3mtTargetFile)
            .toString()
            .match(/wc3mt-GameEnd/)
        ) {
          log.info("Game is over, quitting.");
          fs.rmSync(wc3mtTargetFile);
          leaveGame();
        } else {
          setTimeout(smartQuit, 1000);
        }
      } else {
        findQuit();
      }
    }
  }

  async function findQuit() {
    if (
      (gameState.values.inGame || gameState.values.menuState === "LOADING_SCREEN") &&
      webUISocket?.OPEN
    ) {
      if (await warControl.activeWindowWar()) {
        let foundTarget = false;
        let searchFiles = ["quitNormal.png", "quitHLW.png"];
        for (const file of searchFiles) {
          try {
            const foundImage = await screen.find(imageResource(file));
            if (foundImage) {
              foundTarget = true;
              log.info("Found " + file + ", leaving game.");
              break;
            }
          } catch (e) {
            console.log(e);
          }
        }
        if (foundTarget) {
          leaveGame();
          if (settings.values.autoHost.sounds) {
            playSound("quit.wav");
          }
        } else if (
          !lobbyController.microLobby?.nonSpecPlayers.includes(
            gameState.values.selfBattleTag
          )
        ) {
          if (settings.values.autoHost.leaveAlternate) {
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
              //log.warn(e);
            }
            try {
              const foundImage = await screen.find(imageResource("soloObserver.png"), {
                confidence: 0.8,
              });
              if (foundImage) {
                foundTarget = true;
                log.info("Found soloObserver.png, leaving game.");
              }
            } catch (e) {
              console.log(e);
              //log.warn(e);
            }
            keyboard.type(Key.Escape);
            if (foundTarget) {
              leaveGame();
              if (settings.values.autoHost.sounds) {
                playSound("quit.wav");
              }
            }
            //log.verbose("Did not find quit, try again in 5 seconds");
          } else if (settings.values.obs.autoStream) {
            if (!sendingInGameChat.active) {
              keyboard.type(Key.Space);
            }
          }
        }
      }
      setTimeout(smartQuit, 5000);
    }
  }

  async function analyzeGame(file: string) {
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
    await parse.parse(fs.readFileSync(file));
    return results;
  }

  function sendMessage(message: string, payload: any = "") {
    if (clientWebSocket) {
      if (clientWebSocket.readyState === 1) {
        clientWebSocket.send(JSON.stringify({ message: message, payload: payload }));
      } else if (clientWebSocket.readyState === 0) {
        setTimeout(() => {
          sendMessage(message, payload);
        }, 100);
      }
    }
  }

  function sendChatMessage(content: string) {
    if (
      gameState.values.menuState === "GAME_LOBBY" ||
      gameState.values.menuState === "CUSTOM_GAME_LOBBY"
    ) {
      if (typeof content === "string" && content.length > 0) {
        let newChatSplit = content.match(/.{1,255}/g);
        if (!newChatSplit) {
          log.warn("Could not split chat message into 255 character chunks");
          return;
        }
        sentMessages = sentMessages.concat(newChatSplit);
        newChatSplit.forEach((content) => {
          log.info("Sending chat message: " + content);
          sendMessage("SendGameChatMessage", {
            content,
          });
        });
      }
    }
  }

  async function sleep(milliseconds: number) {
    return new Promise((resolve) => setTimeout(resolve, milliseconds));
  }

  async function sendInGameChat(chat: string) {
    let newChatSplit = chat.match(/.{1,125}/g);
    if (newChatSplit) {
      sendingInGameChat.queue = sendingInGameChat.queue.concat(newChatSplit);
      log.info("Queued chat: " + chat);
    }
    if (sendingInGameChat.active) {
      return;
    }
    await warControl.activeWindowWar();
    try {
      if (gameState.values.inGame && warControl.inFocus) {
        sendingInGameChat.active = true;
        let nextMessage = sendingInGameChat.queue.shift();
        while (nextMessage) {
          if (gameState.values.inGame && warControl.inFocus) {
            log.info("Sending chat: " + nextMessage);
            clipboard.writeText(nextMessage);
            await mouse.leftClick();
            await keyboard.type(Key.LeftShift, Key.Enter);
            await keyboard.type(Key.LeftControl, Key.V);
            await keyboard.type(Key.Enter);
            nextMessage = sendingInGameChat.queue.shift();
          } else {
            log.info(
              "Forced to stop sending messages. In Game: " +
                gameState.values.inGame +
                " Warcraft in focus: " +
                warControl.inFocus
            );
            sendingInGameChat.queue.unshift(nextMessage);
            nextMessage = undefined;
          }
        }
      }
      if (sendingInGameChat.queue.length === 0) {
        log.info("Chat queue now empty.");
      }
      sendingInGameChat.active = false;
      return true;
    } catch (e) {
      log.warn(e);
      sendingInGameChat.active = false;
      return false;
    }
  }

  function commandClient(args: WindowSend) {
    switch (args.messageType) {
      case "changePerm":
        if (args.perm?.player) {
          if (args.perm.role === "moderator" || args.perm.role === "admin") {
            addAdmin(args.perm.player, "client", "client", args.perm.role);
          } else if (!args.perm.role) {
            removeAdmin(args.perm.player, "client");
          }
        } else {
          log.info("No player in perm");
        }
        break;
      case "addWhiteBan":
        if (args.addWhiteBan) {
          if (args.addWhiteBan.type === "banList") {
            banPlayer(
              args.addWhiteBan.player,
              "client",
              "client",
              args.addWhiteBan.reason
            );
          } else if (args.addWhiteBan.type === "whiteList") {
            whitePlayer(
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
            unBanPlayer(args.removeWhiteBan.player, "client");
          } else if (args.removeWhiteBan.type === "whiteList") {
            unWhitePlayer(args.removeWhiteBan.player, "client");
          }
        }
        break;
      case "init":
        sendWindow("updateSettings", { settings: settings.values });
        if (lobbyController.microLobby) {
          sendWindow("lobbyUpdate", {
            lobbyData: { newLobby: lobbyController.microLobby?.exportMin() },
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
          console.log(args.fetch);
          const whiteBanList = db
            .prepare(
              `SELECT * FROM ${args.fetch.type} ${
                args.fetch.activeOnly ? "WHERE removal_date IS NULL" : ""
              } ORDER BY ${args.fetch.sort ?? "id"} ${
                args.fetch?.sortOrder ?? "ASC"
              } LIMIT 10 OFFSET ?`
            )
            .all((args.fetch.page ?? 0) * 10);
          sendWindow("fetchedWhiteBanList", {
            fetched: {
              type: args.fetch.type,
              list: whiteBanList,
              page: args.fetch.page ?? 0,
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
                if (!fs.existsSync(copyDir)) {
                  fs.mkdirSync(copyDir);
                }
                newMapPath = copyDir + mapName;
                try {
                  if (!fs.existsSync(newMapPath)) {
                    log.info("Copying map to safe path.");
                    fs.copyFileSync(result.filePaths[0], newMapPath);
                  } else {
                    log.info("Map already exists, not copying.");
                  }
                } catch (e) {
                  log.warn(e);
                  return;
                }
              }
              settings.values.autoHost.mapPath = newMapPath;
              log.info(`Change map to ${settings.values.autoHost.mapPath}`);
              store.set("autoHost.mapPath", settings.values.autoHost.mapPath);
              if (mapName) {
                mapName = mapName.substring(0, mapName.length - 4);
                settings.values.autoHost.mapName = mapName;
                store.set("autoHost.mapName", mapName);
                sendWindow("updateSettingSingle", {
                  update: {
                    setting: "autoHost",
                    key: "mapPath",
                    value: settings.values.autoHost.mapPath,
                  },
                });
                eloMapNameCheck(
                  settings.values.elo.type,
                  settings.values.autoHost.mapName
                );
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
          let transform: SettingsUpdates = {};
          transform[update.setting] = {};
          // @ts-expect-error Wrong type check
          transform[update.setting][update.key] = update.value;
          settings.updateSettings(transform);
        }
        break;
      case "autoHostLobby":
        log.info("Comm AutoHost lobby");
        autoHostGame(true);
        break;
      case "exportWhitesBans":
        if (args.exportImport) {
          let list = db
            .prepare(`SELECT * FROM ${args.exportImport.type} WHERE removal_date IS NULL`)
            .all();
          if (args.exportImport.type === "banList") {
            let path = app.getPath("documents") + "\\bans.json";
            fs.writeFileSync(path, JSON.stringify(list));
            console.log(path);
            shell.showItemInFolder(path);
          } else if (args.exportImport.type === "whiteList") {
            let path = app.getPath("documents") + "\\whiteList.json";
            fs.writeFileSync(path, JSON.stringify(list));
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
                let bans = JSON.parse(fs.readFileSync(file).toString());
                bans.forEach((ban: BanWhiteList) => {
                  if (args.exportImport?.type === "banList") {
                    banPlayer(ban.username, "client", ban.region || "client", ban.reason);
                  } else if (args.exportImport?.type === "whiteList") {
                    whitePlayer(
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
    if (command.error) {
      log.warn(command.error);
    }
    if (command.info) {
      log.info(command.info);
    }
    if (command.newProgress) {
      log.info(command.newProgress);
      sendWindow("progress", { progress: command.newProgress });
    }
    if (command.sendGameChat) {
      sendChatMessage(command.sendGameChat);
    }
    if (command.sendGameMessage) {
      sendMessage(command.sendGameMessage.type, command.sendGameMessage.payload);
    }
    if (command.notification) {
      new Notification(command.notification).show();
    }
    if (command.newGameState) {
      // @ts-expect-error Not sure why this is 'never'
      gameState.values[command.newGameState.key] = command.newGameState.value;
    }
    if (command.lobbyUpdate) {
      let update = command.lobbyUpdate;
      if (lobbyController.microLobby) {
        if (
          update.playerPayload ||
          update.playerData ||
          update.newLobby ||
          update.leftLobby
        ) {
          if (update.leftLobby) {
            clearLobby();
          } else {
            gameState.values.action = "waitingInLobby";
          }
          sendWindow("lobbyUpdate", { lobbyData: update });
          hubConnection.sendToHub({ lobbyUpdates: update });
          if (discClient) {
            if (update.newLobby) {
              discClient.sendNewLobby(
                update.newLobby,
                lobbyController.microLobby?.exportTeamStructure()
              );
            } else {
              discClient.updateDiscordLobby(
                lobbyController.microLobby?.exportTeamStructure()
              );
            }
          }
          if (settings.values.obs.textSource) {
            fs.writeFileSync(
              path.join(app.getPath("documents"), "wc3mt.txt"),
              lobbyController.exportTeamStructureString()
            );
          }
          if (update.playerData) {
            if (update.playerData.extraData) {
              if (settings.values.elo.announce) {
                sendChatMessage(
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
          leaveGame();
        } else if (update.playerLeft) {
          log.info("Player left: " + update.playerLeft);
        } else if (update.playerJoined) {
          if (update.playerJoined.name) {
            db.open;
            const row = db
              .prepare(
                "SELECT * FROM banList WHERE username = ? AND removal_date IS NULL"
              )
              .get(update.playerJoined.name);
            if (row) {
              lobbyController.banSlot(update.playerJoined.slot);
              sendChatMessage(
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
              if (update.playerJoined.name !== gameState.values.selfBattleTag) {
                const row = db
                  .prepare(
                    "SELECT * FROM whiteList WHERE username = ? AND removal_date IS NULL"
                  )
                  .get(update.playerJoined.name);
                if (!row) {
                  lobbyController.banSlot(update.playerJoined.slot);
                  sendChatMessage(update.playerJoined.name + " is not whitelisted");
                  log.info(
                    "Kicked " + update.playerJoined.name + " for not being whitelisted"
                  );
                  return;
                }
              }
            }
            log.info("Player joined: " + update.playerJoined.name);
            announcement();
            if (
              settings.values.autoHost.minPlayers !== 0 &&
              lobbyController.microLobby?.nonSpecPlayers.length >=
                settings.values.autoHost.minPlayers
            ) {
              startGame(settings.values.autoHost.delayStart);
            }
          } else {
            log.warn("Nameless player joined");
          }
        } else if (update.lobbyReady) {
          if (lobbyController.microLobby?.lobbyStatic.isHost) {
            if (settings.values.autoHost.sounds) {
              playSound("ready.wav");
            }
            if (
              settings.values.autoHost.type === "smartHost" ||
              settings.values.autoHost.type === "rapidHost"
            ) {
              sendProgress("Starting Game", 100);
              if (
                (settings.values.elo.type == "off" ||
                  !settings.values.elo.balanceTeams) &&
                settings.values.autoHost.shufflePlayers
              ) {
                lobbyController.shufflePlayers();
              }
              // Wait a quarter second to make sure shuffles are done
              setTimeout(() => {
                if (lobbyController.isLobbyReady()) {
                  startGame(settings.values.autoHost.delayStart);
                }
              }, 250);
            }
          }
        }
      }
    }
  }
}
