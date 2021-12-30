import {
  screen,
  getActiveWindow,
  mouse,
  getWindows,
  centerOf,
  imageResource,
  Point,
  left,
  right,
  up,
  Key,
  keyboard,
} from "@nut-tree/nut-js";
require("@nut-tree/template-matcher");
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
import { nanoid } from "nanoid";
import util from "util";
const exec = util.promisify(require("child_process").exec);
import fetch from "cross-fetch";
import * as log from "electron-log";
import * as path from "path";
import Store from "electron-store";
import fs from "fs";
import WebSocket from "ws";
import { play } from "sound-play";
import sqlite3 from "better-sqlite3";
import { DisClient } from "./disc";
import { WarLobby } from "./lobby";
import parser from "w3gjs";
const FormData = require("form-data");
if (!app.isPackaged) {
  require("electron-reload")(__dirname, {
    electron: path.join(__dirname, "../node_modules", ".bin", "electron.cmd"),
    awaitWriteFinish: true,
  });
}
import {
  AppSettings,
  WindowSend,
  GameClientLobbyPayload,
  GameClientMessage,
  WindowReceive,
  SettingsKeys,
  mmdResults,
  LobbyUpdates,
  HubReceive,
  LobbyAppSettings,
  PlayerData,
  Regions,
  getTargetRegion,
  OpenLobbyParams,
} from "./utility";

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  const db = new sqlite3(app.getPath("userData") + "/wc3mt.db");

  autoUpdater.logger = log;

  screen.config.confidence = 0.8;
  screen.height().then((height) => {
    setResourceDir(height);
  });

  if (!app.isPackaged) {
    screen.config.autoHighlight = true;
    screen.config.highlightDurationMs = 1500;
    screen.config.highlightOpacity = 0.75;
  }

  log.info("App starting...");

  const store = new Store();
  const replayFolders: string = path.join(
    app.getPath("documents"),
    "Warcraft III\\BattleNet"
  );

  var win: BrowserWindow;
  var appIcon: Tray | null;
  var currentStatus = false;
  var gameNumber = 0;
  // @ts-ignore
  var inGame = false;
  var wss: WebSocket.Server | null = null;
  var socket: WebSocket | null = null;
  var clientWebSocket: WebSocket;
  var hubWebSocket: WebSocket | null;
  var warcraftInFocus = false;
  var warcraftIsOpen = false;
  var warcraftRegion = { left: 0, top: 0, width: 0, height: 0 };
  var voteTimer: NodeJS.Timeout | null, refreshTimer: NodeJS.Timeout | null;
  var openLobbyParams: OpenLobbyParams | null;
  var gameState: {
    selfRegion: Regions | "";
    menuState: string;
    screenState: string;
    selfBattleTag: string;
    inGame: boolean;
  } = {
    menuState: "Out of Menus",
    screenState: "",
    selfBattleTag: "",
    selfRegion: "",
    inGame: false,
  };
  var clientState: { tableVersion: number; latestUploadedReplay: number } = {
    tableVersion: (store.get("tableVersion") as number) ?? 0,
    latestUploadedReplay: (store.get("latestUploadedReplay") as number) ?? 0,
  };
  var appVersion: string;
  var discClient: DisClient | null = null;

  var settings: AppSettings = <AppSettings>{
    autoHost: {
      type: store.get("autoHost.type") ?? "off",
      private: store.get("autoHost.private") ?? false,
      sounds: store.get("autoHost.sounds") ?? false,
      increment: store.get("autoHost.increment") ?? true,
      mapName: store.get("autoHost.mapName") ?? "",
      gameName: store.get("autoHost.gameName") ?? "",
      mapPath: store.get("autoHost.mapPath") ?? "N/A",
      announceIsBot: store.get("autoHost.announceIsBot") ?? false,
      announceCustom: store.get("autoHost.announceCustom") ?? false,
      announceRestingInterval: store.get("autoHost.announceRestingInterval") ?? 30,
      moveToSpec: store.get("autoHost.moveToSpec") ?? false,
      rapidHostTimer: store.get("autoHost.rapidHostTimer") ?? 0,
      smartHostTimeout: store.get("autoHost.smartHostTimeout") ?? 0,
      voteStart: store.get("autoHost.voteStart") ?? false,
      voteStartPercent: store.get("autoHost.voteStartPercent") ?? 60,
      closeSlots: store.get("autoHost.closeSlots") ?? [],
      customAnnouncement: store.get("autoHost.customAnnouncement") ?? "",
      observers: store.get("autoHost.observers") ?? false,
      advancedMapOptions: store.get("autoHost.advancedMapOptions") ?? false,
      flagLockTeams: store.get("autoHost.flagLockTeams") ?? true,
      flagPlaceTeamsTogether: store.get("autoHost.flagPlaceTeamsTogether") ?? true,
      flagFullSharedUnitControl: store.get("autoHost.flagFullSharedUnitControl") ?? false,
      flagRandomRaces: store.get("autoHost.flagRandomRaces") ?? false,
      flagRandomHero: store.get("autoHost.flagRandomHero") ?? false,
      settingVisibility: store.get("autoHost.settingVisibility") ?? "0",
      leaveAlternate: store.get("autoHost.leaveAlternate") ?? false,
      regionChange: store.get("autoHost.regionChange") ?? false,
      regionChangeTimeEU: store.get("autoHost.regionChangeTimeEU") ?? "01:00",
      regionChangeTimeNA: store.get("autoHost.regionChangeTimeNA") ?? "11:00",
    },
    obs: {
      type: store.get("obs.type") ?? "off",
      inGameHotkey: store.get("obs.inGameHotkey") ?? false,
      outOfGameHotkey: store.get("obs.outOfGameHotkey") ?? false,
    },
    elo: {
      type: store.get("elo.type") ?? "off",
      balanceTeams: store.get("elo.balanceTeams") ?? true,
      announce: store.get("elo.announce") ?? true,
      excludeHostFromSwap: store.get("elo.excludeHostFromSwap") ?? true,
      lookupName: store.get("elo.lookupName") ?? "",
      available: store.get("elo.available") ?? false,
      wc3statsVariant: store.get("elo.wc3statsVariant") ?? "",
      handleReplays: store.get("elo.handleReplays") ?? true,
    },
    discord: {
      type: store.get("discord.type") ?? "off",
      token: store.get("discord.token") ?? "",
      announceChannel: store.get("discord.announceChannel") ?? "",
      chatChannel: store.get("discord.chatChannel") ?? "",
      bidirectionalChat: store.get("discord.bidirectionalChat") ?? false,
    },
    client: {
      restartOnUpdate: store.get("client.restartOnUpdate") ?? false,
      checkForUpdates: store.get("client.checkForUpdates") ?? true,
    },
  };
  let lobby: WarLobby;

  var identifier: string = store.get("anonymousIdentifier") as string;
  if (!identifier || identifier.length !== 21) {
    identifier = nanoid();
    store.set("anonymousIdentifier", identifier);
  }

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
                log.error("Invalid Warcraft file?");
              }
            }
          })
          .catch((err) => {
            log.error(err.message, err.stack);
          });
      }
    });
  }

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
    sendToHub("lobbyUpdate", { leftLobby: true });
    discClient?.lobbyClosed();
    lobby?.clear();
  });

  function protocolHandler(url: string) {
    if (url) {
      openLobbyParams = getQueryVariables(url.split("?", 2)[1]);
      if (openLobbyParams.lobbyName || openLobbyParams.gameId) {
        log.info(openLobbyParams);
        isWarcraftOpen().then((isOpen) => {
          warcraftIsOpen = isOpen;
          if (!isOpen) {
            log.info(
              "Warcraft is not open, opening. " + openLobbyParams?.region
                ? openLobbyParams?.region
                : ""
            );
            try {
              openWarcraft(openLobbyParams?.region);
            } catch (e) {
              log.error(e);
            }
          } else {
            if (
              openLobbyParams?.region &&
              openLobbyParams?.region !== gameState.selfRegion
            ) {
              exitGame();
              setTimeout(() => {
                openWarcraft(openLobbyParams?.region);
              }, 3000);
            }
            openParamsJoin();
          }
        });
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
    switch (args.messageType) {
      case "changePerm":
        if (args.perm?.player) {
          if (args.perm.role === "moderator" || args.perm.role === "admin") {
            addAdmin(args.perm.player, "client", "client", args.perm.role);
          } else if (!args.perm.role) {
            removeAdmin(args.perm.player);
          }
        } else {
          log.info("No player in perm");
        }
        break;
      case "unbanPlayer":
        if (args.ban?.player) {
          unBanPlayer(args.ban.player, "client");
        }
        break;
      case "banPlayer":
        if (args.ban?.player) {
          banPlayer(args.ban.player, "client", "client", args.ban.reason);
        }
        break;
      case "init":
        sendWindow("updateSettings", { settings: settings });
        break;
      case "openLogs":
        shell.openPath(log.transports.file.getFile().path);
        break;
      case "openWar":
        openWarcraft();
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
                  log.error(e);
                  return;
                }
              }
              settings.autoHost.mapPath = newMapPath;
              log.info(`Change map to ${settings.autoHost.mapPath}`);
              store.set("autoHost.mapPath", settings.autoHost.mapPath);
              if (mapName) {
                mapName = mapName.substring(0, mapName.length - 4);
                settings.autoHost.mapName = mapName;
                store.set("autoHost.mapName", mapName);
                sendWindow("updateSettingSingle", {
                  update: {
                    setting: "autoHost",
                    key: "mapPath",
                    value: settings.autoHost.mapPath,
                  },
                });
                eloMapNameCheck(settings.elo.type, settings.autoHost.mapName);
              }
            }
          })
          .catch((err) => {
            log.error(err.message, err.stack);
          });
        break;
      case "updateSettingSingle":
        let update = args.data?.update;
        if (update) {
          updateSetting(update.setting, update.key, update.value);
        }
        break;
      default:
        log.info("Unknown ipcMain message:", args);
        break;
    }
  });

  function updateSetting(setting: keyof AppSettings, key: SettingsKeys, value: any) {
    // TODO remove rapidHostTimer from typeof exception
    if (
      // @ts-ignore
      settings[setting]?.[key] !== undefined &&
      // @ts-ignore
      (typeof settings[setting][key] === typeof value ||
        key === "rapidHostTimer" ||
        key === "announceRestingInterval" ||
        key === "voteStartPercent" ||
        ((key === "inGameHotkey" || key === "outOfGameHotkey") &&
          (typeof value === "boolean" || typeof value === "object"))) &&
      // @ts-ignore
      settings[setting][key] !== value
    ) {
      // @ts-ignore
      settings[setting][key] = value;
      if (setting === "discord") {
        if (key === "type" || key === "token") {
          discordSetup();
        } else if (key === "announceChannel" || key === "chatChannel") {
          discClient?.updateChannel(value, key);
        } else if (key === "bidirectionalChat" && discClient) {
          discClient.bidirectionalChat = value;
        }
      }
      if (lobby) {
        lobby.updateSetting(key as keyof LobbyAppSettings, value);
      }

      sendSocket(setting + "Settings", settings[setting]);
      sendWindow("updateSettingSingle", {
        update: {
          setting,
          key,
          value,
        },
      });
      store.set(setting, settings[setting]);
      log.info(setting + " settings changed:", settings[setting]);
    } else {
      log.error("Invalid update:", setting, key, value);
    }
  }

  async function eloMapNameCheck(type: "wc3stats" | "pyroTD" | "off", mapName: string) {
    // Clean the name from the map name
    let clean = await lobby.cleanMapName(mapName);
    updateSetting("elo", "lookupName", clean.name);
    updateSetting("elo", "available", clean.elo);
    updateSetting("elo", "wc3statsVariant", "");
    if (!clean.elo) {
      if (!settings.elo.available) {
        sendWindow("error", {
          error:
            "We couldn't find any ELO data for your map. Please raise an issue on <a href='https://github.com/trenchguns/wc3multitool/issues/new?title=Map%20Request&body=Map%20Name%3A%0A&labels=Map%20Request' class='alert-link'> Github</a> if you think there should be.",
        });
      }
    }
  }

  autoUpdater.on("checking-for-update", () => {
    // Do nothing for now
    log.info("checking-for-update");
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
    log.error(err);
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

    if (settings.client.restartOnUpdate) {
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
        enableRemoteModule: false,
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
    setInterval(() => {
      if (settings.client.checkForUpdates) {
        autoUpdater.checkForUpdatesAndNotify();
      }
    }, 30 * 60 * 1000);
    log.info("App ready");
    db.exec(
      "CREATE TABLE IF NOT EXISTS banList(id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT NOT NULL, ban_date DATETIME default current_timestamp NOT NULL, admin TEXT NOT NULL, region TEXT NOT NULL, reason TEXT, unban_date DATETIME)"
    );
    db.exec(
      "CREATE TABLE IF NOT EXISTS lobbyEvents(id INTEGER PRIMARY KEY AUTOINCREMENT, event TEXT NOT NULL, time DATETIME default current_timestamp NOT NULL, data TEXT, username TEXT)"
    );
    db.exec(
      "CREATE TABLE IF NOT EXISTS adminList(id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT NOT NULL, add_date DATETIME default current_timestamp NOT NULL, admin TEXT NOT NULL, region TEXT NOT NULL, role TEXT NOT NULL)"
    );
    if (clientState.tableVersion < 1) {
      log.info("Updating tables");
      db.exec("ALTER TABLE banList rename to banListBackup");
      db.exec(
        "CREATE TABLE banList(id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT NOT NULL, ban_date DATETIME default current_timestamp NOT NULL, admin TEXT NOT NULL, region TEXT NOT NULL, reason TEXT, unban_date DATETIME)"
      );
      db.exec("INSERT INTO banList SELECT * FROM banListBackup;");
      store.set("tableVersion", 1);
      clientState.tableVersion = 1;
    }
    discordSetup();
    appVersion = app.getVersion();
    wss = new WebSocket.Server({ port: 8888 });
    wss.on("connection", function connection(ws) {
      log.info("Connection");
      socket = ws;
      sendSocket("autoHost", settings.autoHost);
      sendStatus(true);
      ws.on("message", handleWSMessage);
      ws.on("close", function close() {
        log.warn("Socket closed");
        socket = null;
        sendProgress();
        sendStatus(false);
      });
    });
    wss.on("error", function (err) {
      if (err.message.includes("EADDRINUSE")) {
        throw new Error(
          "The app may already be open. Check your taskbar or task manager for another instance, or clear port 8888"
        );
      } else {
        log.error(err.message);
        throw err;
      }
    });
    lobbySetup();
    globalShortcut.register("Alt+CommandOrControl+S", () => {
      sendMessage("PlaySound", { sound: "MenuButtonClick" });
    });
    globalShortcut.register("Alt+CommandOrControl+O", () => {});
    createWindow();
    if (settings.client.checkForUpdates) {
      autoUpdater.checkForUpdatesAndNotify();
    }
    connectToHub();
    if (process.argv[1] && process.argv[1] !== ".") {
      setTimeout(() => {
        protocolHandler(process.argv[1]);
      }, 3000);
    }
  });

  app.on("window-all-closed", () => {
    sendToHub("lobbyUpdate", { leftLobby: true });
    discClient?.lobbyClosed();
    lobby?.clear();
    if (process.platform !== "darwin") {
      app.quit();
    }
  });

  app.on("activate", () => {
    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });

  function connectToHub() {
    if (app.isPackaged) {
      hubWebSocket = new WebSocket("wss://ws.trenchguns.com/" + identifier);
    } else {
      hubWebSocket = new WebSocket("wss://wsdev.trenchguns.com/" + identifier);
    }
    hubWebSocket.onerror = function (error) {
      if (app.isPackaged) log.error("Failed hub connection", error);
    };
    hubWebSocket.onopen = (ev) => {
      if (ev.target.readyState !== WebSocket.OPEN) return;
      log.info("Connected to hub");
      if (lobby.lobbyStatic && (!settings.autoHost.private || !app.isPackaged)) {
        sendToHub("lobbyUpdate", { newLobby: lobby.export() });
      }
      setTimeout(hubHeartbeat, 30000);
    };
    hubWebSocket.onmessage = function incoming(data) {
      log.info("Received message from hub: " + data);
    };
    hubWebSocket.onclose = function close() {
      if (app.isPackaged) log.warn("Disconnected from hub");
      setTimeout(connectToHub, Math.random() * 5000 + 3000);
      hubWebSocket = null;
    };
  }

  function hubHeartbeat() {
    if (hubWebSocket) {
      sendToHub("heartbeat");
      setTimeout(hubHeartbeat, 30000);
    }
  }

  function discordSetup() {
    if (
      settings.discord.type !== "off" &&
      settings.discord.token.length > 20 &&
      settings.discord.announceChannel
    ) {
      discClient = new DisClient(
        settings.discord.token,
        settings.discord.announceChannel,
        settings.discord.chatChannel,
        settings.discord.bidirectionalChat,
        !app.isPackaged
      );
      discClient.on("chatMessage", (author, message) => {
        sendChatMessage("(DC)" + author + ": " + message);
      });
    } else {
      discClient = null;
    }
  }

  function lobbySetup() {
    lobby = new WarLobby(
      settings.elo.type,
      settings.elo.wc3statsVariant,
      settings.elo.balanceTeams,
      settings.elo.excludeHostFromSwap,
      settings.autoHost.moveToSpec,
      settings.autoHost.closeSlots,
      settings.autoHost.mapPath
    );
    lobby.on("update", (update: LobbyUpdates) => {
      if (
        update.playerPayload ||
        update.playerData ||
        update.newLobby ||
        update.leftLobby
      ) {
        if (update.leftLobby) {
          clearLobby();
        } else if (update.newLobby) {
          refreshTimer = setInterval(() => {
            if (lobby.getAllPlayers(true).length < 2) {
              leaveGame();
            } else {
              lobby.refreshGame();
            }
          }, 60000 * 30);
        }
        sendWindow("lobbyUpdate", { lobbyData: update });
        sendToHub("lobbyUpdate", update);
        if (discClient) {
          if (update.newLobby) {
            discClient.sendNewLobby(update.newLobby, lobby.exportTeamStructure());
          } else {
            discClient.updateLobby(lobby.exportTeamStructure());
          }
        }
        if (settings.elo.announce && update.playerData) {
          sendChatMessage(
            update.playerData.name +
              " ELO: " +
              update.playerData.data.rating +
              ", Rank: " +
              update.playerData.data.rank +
              ", Played: " +
              update.playerData.data.played +
              ", Wins: " +
              update.playerData.data.wins +
              ", Losses: " +
              update.playerData.data.losses +
              ", Last Change: " +
              update.playerData.data.lastChange
          );
        }
      } else if (update.playerLeft) {
        console.log("Player left: " + update.playerLeft);
      } else if (update.playerJoined) {
        if (update.playerJoined.name) {
          db.open;
          const row = db
            .prepare("SELECT * FROM banList WHERE username = ? AND unban_date IS NULL")
            .get(update.playerJoined.name);
          if (row) {
            lobby.banSlot(update.playerJoined.slot);
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
          } else {
            console.log("Player joined: " + update.playerJoined.name);
            announcement();
          }
        } else {
          log.error("Nameless player joined");
        }
      } else if (update.lobbyReady) {
        if (lobby?.lobbyStatic?.isHost) {
          if (
            settings.autoHost.type === "smartHost" ||
            settings.autoHost.type === "rapidHost"
          ) {
            sendProgress("Starting Game", 100);
            // Wait a quarter second to make sure no one left
            setTimeout(async () => {
              if (lobby.isLobbyReady()) {
                startGame();
              }
            }, 250);
          } else if (settings.autoHost.type === "lobbyHost" && settings.autoHost.sounds) {
            playSound("ready.wav");
          }
        }
      }
    });
    lobby.on("sendChat", (data: string) => {
      sendChatMessage(data);
    });
    lobby.on("sendMessage", (data: { type: string; payload: any }) => {
      sendMessage(data.type, data.payload);
    });
    lobby.on("error", (data: string) => {
      log.error(data);
    });
    lobby.on("info", (data: string) => {
      log.info(data);
    });
    lobby.on("progress", (data: { step: string; progress: number }) => {
      log.info(data);
      sendWindow("progress", { progress: data });
    });
  }

  function sendToHub(
    messageType: HubReceive["messageType"],
    data: HubReceive["data"] = null
  ) {
    let buildMessage: HubReceive = { messageType, data, appVersion };
    if (hubWebSocket && hubWebSocket.readyState === WebSocket.OPEN) {
      hubWebSocket.send(JSON.stringify(buildMessage));
    }
  }

  async function triggerOBS() {
    if (settings.obs.type === "hotkeys") {
      if (inGame && settings.obs.inGameHotkey) {
        log.info("Triggering OBS In-Game");
        let modifiers: Array<Key> = [];
        if (settings.obs.inGameHotkey) {
          if (settings.obs.inGameHotkey.altKey) {
            //modifiers.push("alt");
            modifiers.push(Key.LeftAlt);
          }
          if (settings.obs.inGameHotkey.ctrlKey) {
            //modifiers.push("control");
            modifiers.push(Key.LeftControl);
          }
          if (settings.obs.inGameHotkey.shiftKey) {
            //modifiers.push("shift");
            modifiers.push(Key.LeftShift);
          }
          //robot.keyTap(settings.obs.inGameHotkey.key, modifiers);
          //console.log(Key[settings.obs.inGameHotkey.key.toUpperCase()]);
          try {
            await keyboard.type(
              ...modifiers,
              // @ts-ignore
              Key[settings.obs.inGameHotkey.key.toUpperCase()]
            );
            console.log("Pressed!");
          } catch (e) {
            console.log(e);
          }
        }
      } else if (!inGame && settings.obs.outOfGameHotkey) {
        // Test!
        let modifiers: Array<Key> = [];
        if (settings.obs.outOfGameHotkey.altKey) {
          //modifiers.push("alt");
          modifiers.push(Key.LeftAlt);
        }
        if (settings.obs.outOfGameHotkey.ctrlKey) {
          //modifiers.push("control");
          modifiers.push(Key.LeftControl);
        }
        if (settings.obs.outOfGameHotkey.shiftKey) {
          //modifiers.push("shift");
          modifiers.push(Key.LeftShift);
        }
        //robot.keyTap(settings.obs.outOfGameHotkey.key, modifiers);
        //console.log(...modifiers, Key[settings.obs.outOfGameHotkey.key.toUpperCase()]);
        try {
          await keyboard.type(
            ...modifiers,
            // @ts-ignore
            Key[settings.obs.outOfGameHotkey.key.toUpperCase()]
          );
          console.log("Pressed out!");
        } catch (e) {
          console.log(e);
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

  async function handleWSMessage(message: string) {
    let data = JSON.parse(message) as { messageType: string; data: any };
    switch (data.messageType) {
      case "state":
        gameState = data.data;
        if (gameState.menuState) {
          sendWindow("menusChange", { value: gameState.menuState });
          setTimeout(() => handleGlueScreen(gameState.menuState), 250);
        }
        break;
      case "sendMessage":
        console.log(data.data);
        if (data.data.message === "StopGameAdvertisements") {
          if (gameState.menuState !== "LOADING_SCREEN" && lobby.lookupName) {
            log.info("Re-hosting Stale Lobby");
            sendChatMessage("Re-hosting Stale Lobby");
            leaveGame();
          } else if (gameState.menuState === "LOADING_SCREEN") {
            if (settings.autoHost.type === "rapidHost") {
              if (settings.autoHost.rapidHostTimer === 0) {
                log.info("Rapid Host leave game immediately");
                leaveGame();
              } else if (settings.autoHost.rapidHostTimer === -1) {
                log.info("Rapid Host exit game immediately");
                forceQuit();
                setTimeout(openWarcraft, 1000);
              }
            }
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
        settings.autoHost.type = settings.autoHost.type === "off" ? "lobbyHost" : "off";
        store.set("autoHost", settings.autoHost);
        sendSocket("autoHost", settings.autoHost);
      //sendWindow("autoHost", settings.autoHost);
      case "error":
        log.error(data);
        win.webContents.send("fromMain", data);
        break;
      case "echo":
        log.verbose(data);
        break;
      default:
        log.info(data);
    }
  }

  function autoHostGame() {
    if (settings.autoHost.type !== "off") {
      let targetRegion = gameState.selfRegion;
      if (settings.autoHost.regionChange) {
        targetRegion = getTargetRegion(
          settings.autoHost.regionChangeTimeEU,
          settings.autoHost.regionChangeTimeNA
        );
      }
      if (gameState.selfRegion && gameState.selfRegion !== targetRegion) {
        exitGame();
        setTimeout(() => {
          openWarcraft(targetRegion);
        }, 500);
      } else {
        createGame();
      }
    }
  }

  function createGame() {
    if (!["CUSTOM_GAME_LOBBY", "LOADING_SCREEN"].includes(gameState.menuState)) {
      gameNumber += 1;
      const lobbyName =
        settings.autoHost.gameName +
        (settings.autoHost.increment ? ` #${gameNumber}` : "");
      const payloadData = {
        filename: settings.autoHost.mapPath.replace(/\\/g, "/"),
        gameSpeed: 2,
        gameName: lobbyName,
        mapSettings: {
          flagLockTeams: settings.autoHost.advancedMapOptions
            ? settings.autoHost.flagLockTeams
            : true,
          flagPlaceTeamsTogether: settings.autoHost.advancedMapOptions
            ? settings.autoHost.flagPlaceTeamsTogether
            : true,
          flagFullSharedUnitControl: settings.autoHost.advancedMapOptions
            ? settings.autoHost.flagFullSharedUnitControl
            : false,
          flagRandomRaces: settings.autoHost.advancedMapOptions
            ? settings.autoHost.flagRandomRaces
            : false,
          flagRandomHero: settings.autoHost.advancedMapOptions
            ? settings.autoHost.flagRandomHero
            : false,
          settingObservers: settings.autoHost.observers ? 2 : 0,
          settingVisibility: settings.autoHost.advancedMapOptions
            ? parseInt(settings.autoHost.settingVisibility)
            : 0,
        },
        privateGame: settings.autoHost.private,
      };
      log.info("Sending autoHost payload", payloadData);
      sendMessage("CreateLobby", payloadData);
    }
  }

  function handleGlueScreen(screen: string) {
    // Create a new game at menu or if previously in game(score screen loads twice)
    if (!screen || screen === "null") {
      return;
    }
    if (["CUSTOM_LOBBIES", "MAIN_MENU"].includes(screen)) {
      gameState.menuState = screen;
      if (openLobbyParams?.lobbyName) {
        openParamsJoin();
      } else {
        setTimeout(autoHostGame, 500);
      }
    } else if (screen === "LOADING_SCREEN") {
      discClient?.sendMessage(
        "Game start. End of chat for " + lobby.lobbyStatic?.lobbyName
      );
      discClient?.lobbyStarted();
    } else if (gameState.menuState === "LOADING_SCREEN" && screen === "SCORE_SCREEN") {
      // Game has finished loading in
      inGame = true;
      if (settings.autoHost.type === "smartHost") {
        setTimeout(findQuit, 15000);
      }
      triggerOBS();
      if (
        settings.autoHost.type === "rapidHost" &&
        settings.autoHost.rapidHostTimer > 0
      ) {
        setTimeout(leaveGame, settings.autoHost.rapidHostTimer * 1000 * 60);
      }
    } else {
      triggerOBS();
      inGame = false;
      if (settings.elo.handleReplays) {
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
          if (settings.elo.type === "wc3stats") {
            let form = new FormData();
            form.append("replay", fs.createReadStream(mostModified.file));
            fetch("https://api.wc3stats.com/upload?auto=true", {
              method: "POST",
              body: form,
              headers: {
                ...form.getHeaders(),
              },
            }).then(
              function (response) {
                if (response.status !== 200) {
                  log.info(response.statusText);
                  sendWindow("error", { error: response.statusText });
                } else {
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
    gameState.menuState = screen;
    sendWindow("menusChange", { value: gameState.menuState });
  }

  function handleClientMessage(message: { data: string }) {
    if (message.data) {
      clientWebSocket = new WebSocket(message.data);

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
              gameState.screenState = data.payload.screen;
              break;
            case "SetGlueScreen":
              if (data.payload.screen) {
                //handleGlueScreen(data.payload.screen);
              }
              break;
            case "GameLobbySetup":
              handleLobbyUpdate(data.payload);
              break;
            case "GameList":
              if (openLobbyParams && openLobbyParams.lobbyName) {
                log.info("GameList received, trying to find lobby.");
                handleGameList(data.payload);
              } else {
                log.info("GameList received, trying to find self.");
                console.log(data.payload);
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
            case "UpdateUserInfo":
              gameState.selfBattleTag = data.payload.user.battleTag;
              gameState.selfRegion = data.payload.user.userRegion;
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
                  console.log(data);
                }
              }
          }
        }
      );
      clientWebSocket.on("close", function close() {
        clearLobby();
        log.warn("Game client connection closed!");
      });
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
    if (refreshTimer) clearInterval(refreshTimer);
    if (gameState.menuState !== "LOADING_SCREEN" && lobby.lobbyStatic?.lobbyName) {
      sendWindow("lobbyUpdate", { lobbyData: { leftLobby: true } });
      sendToHub("lobbyUpdate", { leftLobby: true });
      discClient?.sendMessage(
        "Lobby left. End of chat for " + lobby.lobbyStatic?.lobbyName
      );
      discClient?.lobbyClosed();
    }
    lobby?.clear();
  }

  function openParamsJoin() {
    if (
      openLobbyParams?.lobbyName ||
      (openLobbyParams?.gameId && openLobbyParams.mapFile)
    ) {
      if (inGame || lobby.lookupName) {
        leaveGame();
        return;
      }
      updateSetting("autoHost", "type", "off");

      if (openLobbyParams.region && openLobbyParams.region !== gameState.selfRegion) {
        // TODO close warcraft then re-open with new region
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

  function handleChatMessage(payload: GameClientMessage) {
    if (payload.message && payload.message.source === "gameChat") {
      if (payload.message.sender.includes("#")) {
        var sender = payload.message.sender;
      } else {
        var sender = gameState.selfBattleTag;
      }
      if (
        sender === gameState.selfBattleTag &&
        sentMessages.includes(payload.message.content)
      ) {
        sentMessages.splice(sentMessages.indexOf(payload.message.content), 1);
      } else {
        if (payload.message.content.match(/^\?votestart/i)) {
          if (
            settings.autoHost.voteStart &&
            lobby.voteStartVotes &&
            lobby.lobbyStatic?.isHost &&
            ["rapidHost", "smartHost"].includes(settings.autoHost.type)
          ) {
            if (lobby.voteStartVotes.length === 0) {
              if (lobby.allPlayerTeamsContainPlayers()) {
                voteTimer = setTimeout(cancelVote, 60000);
                sendChatMessage("You have 60 seconds to ?votestart.");
                return;
              } else {
                sendChatMessage("Unavailable. Not all teams have players.");
              }
            }
            if (!lobby.voteStartVotes.includes(sender) && voteTimer) {
              lobby.voteStartVotes.push(sender);
              if (
                lobby.voteStartVotes.length >=
                lobby.getAllPlayers().length * (settings.autoHost.voteStartPercent / 100)
              ) {
                startGame();
              } else {
                sendChatMessage(
                  Math.ceil(
                    lobby.getAllPlayers().length *
                      (settings.autoHost.voteStartPercent / 100) -
                      lobby.voteStartVotes.length
                  ).toString() + " more vote(s) required."
                );
              }
            }
          }
        } else if (payload.message.content.match(/^\?stats/)) {
          if (lobby.eloAvailable) {
            let data: PlayerData;
            let playerTarget = payload.message.content.split(" ")[1];
            if (playerTarget) {
              let targets = lobby.searchPlayer(playerTarget);
              if (targets.length === 1) {
                sender = targets[0];
                data = lobby.getPlayerData(sender);
              } else if (targets.length > 1) {
                sendChatMessage("Multiple players found. Please be more specific.");
                return;
              } else {
                sendChatMessage("No player found.");
                return;
              }
            } else {
              data = lobby.getPlayerData(sender);
            }
            if (data) {
              if (data.rating === -1) {
                sendChatMessage("Data pending");
              } else {
                sendChatMessage(
                  sender +
                    " ELO: " +
                    data.rating +
                    ", Rank: " +
                    data.rank +
                    ", Played: " +
                    data.played +
                    ", Wins: " +
                    data.wins +
                    ", Losses: " +
                    data.losses +
                    ", Last Change: " +
                    data.lastChange
                );
              }
            } else {
              sendChatMessage("No data available or pending?");
            }
          } else {
            sendChatMessage("Data not available");
          }
        } else if (payload.message.content.match(/^\?shuffle/i)) {
          // TODO: Shuffle
          if (lobby.lobbyStatic?.isHost && checkRole(sender, "moderator")) {
            let players = lobby.exportTeamStructure();
          }
        } else if (payload.message.content.match(/^\?start/i)) {
          if (lobby.lobbyStatic?.isHost && checkRole(sender, "moderator")) {
            startGame();
          }
        } else if (payload.message.content.match(/^\?a/i)) {
          if (lobby.lobbyStatic?.isHost && checkRole(sender, "moderator")) {
            cancelStart();
          }
        } else if (payload.message.content.match(/^\?handi/i)) {
          if (lobby.lobbyStatic?.isHost && checkRole(sender, "moderator")) {
            if (payload.message.content.split(" ").length === 3) {
              var target = payload.message.content.split(" ")[1];
              var handicap = parseInt(payload.message.content.split(" ")[2]);
              if (handicap) {
                if (parseInt(target)) {
                  lobby.setHandicapSlot(parseInt(target) - 1, handicap);
                } else {
                  lobby.setPlayerHandicap(target, handicap);
                }
              } else {
                sendChatMessage("Invalid handicap");
              }
            } else {
              sendChatMessage("Invalid number of arguments");
            }
          }
        } else if (payload.message.content.match(/^\?close/i)) {
          if (lobby.lobbyStatic?.isHost && checkRole(sender, "moderator")) {
            var target = payload.message.content.split(" ")[1];
            if (target) {
              if (parseInt(target) && parseInt(target) < 25 && parseInt(target) > 0) {
                lobby.closeSlot(parseInt(target) - 1);
              } else {
                let targets = lobby.searchPlayer(target);
                if (targets.length === 1) {
                  lobby.closePlayer(targets[0]);
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
          if (lobby.lobbyStatic?.isHost && checkRole(sender, "moderator")) {
            var target = payload.message.content.split(" ")[1];
            if (target) {
              if (parseInt(target) && parseInt(target) < 25 && parseInt(target) > 0) {
                lobby.openSlot(parseInt(target) - 1);
              } else {
                let targets = lobby.searchPlayer(target);
                if (targets.length === 1) {
                  lobby.kickPlayer(targets[0]);
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
          if (lobby.lobbyStatic?.isHost && checkRole(sender, "moderator")) {
            var target = payload.message.content.split(" ")[1];
            if (target) {
              if (parseInt(target) && parseInt(target) < 25 && parseInt(target) > 0) {
                lobby.kickSlot(parseInt(target) - 1);
              } else {
                let targets = lobby.searchPlayer(target);
                if (targets.length === 1) {
                  lobby.kickPlayer(targets[0]);
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
          if (lobby.lobbyStatic?.isHost && checkRole(sender, "moderator")) {
            var banTarget = payload.message.content.split(" ")[1];
            if (banTarget) {
              var banReason = payload.message.content.split(" ").slice(2).join(" ") || "";
              if (
                parseInt(banTarget) &&
                parseInt(banTarget) < 25 &&
                parseInt(banTarget) > 0
              ) {
                lobby.banSlot(parseInt(banTarget) - 1);
                banPlayer(lobby.slots[banTarget].name, sender, lobby.region, banReason);
              } else {
                if (banTarget.match(/^\D\S{2,11}#\d{4,8}$/)) {
                  sendChatMessage("Banning out of lobby player.");
                  banPlayer(banTarget, sender, lobby.region, banReason);
                } else {
                  let targets = lobby.searchPlayer(banTarget);
                  if (targets.length === 1) {
                    banPlayer(targets[0], sender, lobby.region, banReason);
                  } else if (targets.length > 1) {
                    sendChatMessage("Multiple matches found. Please be more specific.");
                  } else {
                    sendChatMessage("No matches found.");
                  }
                }
              }
            } else {
              sendChatMessage("Ban target required");
            }
          }
        } else if (payload.message.content.match(/^\?unban/i)) {
          if (lobby.lobbyStatic?.isHost && checkRole(sender, "moderator")) {
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
        } else if (payload.message.content.match(/^\?perm/i)) {
          if (lobby.lobbyStatic?.isHost && checkRole(sender, "admin")) {
            var target = payload.message.content.split(" ")[1];
            var perm = payload.message.content.split(" ")[2]?.toLowerCase() ?? "mod";
            perm = perm === "mod" ? "moderator" : perm;
            if ((target && perm === "moderator") || perm === "admin") {
              if (target.match(/^\D\S{2,11}#\d{4,8}$/)) {
                sendChatMessage("Assigning out of lobby player " + perm + ".");
                addAdmin(target, sender, lobby.region, perm);
              } else {
                let targets = lobby
                  .getAllPlayers(true)
                  .filter((user) => user.match(new RegExp(target, "i")));
                if (targets.length === 1) {
                  addAdmin(target, sender, lobby.region, perm);
                } else if (targets.length > 1) {
                  sendChatMessage("Multiple matches found. Please be more specific.");
                } else {
                  sendChatMessage("No matches found.");
                }
              }
            } else {
              sendChatMessage("Target required, or perm incorrect");
            }
          }
        } else if (payload.message.content.match(/^\?unperm/i)) {
          if (lobby.lobbyStatic?.isHost && checkRole(sender, "admin")) {
            var target = payload.message.content.split(" ")[1];
            if (target) {
              if (target.match(/^\D\S{2,11}#\d{4,8}$/)) {
                sendChatMessage("Unbanning out of lobby player.");
                removeAdmin(target);
              } else {
                sendChatMessage("Full battleTag required");
              }
            } else {
              sendChatMessage("Target required");
            }
          }
        } else if (payload.message.content.match(/^\?(help)|(commands)/i)) {
          if (lobby.lobbyStatic?.isHost) {
            if (lobby.eloAvailable) {
              sendChatMessage("?elo: Return back your elo");
              sendChatMessage(
                "?stats <?player>: Return back your stats, or target player stats"
              );
            }
            if (
              ["rapidHost", "smartHost"].includes(settings.autoHost.type) &&
              settings.autoHost.voteStart
            ) {
              sendChatMessage("?voteStart: Starts or accepts a vote to start");
            }
            if (checkRole(sender, "moderator")) {
              sendChatMessage("?a: Aborts game start");
              sendChatMessage("?ban <name|slotNumber> <?reason>: Bans a player forever");
              sendChatMessage("?close <name|slotNumber> <?reason>: Closes a slot/player");
              sendChatMessage(
                "?handi <name|slotNumber> <50|60|70|80|100>: Sets slot/player handicap"
              );
              sendChatMessage("?kick <name|slotNumber> <?reason>: Kicks a slot/player");
              sendChatMessage("?open <name|slotNumber> <?reason>: Opens a slot/player");
              sendChatMessage("?unban <name>: Un-bans a player");
              sendChatMessage("?start: Starts game");
            }
            if (checkRole(sender, "admin")) {
              sendChatMessage(
                "?perm <name> <?admin|mod>: Promotes a player to admin or moderator (mod by default)"
              );
              sendChatMessage("?unperm <name>: Demotes player to normal");
            }
            sendChatMessage("?help: Shows commands with <required arg> <?optional arg>");
          }
        } else if (
          !payload.message.content.match(
            /^(executed '!)|(Unknown command ')|(Command ')/i
          )
        ) {
          let notSpam = lobby.newChat(payload.message.sender, payload.message.content);

          if (discClient && notSpam) {
            discClient.sendMessage(
              payload.message.sender + ": " + payload.message.content
            );
          }

          if ((!settings.autoHost.private || !app.isPackaged) && notSpam) {
            sendToHub("lobbyUpdate", {
              chatMessage: {
                name: payload.message.sender,
                message: payload.message.content,
              },
            });
          }
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
        if (lobby?.getAllPlayers().includes(player)) {
          lobby.banPlayer(player);
          sendChatMessage(player + " banned" + (reason ? " for " + reason : ""));
        }
      } else {
        log.info("Invalid battleTag");
      }
    }
  }

  function unBanPlayer(player: string, admin: string) {
    db.prepare(
      "UPDATE banList SET unban_date = DateTime('now') WHERE username = ? AND unban_date IS NULL"
    ).run(player);
    log.info("Unbanned " + player + " by " + admin);
    sendWindow("action", { value: "Unbanned " + player + " by " + admin });
  }

  function addAdmin(
    player: string,
    admin: string,
    region: Regions | "client",
    role: "moderator" | "admin" = "moderator"
  ) {
    if (checkRole(admin, "admin")) {
      if (player.match(/^\D\S{2,11}#\d{4,8}$/i)) {
        removeAdmin(player);
        db.prepare(
          "INSERT INTO adminList (username, admin, region, role) VALUES (?, ?, ?, ?)"
        ).run(player, admin, region, role);
        log.info("Added " + player + " to " + role + " by " + admin);
        sendWindow("action", {
          value: "Added " + player + " to " + role + " by " + admin,
        });
      } else {
        log.info("Invalid battleTag");
      }
    } else {
      log.info(admin + " is not an admin");
    }
  }

  function removeAdmin(player: string) {
    if (checkRole(player, "admin")) {
      db.prepare("DELETE FROM adminList WHERE username = ?").run(player);
      log.info("Removed permissions from " + player);
      sendWindow("action", { value: "Removed permissions from " + player });
    }
  }

  function checkRole(player: string, minPerms: "moderator" | "admin") {
    if (player === gameState.selfBattleTag || "client") {
      return true;
    }
    const targetRole = db
      .prepare("SELECT role FROM adminList WHERE username = ?")
      .get(player).role;
    if (
      minPerms === "moderator" &&
      (targetRole === "admin" || targetRole === "moderator")
    ) {
      return true;
    } else if (minPerms === "admin" && targetRole === "admin") {
      return true;
    }
    return false;
  }

  function cancelVote() {
    if (voteTimer) {
      clearTimeout(voteTimer);
      voteTimer = null;
      sendChatMessage("Vote cancelled.");
    } else {
      sendChatMessage("Vote timed out.");
    }
    if (lobby) {
      lobby.voteStartVotes = [];
    }
  }

  function handleLobbyUpdate(payload: GameClientLobbyPayload) {
    if (payload.teamData.playableSlots > 1) {
      lobby.processLobby(payload, gameState.selfRegion as Regions);
    }
  }

  function cancelStart() {
    sendMessage("LobbyCancel", {});
  }

  function startGame() {
    sendChatMessage("AutoHost functionality provided by WC3 MultiTool.");
    if (settings.autoHost.sounds) {
      playSound("ready.wav");
    }
    log.info("Starting game");
    sendMessage("LobbyStart", {});
  }

  function leaveGame() {
    log.info("Leaving Game");
    sendMessage("LeaveGame", {});
  }

  async function exitGame() {
    log.info("Exit Game");
    if (gameState.menuState === "LOADING_SCREEN") {
      forceQuit();
    } else {
      sendMessage("ExitGame", {});
    }
  }

  async function forceQuit(): Promise<boolean> {
    log.info("Force Quit");
    let { stdout2, stderr2 } = await exec(
      'tasklist /FI "IMAGENAME eq Warcraft III.exe" /FO CSV'
    );
    if (stderr2) {
      log.error(stderr2);
      return false;
    }
    if (stdout2.split("\n").length > 1) {
      log.error("Warcraft III.exe is still running");
      let { stdout, stderr } = await exec('taskkill /F /IM "Warcraft III.exe"');
      if (stderr) {
        log.error(stderr);
        return false;
      }
      await new Promise((r) => setTimeout(r, 100));
      return forceQuit();
    }
    return true;
  }

  function announcement() {
    if (gameState.menuState === "CUSTOM_GAME_LOBBY" && lobby.lobbyStatic?.isHost) {
      let currentTime = Date.now();
      if (
        currentTime >
        lastAnnounceTime + 1000 * settings.autoHost.announceRestingInterval
      ) {
        lastAnnounceTime = currentTime;
        if (
          ["rapidHost", "smartHost"].includes(settings.autoHost.type) &&
          settings.autoHost.announceIsBot
        ) {
          let text = "Welcome. I am a bot.";
          if (lobby.eloAvailable) {
            text += " I will fetch ELO from " + settings.elo.type + ".";
            if (settings.elo.balanceTeams) {
              text += " I will try to balance teams before we start.";
            }
          }
          if (["smartHost", "rapidHost".includes(settings.autoHost.type)]) {
            text += " I will start when slots are full.";
          }
          if (settings.autoHost.voteStart) {
            text += " You can vote start with ?votestart";
          }
          sendChatMessage(text);
          if (settings.autoHost.announceCustom) {
            sendChatMessage(settings.autoHost.customAnnouncement);
          }
        } else if (
          settings.autoHost.type === "lobbyHost" &&
          settings.autoHost.announceCustom
        ) {
          sendChatMessage(settings.autoHost.customAnnouncement);
        }
      }
    }
  }

  function sendWindow(
    messageType: WindowReceive["messageType"],
    message: WindowReceive["data"]
  ) {
    if (win?.webContents) {
      win.webContents.send("fromMain", <WindowReceive>{
        messageType: messageType,
        data: message,
      });
    }
  }

  function sendSocket(messageType = "info", data: string | object = "none") {
    if (socket) {
      socket.send(JSON.stringify({ messageType: messageType, data: data }));
    }
  }

  function playSound(file: string) {
    if (!app.isPackaged) {
      play(path.join(__dirname, "sounds\\" + file));
    } else {
      play(path.join(app.getAppPath(), "\\..\\..\\sounds\\" + file));
    }
  }

  async function findQuit() {
    if ((inGame || gameState.menuState === "LOADING_SCREEN") && socket?.OPEN) {
      await activeWindowWar();
      if (warcraftInFocus) {
        let foundTarget = false;
        let searchFiles = ["quitNormal.png", "quitHLW.png"];

        for (const file of searchFiles) {
          try {
            const foundImage = await screen.find(imageResource(file));
            if (foundImage) {
              foundTarget = true;
              break;
            }
          } catch (e) {
            log.error(e);
          }
        }
        if (foundTarget) {
          leaveGame();
          if (settings.autoHost.sounds) {
            playSound("quit.wav");
          }
        } else if (settings.autoHost.leaveAlternate) {
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
            //log.error(e);
          }
          try {
            const foundImage = await screen.find(imageResource("soloObserver.png"), {
              confidence: 0.8,
            });
            if (foundImage) {
              foundTarget = true;
            }
          } catch (e) {
            console.log(e);
            //log.error(e);
          }
          keyboard.type(Key.Escape);
          if (foundTarget) {
            leaveGame();
            if (settings.autoHost.sounds) {
              playSound("quit.wav");
            }
          }
          //log.verbose("Did not find quit, try again in 5 seconds");
        }
      }
      setTimeout(findQuit, 5000);
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
      clientWebSocket.send(JSON.stringify({ message: message, payload: payload }));
    }
  }

  function sendChatMessage(content: string) {
    if (typeof content === "string" && content.length > 0 && content.length <= 255) {
      sentMessages.push(content);
      sendMessage("SendGameChatMessage", {
        content,
      });
    }
  }

  async function activeWindowWar() {
    const warcraftOpenCheck = await isWarcraftOpen();
    let height = 1080;
    if (warcraftIsOpen && !warcraftOpenCheck) {
      warcraftIsOpen = warcraftOpenCheck;
      new Notification({
        title: "Warcraft is not open",
        body: "An action was attempted but Warcraft was not open",
      }).show();
      height = await screen.height();
    } else {
      warcraftIsOpen = warcraftOpenCheck;
      let activeWindow = await getActiveWindow();
      let title = await activeWindow.title;
      const focused = title === "Warcraft III";
      // Ensure that a notification is only sent the first time, if warcraft was focused before, but is no longer
      if (!focused && warcraftInFocus) {
        new Notification({
          title: "Warcraft is not in focus",
          body: "An action was attempted but Warcraft was not in focus",
        }).show();
      }
      warcraftInFocus = focused;
      if (warcraftInFocus) {
        warcraftRegion = await activeWindow.region;
        height = warcraftRegion.height;
      }
    }
    setResourceDir(height);
  }

  async function isWarcraftOpen() {
    let windows = await getWindows();
    for (let window of windows) {
      let title = await window.title;
      if (title === "Warcraft III") return true;
    }
    return false;
  }

  async function openWarcraft(region: Regions | "" = "") {
    shell.openPath(warInstallLoc + "\\_retail_\\x86_64\\Warcraft III.exe");
    let battleNetWindow;
    let windows = await getWindows();
    for (let window of windows) {
      let title = await window.title;
      if (title === "Battle.net") battleNetWindow = window;
    }
    if (!battleNetWindow) {
      setTimeout(openWarcraft, 1000);
      return;
    }
    let activeWindow = await getActiveWindow();
    let activeWindowTitle = await activeWindow.title;
    if (activeWindowTitle !== "Battle.net") {
      setTimeout(openWarcraft, 1000);
      return;
    }
    let searchRegion = await activeWindow.region;
    let screenSize = { width: await screen.width(), height: await screen.height() };
    if (searchRegion.left < 0) {
      //Battle.net window left of screen
      let targetPosition = new Point(
        searchRegion.left + searchRegion.width - searchRegion.width * 0.12,
        searchRegion.top + 10
      );
      await mouse.setPosition(targetPosition);
      await mouse.pressButton(0);
      await mouse.move(right(searchRegion.left * -1 + 10));
      await mouse.releaseButton(0);
      searchRegion = await activeWindow.region;
    }
    if (searchRegion.left + searchRegion.width > screenSize.width) {
      //Battle.net window right of screen
      let targetPosition = new Point(searchRegion.left + 10, searchRegion.top + 10);
      await mouse.setPosition(targetPosition);
      await mouse.pressButton(0);
      await mouse.move(
        left(searchRegion.left - (screenSize.width - searchRegion.width) + 10)
      );
      await mouse.releaseButton(0);
      searchRegion = await activeWindow.region;
    }
    if (searchRegion.top + searchRegion.height > screenSize.height) {
      //Battle.net window bottom of screen
      let targetPosition = new Point(
        searchRegion.left + searchRegion.width / 2,
        searchRegion.top + 10
      );
      await mouse.setPosition(targetPosition);
      await mouse.pressButton(0);
      await mouse.move(
        up(searchRegion.top - (screenSize.height - searchRegion.height) + 10)
      );
      await mouse.releaseButton(0);
      searchRegion = await activeWindow.region;
    }
    if (searchRegion.top < 0) {
      // Battle.net window top of screen
      return;
    }
    searchRegion.width = searchRegion.width * 0.5;
    searchRegion.height = searchRegion.height * 0.5;
    searchRegion.top = searchRegion.top + searchRegion.height;
    if (!region && settings.autoHost.regionChange) {
      region = getTargetRegion(
        settings.autoHost.regionChangeTimeEU,
        settings.autoHost.regionChangeTimeNA
      );
    }
    let targetRegion = { asia: 1, eu: 2, us: 3, "": 0 }[region];
    if (targetRegion > 0 && gameState.selfRegion !== region) {
      screen
        .find(imageResource("changeRegion.png"), { searchRegion, confidence: 0.85 })
        .then((result) => {
          centerOf(result).then((regionPosition) => {
            mouse.setPosition(regionPosition).then(() =>
              mouse.leftClick().then(() => {
                let newRegionPosition = new Point(
                  regionPosition.x,
                  regionPosition.y - result.height * targetRegion - result.height / 2
                );
                mouse.setPosition(newRegionPosition).then(() => {
                  mouse.leftClick().then(() => {
                    screen
                      .find(imageResource("play.png"), { searchRegion, confidence: 0.85 })
                      .then((result) => {
                        centerOf(result).then((position) => {
                          mouse.setPosition(position).then(() => mouse.leftClick());
                        });
                      });
                  });
                });
              })
            );
          });
        })
        .catch((e) => {
          log.error(e);
        });
    } else {
      screen
        .find(imageResource("play.png"), { searchRegion, confidence: 0.85 })
        .then((result) => {
          centerOf(result).then((position) => {
            mouse.setPosition(position).then(() => mouse.leftClick());
          });
        })
        .catch((e) => {
          log.error(e);
        });
    }
  }

  function setResourceDir(height: number) {
    let targetRes = "1080/";
    if (height > 1440) {
      targetRes = "2160/";
    } else if (height < 900) {
      targetRes = "720/";
    }
    if (!app.isPackaged) {
      screen.config.resourceDirectory = path.join(__dirname, "images", targetRes);
    } else {
      screen.config.resourceDirectory = path.join(
        app.getAppPath(),
        "\\..\\..\\images",
        targetRes
      );
    }
  }
}
