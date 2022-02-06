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
  straightTo,
  Region,
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
// @ts-ignore
//import translate from "translate";
import { DisClient } from "./disc";
import { SEClient, SEEvent } from "./stream";
import { WarLobby } from "./lobby";
import { OBSSocket } from "./obs";
import parser from "w3gjs";
const FormData = require("form-data");
const franc = require("franc-min");
const translate = require("translate-google");
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
  log.catchErrors();

  screen.config.confidence = 0.8;
  keyboard.config.autoDelayMs = 25;
  screen.height().then((height) => {
    setResourceDir(height);
  });

  if (!app.isPackaged) {
    screen.config.autoHighlight = true;
    screen.config.highlightDurationMs = 1500;
    screen.config.highlightOpacity = 0.75;
  }

  //translate.engine = "libre";
  //translate.key = "YOUR-KEY-HERE";

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
  var webUISocket: WebSocket | null = null;
  var clientWebSocket: WebSocket;
  var commSocket: WebSocket | null = null;
  var hubWebSocket: WebSocket | null;
  var warcraftInFocus = false;
  var warcraftIsOpen = false;
  var warcraftRegion: Region;
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
  var obsSocket: OBSSocket | null = null;
  var seClient: SEClient | null = null;
  var sendingInGameChat: { active: boolean; queue: Array<string> } = {
    active: false,
    queue: [],
  };

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
      moveToTeam: store.get("autoHost.moveToTeam") ?? "",
      rapidHostTimer: store.get("autoHost.rapidHostTimer") ?? 0,
      smartHostTimeout: store.get("autoHost.smartHostTimeout") ?? 0,
      voteStart: store.get("autoHost.voteStart") ?? false,
      voteStartPercent: store.get("autoHost.voteStartPercent") ?? 60,
      voteStartTeamFill: store.get("autoHost.voteStartTeamFill") ?? true,
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
      enabled: store.get("obs.enabled") ?? false,
      sceneSwitchType: store.get("obs.sceneSwitchType") ?? "off",
      inGameHotkey: store.get("obs.inGameHotkey") ?? false,
      outOfGameHotkey: store.get("obs.outOfGameHotkey") ?? false,
      inGameWSScene: store.get("obs.inGameWSScene") ?? "",
      outOfGameWSScene: store.get("obs.outOfGameWSScene") ?? "",
      address: store.get("obs.obsAddress") ?? "",
      token: store.get("obs.obsPassword") ?? "",
      autoStream: store.get("obs.autoStream") ?? false,
      textSource: store.get("obs.textSource") ?? false,
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
      enabled: store.get("discord.enabled") ?? false,
      token: store.get("discord.token") ?? "",
      announceChannel: store.get("discord.announceChannel") ?? "",
      chatChannel: store.get("discord.chatChannel") ?? "",
      bidirectionalChat: store.get("discord.bidirectionalChat") ?? false,
      sendInGameChat: store.get("discord.sendInGameChat") ?? false,
    },
    client: {
      restartOnUpdate: store.get("client.restartOnUpdate") ?? false,
      checkForUpdates: store.get("client.checkForUpdates") ?? true,
      performanceMode: store.get("client.performanceMode") ?? false,
      openWarcraftOnStart: store.get("client.openWarcraftOnStart") ?? false,
      startOnLogin: store.get("client.startOnLogin") ?? false,
      commAddress: store.get("client.commAddress") ?? "",
      language: store.get("client.language") ?? "en",
    },
    streaming: {
      enabled: store.get("streaming.enabled") ?? false,
      seToken: store.get("streaming.seToken") ?? "",
      sendTipsInGame: store.get("streaming.sendTipsInGame") ?? false,
      minInGameTip: store.get("streaming.minInGameTip") ?? 1,
      sendTipsInDiscord: store.get("streaming.sendTipsInDiscord") ?? false,
      sendTipsInLobby: store.get("streaming.sendTipsInLobby") ?? false,
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

  async function protocolHandler(url: string) {
    if (url) {
      openLobbyParams = getQueryVariables(url.split("?", 2)[1]);
      if (openLobbyParams.lobbyName || openLobbyParams.gameId) {
        log.info(openLobbyParams);
        if (await isWarcraftOpen()) {
          if (
            openLobbyParams?.region &&
            openLobbyParams?.region !== gameState.selfRegion
          ) {
            log.info(`Changing region to ${openLobbyParams.region}`);
            await exitGame();
            openWarcraft(openLobbyParams?.region);
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
            openWarcraft(openLobbyParams?.region);
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

  function updateSetting(setting: keyof AppSettings, key: SettingsKeys, value: any) {
    if (
      // @ts-ignore
      settings[setting]?.[key] !== undefined &&
      // @ts-ignore
      (typeof settings[setting][key] === typeof value ||
        ((key === "inGameHotkey" || key === "outOfGameHotkey") &&
          (typeof value === "boolean" || typeof value === "object"))) &&
      // @ts-ignore
      settings[setting][key] !== value
    ) {
      // @ts-ignore
      settings[setting][key] = value;
      if (setting === "discord") {
        if (key === "enabled" || key === "token") {
          discordSetup();
        } else if (key === "announceChannel" || key === "chatChannel") {
          discClient?.updateChannel(value, key);
        } else if (key === "bidirectionalChat" && discClient) {
          discClient.bidirectionalChat = value;
        }
      } else if (setting === "streaming" && (key === "seToken" || key === "enabled")) {
        seSetup();
      } else if (
        setting === "obs" &&
        (key === "enabled" || key === "address" || key === "token")
      ) {
        obsSetup();
      } else if (key === "commAddress") {
        commSetup();
      }
      if (lobby) {
        let updateKey: keyof LobbyAppSettings;
        if (setting === "elo" && key === "type") {
          updateKey = "eloType";
        } else {
          updateKey = key as keyof LobbyAppSettings;
        }
        lobby.updateSetting(updateKey, value);
      }
      if (key === "performanceMode") {
        togglePerformanceMode(value);
      }
      if (key === "startOnLogin") {
        app.setLoginItemSettings({
          openAtLogin: value,
        });
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
      log.info(
        setting + " settings changed:",
        key,
        key.toLowerCase().includes("token") ? "*HIDDEN*" : value
      );
      //@ts-ignore
    } else if (settings[setting][key] !== value) {
      log.warn(
        "Invalid update:",
        setting,
        key,
        key.toLowerCase().includes("token") ? "*HIDDEN*" : value
      );
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
    togglePerformanceMode(settings.client.performanceMode);
    if (app.isPackaged) {
      setInterval(() => {
        if (settings.client.checkForUpdates) {
          autoUpdater.checkForUpdatesAndNotify();
        }
      }, 30 * 60 * 1000);
    }
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
    seSetup();
    commSetup();
    obsSetup();
    appVersion = app.getVersion();
    wss = new WebSocket.Server({ port: 8888 });
    wss.on("connection", function connection(ws) {
      log.info("Connection");
      webUISocket = ws;
      sendSocket("autoHost", settings.autoHost);
      sendStatus(true);
      ws.on("message", handleWebUIMessage);
      ws.on("close", function close() {
        log.warn("Socket closed");
        webUISocket = null;
        sendProgress();
        sendStatus(false);
        handleGlueScreen("Out of menus");
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
    } else if (settings.client.openWarcraftOnStart) {
      setTimeout(openWarcraft, 3000);
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
      if (app.isPackaged) log.warn("Failed hub connection", error);
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
    if (hubWebSocket?.OPEN) {
      sendToHub("heartbeat");
      setTimeout(hubHeartbeat, 30000);
    }
  }

  function seSetup() {
    if (settings.streaming.enabled) {
      if (settings.streaming.seToken.length > 20) {
        seClient = new SEClient(settings.streaming.seToken);
        seClient.on("tip", (data: SEEvent["event"]) => {
          if (!Array.isArray(data)) {
            let tipMessage = `${data.name} tipped $${data.amount}${
              data.message ? ": " + data.message : ""
            }`;
            log.info(tipMessage);
            if (data.amount >= settings.streaming.minInGameTip) {
              if (settings.streaming.sendTipsInDiscord && discClient?.chatChannel) {
                discClient.sendMessage(tipMessage);
              }
              if (inGame) {
                if (settings.streaming.sendTipsInGame) {
                  sendInGameChat(tipMessage);
                } else {
                  log.info("Tip sent while in game, which is not currently permitted.");
                }
              } else if (settings.streaming.sendTipsInLobby) {
                sendChatMessage(tipMessage);
              }
            } else {
              log.info("Tip doesn't meet minimum threshold.");
            }
          } else {
            log.warn("Unknown tip data");
          }
        });
        seClient.on("error", (data: string) => {
          log.warn(data);
        });
        seClient.on("info", (data: string) => {
          log.info(data);
        });
      } else {
        seClient = null;
      }
    } else {
      seClient = null;
    }
  }

  function discordSetup() {
    if (
      settings.discord.enabled &&
      settings.discord.token.length > 20 &&
      (settings.discord.announceChannel || settings.discord.chatChannel)
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
        if (settings.discord.sendInGameChat) {
          sendInGameChat("(DC)" + author + ": " + message);
        }
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
      settings.autoHost.moveToTeam,
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
        if (settings.obs.textSource) {
          fs.writeFileSync(
            path.join(app.getPath("documents"), "wc3mt.txt"),
            lobby.exportTeamStructureString()
          );
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
      } else if (update.stale) {
        leaveGame();
      } else if (update.playerLeft) {
        log.info("Player left: " + update.playerLeft);
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
            log.info("Player joined: " + update.playerJoined.name);
            announcement();
          }
        } else {
          log.warn("Nameless player joined");
        }
      } else if (update.lobbyReady) {
        if (lobby?.lobbyStatic?.isHost) {
          if (
            settings.autoHost.type === "smartHost" ||
            settings.autoHost.type === "rapidHost"
          ) {
            sendProgress("Starting Game", 100);
            // Wait a quarter second to make sure no one left
            setTimeout(() => {
              if (lobby.isLobbyReady()) {
                playSound("ready.wav");
                startGame();
              }
            }, 250);
          } else if (settings.autoHost.sounds) {
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
      log.warn(data);
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
    commSend("settings", JSON.stringify({ settings }));
  }

  async function triggerOBS() {
    if (settings.obs.enabled) {
      if (settings.obs.sceneSwitchType === "hotkeys") {
        if (inGame && settings.obs.inGameHotkey) {
          log.info("Triggering OBS In-Game");
          let modifiers: Array<Key> = [];
          if (settings.obs.inGameHotkey) {
            if (settings.obs.inGameHotkey.altKey) {
              modifiers.push(Key.LeftAlt);
            }
            if (settings.obs.inGameHotkey.ctrlKey) {
              modifiers.push(Key.LeftControl);
            }
            if (settings.obs.inGameHotkey.shiftKey) {
              modifiers.push(Key.LeftShift);
            }
            try {
              await keyboard.type(
                ...modifiers,
                // @ts-ignore
                Key[settings.obs.inGameHotkey.key.toUpperCase()]
              );
            } catch (e) {
              log.warn("Failed to trigger OBS In-Game", e);
            }
          }
        } else if (!inGame && settings.obs.outOfGameHotkey) {
          log.info("Triggering OBS Out of Game");
          let modifiers: Array<Key> = [];
          if (settings.obs.outOfGameHotkey.altKey) {
            modifiers.push(Key.LeftAlt);
          }
          if (settings.obs.outOfGameHotkey.ctrlKey) {
            modifiers.push(Key.LeftControl);
          }
          if (settings.obs.outOfGameHotkey.shiftKey) {
            modifiers.push(Key.LeftShift);
          }
          try {
            await keyboard.type(
              ...modifiers,
              // @ts-ignore
              Key[settings.obs.outOfGameHotkey.key.toUpperCase()]
            );
          } catch (e) {
            log.warn("Failed to trigger OBS Out of Game", e);
          }
        }
      } else if (settings.obs.sceneSwitchType === "websockets") {
        console.log("Sending OBS Scene Switch");
        if (obsSocket) {
          if (inGame && settings.obs.inGameWSScene) {
            log.info("Triggering OBS In-Game");
            obsSocket.switchScene(settings.obs.inGameWSScene);
          } else if (!inGame && settings.obs.outOfGameWSScene) {
            log.info("Triggering OBS Out of Game");
            obsSocket.switchScene(settings.obs.outOfGameWSScene);
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
    let data = JSON.parse(message) as { messageType: string; data: any };
    switch (data.messageType) {
      case "state":
        if (data.data.menuState) {
          setTimeout(() => {
            handleGlueScreen(data.data.menuState);
            gameState = data.data;
          }, 250);
        } else {
          gameState = data.data;
        }
        break;
      case "sendMessage":
        if (data.data.message === "StopGameAdvertisements") {
          if (gameState.menuState !== "LOADING_SCREEN" && lobby.lookupName) {
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
        settings.autoHost.type = settings.autoHost.type === "off" ? "lobbyHost" : "off";
        store.set("autoHost", settings.autoHost);
        sendSocket("autoHost", settings.autoHost);
      //sendWindow("autoHost", settings.autoHost);
      case "error":
        log.warn(data);
        win.webContents.send("fromMain", data);
        break;
      case "echo":
        log.verbose(data);
        break;
      case "info":
        log.info(JSON.stringify(data.data));
        break;
      default:
        log.info(data);
    }
  }

  async function autoHostGame() {
    if (settings.autoHost.type !== "off") {
      let targetRegion = gameState.selfRegion;
      if (settings.autoHost.regionChange) {
        targetRegion = getTargetRegion(
          settings.autoHost.regionChangeTimeEU,
          settings.autoHost.regionChangeTimeNA
        );
      }
      if (gameState.selfRegion && targetRegion && gameState.selfRegion !== targetRegion) {
        log.info(`Changing autohost region to ${targetRegion}`);
        await exitGame();
        openWarcraft(targetRegion);
        return true;
      } else {
        if (settings.autoHost.increment) {
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
    if (!(await isWarcraftOpen())) {
      await openWarcraft();
    }
    if (
      !lobby.lobbyStatic?.lobbyName &&
      !inGame &&
      !["CUSTOM_GAME_LOBBY", "LOADING_SCREEN", "GAME_LOBBY"].includes(gameState.menuState)
    ) {
      if ((callCount + 5) % 10 === 0) {
        if (settings.autoHost.increment) {
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
          settings.autoHost.gameName +
            (settings.autoHost.increment ? ` #${gameNumber}` : "");
        const payloadData = customGameData || {
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
      await sleep(1000);
      return await createGame(false, callCount + 1, lobbyName);
    } else if (lobby.lobbyStatic?.lobbyName === lobbyName) {
      log.info("Game successfully created");
      return true;
    } else if (!lobby.lobbyStatic?.lobbyName.includes(settings.autoHost.gameName)) {
      log.info("Game created with incorrect increment.");
      return true;
    } else {
      log.warn("Failed to create game?");
      return false;
    }
  }

  async function handleGlueScreen(newScreen: string) {
    // Create a new game at menu or if previously in game(score screen loads twice)
    if (
      !newScreen ||
      newScreen === "null" ||
      (newScreen === gameState.menuState && newScreen !== "SCORE_SCREEN")
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
      if (settings.autoHost.type === "rapidHost") {
        if (settings.autoHost.rapidHostTimer === 0) {
          log.info("Rapid Host leave game immediately");
          leaveGame();
        } else if (settings.autoHost.rapidHostTimer === -1) {
          log.info("Rapid Host exit game immediately");
          await forceQuitWar();
          openWarcraft();
        }
      }
    } else if (gameState.menuState === "LOADING_SCREEN" && newScreen === "SCORE_SCREEN") {
      log.info("Game has finished loading in.");
      inGame = true;
      if (settings.autoHost.type === "smartHost") {
        log.info("Setting up smart host.");
        setTimeout(findQuit, 15000);
      }
      triggerOBS();
      if (
        settings.autoHost.type === "rapidHost" &&
        settings.autoHost.rapidHostTimer > 0
      ) {
        log.info("Setting rapid host timer to " + settings.autoHost.rapidHostTimer);
        setTimeout(leaveGame, settings.autoHost.rapidHostTimer * 1000 * 60);
      }
      let screenHeight = await screen.height();
      let safeZone = new Point(
        (await screen.width()) / 2,
        screenHeight - screenHeight / 4
      );
      await mouse.move(straightTo(safeZone));
      sendInGameChat("");
    } else if (newScreen === "LOGIN_DOORS") {
      if (settings.client.performanceMode) {
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
    gameState.menuState = newScreen;
    sendWindow("menusChange", { value: gameState.menuState });
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
              gameState.screenState = data.payload.screen;
              break;
            case "SetGlueScreen":
              if (data.payload.screen) {
                handleGlueScreen(data.payload.screen);
              }
              break;
            case "OnNetProviderInitialized":
              if (settings.client.performanceMode) {
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
              if (gameState.menuState === "GAME_LOBBY") {
                setTimeout(() => {
                  handleGlueScreen("CUSTOM_LOBBIES");
                }, 1000);
              }
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
                  //console.log(JSON.stringify(data));
                }
              }
          }
        }
      );
      clientWebSocket.on("close", function close() {
        clearLobby();
        log.warn("Game client connection closed!");
        setTimeout(async () => {
          if (await checkProcess("BlizzardError.exe")) {
            log.warn("BlizzardError.exe is running, restarting.");
            await forceQuitProcess("BlizzardError.exe");
            openWarcraft();
          }
        }, 1000);
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
    // TODO: fix lobby close if game was started
    if (refreshTimer) clearInterval(refreshTimer);
    sentMessages = [];
    if (gameState.menuState !== "LOADING_SCREEN" && lobby.lobbyStatic?.lobbyName) {
      sendWindow("lobbyUpdate", { lobbyData: { leftLobby: true } });
      sendToHub("lobbyUpdate", { leftLobby: true });
      discClient?.lobbyClosed();
    }
    lobby?.clear();
  }

  async function openParamsJoin() {
    // TODO: make this more robust
    if (
      openLobbyParams?.lobbyName ||
      (openLobbyParams?.gameId && openLobbyParams.mapFile)
    ) {
      log.info("Setting autoHost to off to join a lobby link.");
      updateSetting("autoHost", "type", "off");
      if (
        (openLobbyParams.region && openLobbyParams.region !== gameState.selfRegion) ||
        gameState.menuState === "LOADING_SCREEN"
      ) {
        log.info(`Changing region to match lobby of region ${openLobbyParams.region}`);
        await exitGame();
        openWarcraft(openLobbyParams.region);
        return;
      }
      if (inGame || lobby.lookupName) {
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
        if (
          sender === gameState.selfBattleTag &&
          payload.message.content.match(/^(executed '!)|(Unknown command ')|(Command ')/i)
        ) {
          return;
        }
        if (!lobby.newChat(payload.message.sender, payload.message.content)) return;
        if (payload.message.content.match(/^\?votestart$/i)) {
          if (
            settings.autoHost.voteStart &&
            lobby.voteStartVotes &&
            lobby.lobbyStatic?.isHost &&
            ["rapidHost", "smartHost"].includes(settings.autoHost.type)
          ) {
            if (!lobby.allPlayers.includes(sender)) {
              sendChatMessage("Only players may vote start.");
              return;
            }
            if (lobby.voteStartVotes.length === 0) {
              if (
                (settings.autoHost.voteStartTeamFill &&
                  lobby.allPlayerTeamsContainPlayers()) ||
                !settings.autoHost.voteStartTeamFill
              ) {
                voteTimer = setTimeout(cancelVote, 60000);
                sendChatMessage("You have 60 seconds to ?votestart.");
              } else {
                sendChatMessage("Unavailable. Not all teams have players.");
                return;
              }
            }
            if (!lobby.voteStartVotes.includes(sender) && voteTimer) {
              lobby.voteStartVotes.push(sender);
              if (
                lobby.voteStartVotes.length >=
                lobby.nonSpecPlayers.length * (settings.autoHost.voteStartPercent / 100)
              ) {
                log.info("Vote start succeeded");
                startGame();
              } else {
                sendChatMessage(
                  Math.ceil(
                    lobby.nonSpecPlayers.length *
                      (settings.autoHost.voteStartPercent / 100) -
                      lobby.voteStartVotes.length
                  ).toString() + " more vote(s) required."
                );
              }
            }
          }
        } else if (payload.message.content.match(/^\?stats/)) {
          if (
            lobby.lobbyStatic?.isHost &&
            settings.elo.type !== "off" &&
            lobby.eloAvailable
          ) {
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
        } else if (payload.message.content.match(/^\?sp$/i)) {
          // TODO: Shuffle players
          if (lobby.lobbyStatic?.isHost && checkRole(sender, "moderator")) {
            let players = lobby.nonSpecPlayers;
            Object.values(players).forEach((player) => {
              sendChatMessage(
                "!swap " +
                  player +
                  " " +
                  players[Math.floor(Math.random() * players.length)]
              );
            });
          }
        } else if (payload.message.content.match(/^\?sf$/i)) {
          // TODO: Shuffle teams
          if (lobby.lobbyStatic?.isHost && checkRole(sender, "moderator")) {
            let players = lobby.exportTeamStructure();
          }
        } else if (payload.message.content.match(/^\?start$/i)) {
          if (lobby.lobbyStatic?.isHost && checkRole(sender, "moderator")) {
            startGame();
          }
        } else if (payload.message.content.match(/^\?a$/i)) {
          if (lobby.lobbyStatic?.isHost && checkRole(sender, "moderator")) {
            cancelStart();
          }
        } else if (payload.message.content.match(/^\?closeall$/i)) {
          if (lobby.lobbyStatic?.isHost && checkRole(sender, "moderator")) {
            sendChatMessage("!closeall");
          }
        } else if (payload.message.content.match(/^\?hold$/i)) {
          if (lobby.lobbyStatic?.isHost && checkRole(sender, "moderator")) {
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
          if (lobby.lobbyStatic?.isHost && checkRole(sender, "moderator")) {
            sendChatMessage("!openall");
          }
        } else if (payload.message.content.match(/^\?swap/i)) {
          if (lobby.lobbyStatic?.isHost && checkRole(sender, "moderator")) {
            let [command, ...args] = payload.message.content.split(" ");
            if (args.length === 2) {
              if (
                (isInt(args[1], 25) || lobby.searchPlayer(args[1]).length === 1) &&
                (isInt(args[0], 25) || lobby.searchPlayer(args[0]).length === 1)
              ) {
                sendChatMessage("!swap " + args[1] + " " + args[0]);
              } else {
                sendChatMessage("All swap players not found, or too many matches.");
              }
            } else {
              sendChatMessage("Invalid swap arguments");
            }
          }
        } else if (payload.message.content.match(/^\?handi/i)) {
          if (lobby.lobbyStatic?.isHost && checkRole(sender, "moderator")) {
            if (payload.message.content.split(" ").length === 3) {
              var target = payload.message.content.split(" ")[1];
              var handicap = parseInt(payload.message.content.split(" ")[2]);
              if (handicap) {
                if (isInt(target, 25)) {
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
              if (isInt(target, 25) && parseInt(target) > 0) {
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
              if (isInt(target, 25) && parseInt(target) > 0) {
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
              if (isInt(target, 25) && parseInt(target) > 0) {
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
              if (isInt(banTarget, 25) && parseInt(banTarget) > 0) {
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
                let targets = lobby.searchPlayer(target);
                if (targets.length === 1) {
                  if (addAdmin(targets[0], sender, lobby.region, perm)) {
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
              sendChatMessage("Target required, or perm incorrect");
            }
          }
        } else if (payload.message.content.match(/^\?unperm/i)) {
          if (lobby.lobbyStatic?.isHost && checkRole(sender, "admin")) {
            var target = payload.message.content.split(" ")[1];
            if (target) {
              if (target.match(/^\D\S{2,11}#\d{4,8}$/)) {
                sendChatMessage("Removed perm from out of lobby player: " + target);
                removeAdmin(target, sender);
              } else {
                let targets = lobby.searchPlayer(target);
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
          if (lobby.lobbyStatic?.isHost && checkRole(sender, "admin")) {
            var target = payload.message.content.split(" ")[1];
            if (target) {
              target = target.toLowerCase();
              if (["off", "rapid", "lobby", "smart"].includes(target)) {
                if (target !== "off") {
                  target += "Host";
                }
                sendChatMessage("Setting autohost type to: " + target);
                updateSetting("autoHost", "type", target);
              } else {
                sendChatMessage("Invalid autohost type");
              }
            } else {
              sendChatMessage("Autohost current type: " + settings.autoHost.type);
            }
          } else {
            sendChatMessage("You do not have permission to use this command.");
          }
        } else if (payload.message.content.match(/^\?(help)|(commands)/i)) {
          if (lobby.lobbyStatic?.isHost) {
            if (lobby.eloAvailable) {
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
              sendChatMessage(
                "?close<?all> <name|slotNumber>: Closes all / a slot/player"
              );
              sendChatMessage(
                "?handi <name|slotNumber> <50|60|70|80|100>: Sets slot/player handicap"
              );
              sendChatMessage("?hold <name>: Holds a slot");
              sendChatMessage("?kick <name|slotNumber> <?reason>: Kicks a slot/player");
              sendChatMessage("?<un>mute <player>: Mutes/unmutes a player");
              sendChatMessage(
                "?open<?all> <name|slotNumber> <?reason>: Opens all / a slot/player"
              );
              sendChatMessage("?unban <name>: Un-bans a player");
              sendChatMessage("?start: Starts game");
              sendChatMessage("?swap <name|slotNumber> <name|slotNumber>: Swaps players");
            }
            if (checkRole(sender, "admin")) {
              sendChatMessage(
                "?perm <name> <?admin|mod>: Promotes a player to admin or moderator (mod by default)"
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
        var detectedLanguage = franc(payload.message.content, { minLength: 5 });
        if (
          settings.client.language &&
          !payload.message.content.startsWith("?") &&
          ![settings.client.language, "und"].includes(detectedLanguage)
        ) {
          log.verbose(
            "Translating '" + payload.message.content + "' from " + detectedLanguage
          );
          try {
            translatedMessage = await translate(payload.message.content, {
              to: settings.client.language,
            });
          } catch (e) {
            log.error(e);
          }
        }
        if (!settings.autoHost.private || !app.isPackaged) {
          sendToHub("lobbyUpdate", {
            chatMessage: {
              name: sender,
              message:
                payload.message.content +
                ": " +
                (translatedMessage ? translatedMessage : payload.message.content),
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
        if (lobby?.allPlayers.includes(player)) {
          lobby.banPlayer(player);
          sendChatMessage(player + " banned" + (reason ? " for " + reason : ""));
        }
      } else {
        log.warn("Failed to ban, invalid battleTag: " + player);
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
      log.info(admin + " is not an admin and can not set perms.");
      return false;
    }
  }

  function removeAdmin(player: string, admin: string) {
    if (checkRole(admin, "admin")) {
      if (player.match(/^\D\S{2,11}#\d{4,8}$/i)) {
        if (checkRole(player, "moderator")) {
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

  function checkRole(player: string, minPerms: "moderator" | "admin") {
    if (!player) return false;
    if (player === gameState.selfBattleTag || player === "client") {
      return true;
    }
    const targetRole = db
      .prepare("SELECT role FROM adminList WHERE username = ?")
      .get(player)?.role;
    if (targetRole) {
      if (
        minPerms === "moderator" &&
        (targetRole === "admin" || targetRole === "moderator")
      ) {
        return true;
      } else if (minPerms === "admin" && targetRole === "admin") {
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
    log.info("Cancelling start");
    sendMessage("LobbyCancel", {});
  }

  function startGame() {
    sendChatMessage("AutoHost functionality provided by WC3 MultiTool.");
    log.info("Starting game");
    sendMessage("LobbyStart", {});
  }

  async function leaveGame() {
    log.info("Leaving Game");
    sendMessage("LeaveGame", {});
    if (
      (inGame || ["GAME_LOBBY", "CUSTOM_GAME_LOBBY"].includes(gameState.menuState)) &&
      lobby?.lobbyStatic?.lobbyName
    ) {
      let oldLobbyName = lobby.lobbyStatic.lobbyName;
      await sleep(1000);
      if (lobby?.lobbyStatic?.lobbyName === oldLobbyName) {
        log.info("Lobby did not leave, trying again");
        await exitGame();
        openWarcraft();
      }
    }
  }

  async function exitGame(callCount: number = 0): Promise<boolean> {
    if (await isWarcraftOpen()) {
      if (callCount < 5) {
        return await forceQuitWar();
      } else if (gameState.menuState === "LOADING_SCREEN") {
        log.info("Warcraft is loading game, forcing quit");
        return await forceQuitWar();
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

  async function forceQuitWar(): Promise<boolean> {
    return await forceQuitProcess("Warcraft III.exe");
  }

  async function forceQuitProcess(processName: string): Promise<boolean> {
    if (await checkProcess(processName)) {
      log.info(processName + " is still running, forcing quit");
      try {
        let { stdout, stderr } = await exec(`taskkill /F /IM "${processName}"`);
        if (stderr) {
          log.warn(stderr);
          return true;
        }
      } catch (e) {
        await sleep(200);
        return await forceQuitWar();
      }
      await sleep(200);
      return await forceQuitWar();
    } else {
      log.info(processName + " force quit.");
      return true;
    }
  }

  function isInt(string: string, max: number | boolean = false): boolean {
    var isInt = /^-?\d+$/.test(string);
    if (isInt && max !== false) {
      return parseInt(string) <= max;
    }
    return isInt;
  }

  function announcement() {
    if (
      (gameState.menuState === "CUSTOM_GAME_LOBBY" ||
        gameState.menuState === "GAME_LOBBY") &&
      lobby.lobbyStatic?.isHost
    ) {
      let currentTime = Date.now();
      if (
        currentTime >
        lastAnnounceTime + 1000 * settings.autoHost.announceRestingInterval
      ) {
        lastAnnounceTime = currentTime;
        if (["rapidHost", "smartHost"].includes(settings.autoHost.type)) {
          if (settings.autoHost.announceIsBot) {
            let text = "Welcome. I am a bot.";
            if (lobby.eloAvailable && settings.elo.type !== "off") {
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
            if (settings.autoHost.regionChange) {
              text += " I switch regions.";
            }
            sendChatMessage(text);
          }
          if (settings.autoHost.announceCustom && settings.autoHost.customAnnouncement) {
            sendChatMessage(settings.autoHost.customAnnouncement);
          }
        } else if (
          settings.autoHost.type === "lobbyHost" &&
          settings.autoHost.announceCustom &&
          settings.autoHost.customAnnouncement
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
    commSend(messageType, JSON.stringify(message));
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

  async function findQuit() {
    if ((inGame || gameState.menuState === "LOADING_SCREEN") && webUISocket?.OPEN) {
      await activeWindowWar();
      if (warcraftInFocus) {
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
          if (settings.autoHost.sounds) {
            playSound("quit.wav");
          }
        } else if (!lobby.nonSpecPlayers.includes(gameState.selfBattleTag)) {
          if (settings.autoHost.leaveAlternate) {
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
              if (settings.autoHost.sounds) {
                playSound("quit.wav");
              }
            }
            //log.verbose("Did not find quit, try again in 5 seconds");
          } else if (settings.obs.autoStream) {
            if (!sendingInGameChat.active) {
              keyboard.type(Key.Space);
            }
          }
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
      gameState.menuState === "GAME_LOBBY" ||
      gameState.menuState === "CUSTOM_GAME_LOBBY"
    ) {
      if (typeof content === "string" && content.length > 0) {
        let newChatSplit = content.match(/.{1,255}/g);
        console.log("data", newChatSplit);
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
      return activeWindow;
    }
    setResourceDir(height);
  }

  async function isWarcraftOpen() {
    return await checkProcess("Warcraft III.exe");
  }

  async function checkProcess(processName: string) {
    let { stdout, stderr } = await exec(
      `tasklist /NH /FI "STATUS eq RUNNING" /FI "USERNAME ne N/A" /FI "IMAGENAME eq ${processName}"`
    );
    if (stderr) {
      log.warn(stderr);
      return false;
    } else {
      if (stdout.includes(processName)) {
        console.log(`${processName} is running`);
        return true;
      } else {
        console.log(`${processName} is not running`);
        return false;
      }
    }
  }

  async function openWarcraft(
    region: Regions | "" = "",
    callCount = 0,
    focusAttempted = false
  ): Promise<boolean> {
    try {
      if (callCount > 60) {
        log.warn("Failed to open Warcraft after 60 attempts");
      }
      if (await isWarcraftOpen()) {
        log.info("Warcraft is now open");
        return true;
      }
      let battleNetOpen = await checkProcess("Battle.net.exe");
      if (battleNetOpen !== true) {
        shell.openPath(warInstallLoc + "\\_retail_\\x86_64\\Warcraft III.exe");
        await sleep(1000);
        return await openWarcraft(region, callCount + 1);
      }
      let battleNetWindow;
      let windows = await getWindows();
      for (let window of windows) {
        let title = await window.title;
        if (title === "Battle.net Login") {
          await sleep(1000);
          return await openWarcraft(region, callCount + 1);
        }
        if (title === "Blizzard Battle.net Login") {
          log.warn("A login is required to open Warcraft");
          return false;
        }
        if (title === "Battle.net") {
          battleNetWindow = window;
        }
      }
      if (!battleNetWindow) {
        if (callCount % 2 == 0) {
          shell.openPath(warInstallLoc + "\\_retail_\\x86_64\\Warcraft III.exe");
        }
        await sleep(3000);
        return await openWarcraft(region, callCount + 3);
      }
      let activeWindow = await getActiveWindow();
      let activeWindowTitle = await activeWindow.title;
      let screenSize = { width: await screen.width(), height: await screen.height() };
      if (activeWindowTitle !== "Battle.net") {
        let bnetRegion = await battleNetWindow.region;
        if (bnetRegion.left < -bnetRegion.width || bnetRegion.top < -bnetRegion.height) {
          log.info("Battle.net window minimized. Attempting to open the window");
          shell.openPath(warInstallLoc + "\\_retail_\\x86_64\\Warcraft III.exe");
          await sleep(1000);
          return await openWarcraft(region, callCount + 1, false);
        }
        if (!focusAttempted) {
          log.info("Attempting to focus Battle.net");
          if (app.isPackaged) {
            shell.openPath(path.join(app.getAppPath(), "../../focusWar.js"));
          } else {
            shell.openPath(path.join(__dirname, "../focusWar.js"));
          }
          await sleep(1000);
          return await openWarcraft(region, callCount + 1, true);
        } else {
          log.warn("Failed to focus Battle.net");
          return false;
        }
      }
      let searchRegion = await activeWindow.region;
      searchRegion.width = searchRegion.width * 0.4;
      if (searchRegion.left < 0) {
        //Battle.net window left of screen
        log.info("Move Battle.net window right");
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
        log.info("Move Battle.net window left");
        let targetPosition = new Point(searchRegion.left + 10, searchRegion.top + 10);
        await mouse.setPosition(targetPosition);
        await mouse.pressButton(0);
        await mouse.move(
          left(searchRegion.left - (screenSize.width - searchRegion.width) + 10)
        );
        await mouse.releaseButton(0);
      }
      if (searchRegion.top + searchRegion.height > screenSize.height) {
        //Battle.net window bottom of screen
        log.info("Move Battle.net window up");
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
      }
      if (searchRegion.top < 0) {
        // Battle.net window top of screen
        log.warn("Battle.net window in inaccessible region.");
        await forceQuitProcess("Battle.net.exe");
        return await openWarcraft(region, callCount + 1);
      }
      searchRegion = await activeWindow.region;
      searchRegion.height = searchRegion.height * 0.5;
      searchRegion.width = searchRegion.width * 0.4;
      searchRegion.top = searchRegion.top + searchRegion.height;
      if (!region && settings.autoHost.regionChange) {
        region = getTargetRegion(
          settings.autoHost.regionChangeTimeEU,
          settings.autoHost.regionChangeTimeNA
        );
      }
      let targetRegion = { asia: 1, eu: 2, us: 3, "": 0 }[region];
      try {
        if (targetRegion > 0 && gameState.selfRegion !== region) {
          log.info(`Changing region to ${region}`);
          let changeRegionPosition = await screen.waitFor(
            imageResource("changeRegion.png"),
            30000,
            100,
            {
              searchRegion,
              confidence: 0.85,
            }
          );
          let changeRegionPositionCenter = await centerOf(changeRegionPosition);
          await mouse.setPosition(changeRegionPositionCenter);
          await mouse.leftClick();
          let newRegionPosition = new Point(
            changeRegionPositionCenter.x,
            changeRegionPositionCenter.y -
              changeRegionPosition.height * targetRegion -
              changeRegionPosition.height / 2
          );
          await mouse.setPosition(newRegionPosition);
          await mouse.leftClick();
          log.info(`Changed region to ${region}`);
        }
        let playRegionCenter = await centerOf(
          screen.waitFor(imageResource("play.png"), 30000, 100, {
            searchRegion,
            confidence: 0.87,
          })
        );
        await mouse.setPosition(playRegionCenter);
        await mouse.leftClick();
        log.info("Found and clicked play");
        for (let i = 0; i < 10; i++) {
          if (await isWarcraftOpen()) {
            log.info("Warcraft is now open.");
            return true;
          }
          await sleep(100);
        }
      } catch (e) {
        log.warn("Failed image recognition: ", e);
        // Add 5 to call count since OCR takes longer
        return await openWarcraft(region, callCount + 15);
      }
      log.warn("Failed to open Warcraft.");
      return false;
    } catch (e) {
      log.warn(e);
      return false;
    }
  }

  function setResourceDir(height: number) {
    let targetRes = "1080/";
    if (height > 1440) {
      targetRes = "2160/";
    } else if (height < 900) {
      targetRes = "720/";
    }
    mouse.config.mouseSpeed = parseInt(targetRes) * 2;
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
    await activeWindowWar();
    try {
      if (inGame && warcraftInFocus) {
        sendingInGameChat.active = true;
        let nextMessage = sendingInGameChat.queue.shift();
        while (nextMessage) {
          if (inGame && warcraftInFocus) {
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
                inGame +
                " Warcraft in focus: " +
                warcraftInFocus
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

  function obsSetup() {
    if (settings.obs.enabled && settings.obs.sceneSwitchType === "websockets") {
      obsSocket = new OBSSocket({
        address: settings.obs.address,
        password: settings.obs.token,
      });
    }
  }

  function commSend(message: string, payload?: string) {
    if (settings.client.commAddress) {
      if (commSocket) {
        if (commSocket.CONNECTING) {
          setTimeout(() => {
            commSend(message, payload);
          }, 250);
        } else if (commSocket.OPEN) {
          commSocket.send({ message, payload });
        }
      } else {
        log.warn("Comm socket not connected.");
      }
    }
  }

  function commSetup() {
    if (settings.client.commAddress) {
      commSocket = new WebSocket(settings.client.commAddress);
      commSocket.on("open", () => {
        log.info("Connected to comm");
        commSend("settings", JSON.stringify({ settings }));
      });
      commSocket.on("close", () => {
        log.info("Disconnected from comm");
        commSocket = null;
      });
      commSocket.on("error", (error) => {
        log.warn("Error in comm: " + error);
        commSocket = null;
      });
      commSocket.on("message", (message) => {
        commandClient(JSON.parse(message.toString()));
      });
    } else {
      commSocket = null;
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
                  log.warn(e);
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
            log.warn(err.message, err.stack);
          });
        break;
      case "updateSettingSingle":
        let update = args.data?.update;
        if (update) {
          updateSetting(update.setting, update.key, update.value);
        }
        break;
      default:
        log.info("Unknown client command:", args);
        break;
    }
  }
}
