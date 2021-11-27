import { screen, getActiveWindow, mouse, getWindows, centerOf } from "@nut-tree/nut-js";
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
import * as log from "electron-log";
import * as https from "https";
import * as path from "path";
import Store from "electron-store";
import * as robot from "robotjs";
import fs from "fs";
import WebSocket from "ws";
import { play } from "sound-play";
import sqlite3 from "better-sqlite3";

if (!app.isPackaged) {
  require("electron-reload")(__dirname, {
    electron: path.join(__dirname, "../node_modules", ".bin", "electron.cmd"),
    awaitWriteFinish: true,
    hardResetMethod: "exit",
  });
}

require = require("esm")(module);
var { Combination } = require("js-combinatorics");
import type {
  AppSettings,
  WindowSend,
  Lobby,
  PlayerPayload,
  GameClientLobbyPayload,
  GameClientMessage,
  TeamTypes,
  LobbyProcessed,
  WindowReceive,
} from "./utility";
const db = new sqlite3(app.getPath("userData") + "/wc3mt.db");

autoUpdater.logger = log;

screen.config.confidence = 0.65;

log.info("App starting...");

const store = new Store();
const testNonPlayersTeam = /((computer)|(creeps)|(summoned))/i;
const testSpecTeam = /((host)|(spectator)|(observer))/i;

var win: BrowserWindow;
var appIcon: Tray | null;
var currentStatus = false;
var gameNumber = 0;
// @ts-ignore
var lobby: Lobby = {};
var menuState = "Out of Menus";
var inGame = false;
var wss: WebSocket.Server | null = null;
var socket: WebSocket | null = null;
var clientWebSocket: WebSocket;
var hubWebSocket: WebSocket | null;
var warcraftInFocus = false;
var warcraftIsOpen = false;
var warcraftRegion = { left: 0, top: 0, width: 0, height: 0 };
var voteTimer: any;
var openLobbyParams: { lobbyName?: string; gameId?: string; mapFile?: string } | null;
var screenState: string;
var selfBattleTag: string;
var selfRegion: string;
var appVersion: string;

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
    announceRestingInterval: store.get("autoHost.announceRestingInterval") ?? 30,
    moveToSpec: store.get("autoHost.moveToSpec") ?? false,
    rapidHostTimer: store.get("autoHost.rapidHostTimer") ?? 0,
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
  },
  discord: {
    type: store.get("discord.type") ?? "off",
    token: store.get("discord.token") ?? "",
    channel: store.get("discord.channel") ?? "",
  },
};
var identifier = store.get("anonymousIdentifier");
if (!identifier) {
  identifier = nanoid();
  store.set("anonymousIdentifier", identifier);
}

var warInstallLoc: string = store.get("warInstallLoc") as string;
if (!warInstallLoc || warInstallLoc === "" || warInstallLoc.includes(".exe")) {
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
var sentMessages: Array<Object> = [];

if (!app.requestSingleInstanceLock()) {
  app.quit();
}

app.setAsDefaultProtocolClient("wc3mt");

if (!app.isPackaged) {
  screen.config.resourceDirectory = path.join(__dirname, "images");
} else {
  screen.config.resourceDirectory = path.join(app.getAppPath(), "\\..\\..\\images");
}

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

function protocolHandler(url: string) {
  if (url && url !== "") {
    openLobbyParams = getQueryVariables(url.split("?", 2)[1]);
    if (openLobbyParams.lobbyName || openLobbyParams.gameId) {
      log.info(openLobbyParams);
      isWarcraftOpen().then((isOpen) => {
        warcraftIsOpen = isOpen;
        if (!isOpen) {
          log.info("Warcraft is not open, opening.");
          try {
            openWarcraft();
          } catch (e) {
            log.error(e);
          }
        } else {
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
            settings.autoHost.mapPath = result.filePaths[0];
            log.info(`Change map to ${settings.autoHost.mapPath}`);
            store.set("autoHost.mapPath", settings.autoHost.mapPath);
            let mapName = settings.autoHost.mapPath.split("\\").pop();
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
              eloMapNameCheck();
            }
          }
        })
        .catch((err) => {
          log.error(err.message, err.stack);
        });
      break;
    case "updateSettingSingle":
      let update = args.data?.update;
      if (
        update &&
        settings[update.setting] !== undefined &&
        // @ts-ignore
        settings[update.setting][update.key] !== undefined &&
        // @ts-ignore
        (typeof settings[update.setting][update.key] === typeof update.value ||
          // @ts-ignore
          ((update.key === "inGameHotkey" || update.key === "outOfGameHotkey") &&
            (typeof update.value === "boolean" || Array.isArray(update.value))))
      ) {
        // @ts-ignore
        settings[update.setting][update.key] = update.value;
        sendSocket(update.setting + "Settings", settings[update.setting]);
        sendWindow("updateSettingSingle", {
          update: {
            setting: update.setting,
            key: update.key,
            value: update.value,
          },
        });
        store.set(update.setting, settings[update.setting]);
        log.info(update.setting + " settings changed:", settings[update.setting]);
      }
      break;
    default:
      log.info("Unknown ipcMain message:", args);
      break;
  }
});

function eloMapNameCheck() {
  // Clean the name from the map name
  if (settings.elo.type === "wc3stats" || settings.elo.type === "off") {
    if (settings.autoHost.mapName.match(/(HLW)/i)) {
      settings.elo.lookupName = "HLW";
      settings.elo.available = true;
      store.set("elo.available", settings.elo.available);
      store.set("elo.lookupName", settings.elo.lookupName);
    } else if (settings.autoHost.mapName.match(/(pyro\s*td\s*league)/i)) {
      settings.elo.lookupName = "Pyro%20TD";
      settings.elo.available = true;
      store.set("elo.available", settings.elo.available);
      store.set("elo.lookupName", settings.elo.lookupName);
    } else if (settings.autoHost.mapName.match(/(vampirism\s*fire)/i)) {
      settings.elo.lookupName = "Vampirism%20Fire";
      settings.elo.available = true;
      store.set("elo.available", settings.elo.available);
      store.set("elo.lookupName", settings.elo.lookupName);
    } else {
      const newName = settings.autoHost.mapName
        .trim()
        .replace(/\s*v?\.?(\d+\.)?(\*|\d+)\w*\s*$/gi, "")
        .replace(/\s/g, "%20");
      if (newName !== settings.elo.lookupName) {
        settings.elo.lookupName = newName;
        log.info(
          `Querying wc3stats to see if ELO data is available for: ${settings.elo.lookupName}`
        );
        log.info(`https://api.wc3stats.com/maps/${settings.elo.lookupName}`);
        https
          .get(`https://api.wc3stats.com/maps/${settings.elo.lookupName}`, (resp) => {
            let dataChunks = "";
            resp.on("data", (chunk) => {
              dataChunks += chunk;
            });
            resp.on("end", () => {
              const jsonData = JSON.parse(dataChunks);
              settings.elo.available = jsonData.status === "OK";
              log.info("Elo data available: " + settings.elo.available);
              if (!settings.elo.available) {
                sendWindow("error", {
                  error:
                    "We couldn't find any ELO data for your map. Please raise an issue on <a href='https://github.com/trenchguns/wc3multitool/issues/new?title=Map%20Request&body=Map%20Name%3A%0A&labels=Map%20Request' class='alert-link'> Github</a> if you think there should be.",
                });
              }
              store.set("elo.available", settings.elo.available);
              store.set("elo.lookupName", settings.elo.lookupName);
              // TODO check variants, seasons, modes, and ladders
              /*if (lobbyData.eloAvailable) {
                jsonData.body.variants.forEach((variant) => {
                  variant.stats.forEach((stats) => {});
                });
              }*/
            });
          })
          .on("error", (err) => {
            settings.elo.available = false;
            log.error("Error: " + err.message);
            store.set("elo.available", settings.elo.available);
            store.set("elo.lookupName", settings.elo.lookupName);
          });
      }
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
  new Notification({
    title: "Update Downloaded",
    body: "The latest version has been downloaded. Please restart the app",
  }).show();
  log.info("Update downloaded");
  sendWindow("updater", { value: "Update downloaded. Please restart the app." });
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
  log.info("App ready");
  db.exec(
    "CREATE TABLE IF NOT EXISTS banList(id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT NOT NULL UNIQUE, ban_date DATETIME default current_timestamp NOT NULL, admin TEXT NOT NULL, region TEXT NOT NULL, reason TEXT, unban_date DATETIME)"
  );
  db.exec(
    "CREATE TABLE IF NOT EXISTS lobbyEvents(id INTEGER PRIMARY KEY AUTOINCREMENT, event TEXT NOT NULL, time DATETIME default current_timestamp NOT NULL, data TEXT, username TEXT)"
  );
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
  globalShortcut.register("Alt+CommandOrControl+S", () => {
    sendMessage("PlaySound", { sound: "MenuButtonClick" });
  });
  globalShortcut.register("Alt+CommandOrControl+O", () => {});
  createWindow();
  autoUpdater.checkForUpdatesAndNotify();
  connectToHub();
  if (process.argv[1] && process.argv[1] !== ".") {
    setTimeout(() => {
      protocolHandler(process.argv[1]);
    }, 3000);
  }
});

app.on("window-all-closed", () => {
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
    log.error("Failed hub connection");
  };
  hubWebSocket.onopen = (ev) => {
    log.info("Connected to hub");
    if ((lobby as Lobby).lobbyName && (!settings.autoHost.private || !app.isPackaged)) {
      sendToHub("hostedLobby", lobby);
    }
    setTimeout(hubHeartbeat, 30000);
  };
  hubWebSocket.onmessage = function incoming(data) {
    log.info("Received message from hub: " + data);
  };
  hubWebSocket.onclose = function close() {
    log.warn("Disconnected from hub");
    setTimeout(connectToHub, Math.random() * 10000 + 3000);
    hubWebSocket = null;
  };
}

function hubHeartbeat() {
  if (hubWebSocket) {
    sendToHub("heartbeat");
    setTimeout(hubHeartbeat, 30000);
  }
}

function sendToHub(messageType: string, data = {}) {
  if (hubWebSocket && hubWebSocket.readyState === WebSocket.OPEN) {
    //if (messageType !== "heartbeat") {
    //console.log("Sending to hub: " + messageType + " ", data);
    //}
    hubWebSocket.send(
      JSON.stringify({
        type: messageType,
        data: data,
        appVersion: appVersion,
      })
    );
  }
}

async function triggerOBS() {
  if (settings.obs.type === "hotkeys") {
    if (inGame && settings.obs.inGameHotkey) {
      let modifiers = [];
      if (settings.obs.inGameHotkey.altKey) {
        modifiers.push("alt");
      }
      if (settings.obs.inGameHotkey.ctrlKey) {
        modifiers.push("control");
      }
      if (settings.obs.inGameHotkey.shiftKey) {
        modifiers.push("shift");
      }
      robot.keyTap(settings.obs.inGameHotkey.key, modifiers);
      /*await keyboard.type(
          obs.inGameHotkey.altKey ? Key.LeftAlt : "",
          obs.inGameHotkey.ctrlKey ? Key.LeftControl : "",
          obs.inGameHotkey.shiftKey ? Key.LeftShift : "",
          obs.inGameHotkey.key
        );*/
    } else if (menuState === "SCORE_SCREEN" && !inGame && settings.obs.outOfGameHotkey) {
      let modifiers = [];
      if (settings.obs.outOfGameHotkey.altKey) {
        modifiers.push("alt");
      }
      if (settings.obs.outOfGameHotkey.ctrlKey) {
        modifiers.push("control");
      }
      if (settings.obs.outOfGameHotkey.shiftKey) {
        modifiers.push("shift");
      }
      robot.keyTap(settings.obs.outOfGameHotkey.key, modifiers);
      /*await keyboard.type(
          obs.outOfGameHotkey.altKey ? Key.LeftAlt : "",
          obs.outOfGameHotkey.ctrlKey ? Key.LeftControl : "",
          obs.outOfGameHotkey.shiftKey ? Key.LeftShift : "",
          obs.outOfGameHotkey.key
        );*/
    }
  }
}

function sendProgress(step = "Nothing", progress = 0) {
  sendWindow("progress", { progress: { step, progress } });
}

function sendStatus(status = false) {
  sendWindow("statusChange", { connected: status });
}

async function handleWSMessage(message: any) {
  message = JSON.parse(message) as { messageType: string; data: string };
  switch (message.messageType) {
    case "sendMessage":
      //console.log(message.data);
      break;
    case "clientWebSocket":
      handleClientMessage(message);
      break;
    case "toggleAutoHost":
      log.info("Toggling autoHost");
      settings.autoHost.type = settings.autoHost.type === "off" ? "autoHost" : "off";
      store.set("autoHost", settings.autoHost);
      sendSocket("autoHost", settings.autoHost);
    //sendWindow("autoHost", settings.autoHost);
    case "error":
      log.error(message);
      win.webContents.send("fromMain", message);
      break;
    case "echo":
      log.verbose(message);
      break;
    default:
      log.info(message);
  }
}

function handleClientMessage(message: { data: string }) {
  if (message.data) {
    clientWebSocket = new WebSocket(message.data);

    clientWebSocket.on("open", function open() {
      openParamsJoin();
    });
    clientWebSocket.on(
      "message",
      function incoming(data: { messageType: string; payload: any }) {
        data = JSON.parse(data.toString());
        switch (data.messageType) {
          case "ScreenTransitionInfo":
            screenState = data.payload.screen;
            console.log("Screenstate", screenState);
            if (screenState !== "GAME_LOBBY") {
              clearLobby();
            }
            break;
          case "SetGlueScreen":
            if (data.payload.screen) {
              if (
                data.payload.screen === "MAIN_MENU" ||
                (data.payload.screen === "SCORE_SCREEN" && menuState === "SCORE_SCREEN")
              ) {
                menuState = data.payload.screen;
                if (openLobbyParams?.lobbyName) {
                  openParamsJoin();
                } else if (settings.autoHost.type !== "off") {
                  gameNumber += 1;
                  const lobbyName =
                    settings.autoHost.gameName +
                    (settings.autoHost.increment ? ` #${gameNumber}` : "");
                  const payloadData = {
                    filename: settings.autoHost.mapPath.replace(/\\/g, "/"),
                    gameSpeed: 2,
                    gameName: lobbyName,
                    mapSettings: {
                      flagLockTeams: settings.autoHost.flagLockTeams,
                      flagPlaceTeamsTogether: settings.autoHost.flagPlaceTeamsTogether,
                      flagFullSharedUnitControl:
                        settings.autoHost.flagFullSharedUnitControl,
                      flagRandomRaces: settings.autoHost.flagRandomRaces,
                      flagRandomHero: settings.autoHost.flagRandomHero,
                      settingObservers: settings.autoHost.observers ? 3 : 0,
                      settingVisibility: parseInt(settings.autoHost.settingVisibility),
                    },
                    privateGame: settings.autoHost.private,
                  };
                  log.info("Sending autoHost payload", payloadData);
                  sendMessage("CreateLobby", payloadData);
                }
              }
              if (
                menuState === "LOADING_SCREEN" &&
                data.payload.screen === "SCORE_SCREEN"
              ) {
                inGame = true;
                triggerOBS();
                clearLobby();
                if (settings.autoHost.type === "rapidHost") {
                  setTimeout(
                    quitGame,
                    settings.autoHost.rapidHostTimer * 1000 * 60 + 250
                  );
                }
              } else {
                triggerOBS();
                inGame = false;
                clearLobby();
              }
              menuState = data.payload.screen;
              console.log("MenuState", menuState);
            }
            break;
          case "GameLobbySetup":
            handleLobbyUpdate(data.payload);
            break;
          case "GameList":
            if (openLobbyParams && openLobbyParams.lobbyName) {
              log.info("GameList received, trying to find lobby.");
              handleGameList(data.payload);
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
            selfBattleTag = data.payload.user.battleTag;
            selfRegion = data.payload.user.userRegion;
          default:
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
                //console.log(data);
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
  if ((lobby as Lobby).isHost && (!settings.autoHost.private || !app.isPackaged)) {
    sendToHub("hostedLobbyClosed");
  }
  // @ts-ignore
  lobby = {};
  if (!inGame) {
    sendWindow("lobbyData", { lobby: lobby });
  }
}

function openParamsJoin() {
  if (openLobbyParams && menuState === "MAIN_MENU") {
    if (openLobbyParams.lobbyName) {
      sendMessage("SendGameListing", {});
      setTimeout(() => {
        sendMessage("GetGameList", {});
      }, 500);
    } else if (openLobbyParams?.gameId && openLobbyParams.mapFile) {
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
  if (payload.message) {
    if (payload.message.source === "gameChat") {
      var sender = payload.message.sender.includes("#")
        ? payload.message.sender
        : selfBattleTag;
      if (
        settings.autoHost.voteStart &&
        payload.message.content.toLowerCase() === "?votestart"
      ) {
        if (lobby.processed) {
          if (lobby.processed.voteStartVotes.length === 0) {
            const emptyPlayerTeam = Object.keys(
              lobby.processed.teamList.playerTeams.data
            ).some(function (team) {
              if (
                lobby &&
                lobby.processed.teamList.playerTeams.data[team].players.length === 0
              ) {
                return true;
              }
            });
            if (!emptyPlayerTeam) {
              voteTimer = setTimeout(cancelVote, 60000);
              sendChatMessage("You have 60 seconds to ?votestart.");
            } else {
              sendChatMessage("Unavailable. Not all teams have players.");
            }
          }
          if (!lobby.processed.voteStartVotes.includes(sender) && voteTimer) {
            lobby.processed.voteStartVotes.push(sender);
            if (
              lobby.processed.voteStartVotes.length >=
              lobby.processed.allPlayers.length *
                (settings.autoHost.voteStartPercent / 100)
            ) {
              startGame();
            } else {
              sendChatMessage(
                Math.ceil(
                  lobby.processed.allPlayers.length *
                    (settings.autoHost.voteStartPercent / 100) -
                    lobby.processed.voteStartVotes.length
                ).toString() + " more vote(s) required."
              );
            }
          }
        }
      } else if (
        payload.message.content.toLowerCase() === "?elo" &&
        lobby &&
        lobby.eloAvailable
      ) {
        if (lobby.processed.eloList[sender]) {
          sendChatMessage(sender + " ELO: " + lobby.processed.eloList[sender]);
        } else {
          sendChatMessage("ELO not available");
        }
      } else if (
        lobby &&
        lobby.isHost &&
        (!settings.autoHost.private || !app.isPackaged) &&
        !sentMessages.includes(payload.message.content)
      ) {
        lobbyProcessedUpdate("chatMessages", {
          sender: payload.message.sender,
          content: payload.message.content,
        });
      }
    }
  }
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
    lobby.processed.voteStartVotes = [];
  }
}

function handleLobbyUpdate(payload: GameClientLobbyPayload) {
  // If we are not in the same lobby
  if (payload.teamData.playableSlots > 1) {
    if (!lobby || lobby.lobbyName !== payload.lobbyName) {
      lobby = {} as Lobby;
      processMapData(payload);
    } else {
      lobby.teamData = payload.teamData;
      lobby.availableTeamColors = payload.availableTeamColors;
    }
    processLobby(payload);
  }
}

function processMapData(payload: GameClientLobbyPayload) {
  lobby.isHost = payload.isHost;
  lobby.playerHost = payload.playerHost;
  lobby.mapName = payload.mapData.mapName;
  lobby.lobbyName = payload.lobbyName;
  lobby.region = selfRegion;
  lobby.processed = {
    allLobby: [],
    allPlayers: [],
    bestCombo: [],
    chatMessages: [],
    eloList: {},
    openPlayerSlots: 0,
    playerSet: [],
    swaps: [],
    startingSlot: 0,
    teamList: {
      otherTeams: { data: {}, lookup: {} },
      specTeams: { data: {}, lookup: {} },
      playerTeams: { data: {}, lookup: {} },
    },
    teamListLookup: {},
    voteStartVotes: [],
  };
  lobby.teamData = payload.teamData;
  lobby.availableTeamColors = payload.availableTeamColors;

  lobby.teamData.teams.forEach(function (team) {
    const teamName = team.name;
    if (testNonPlayersTeam.test(teamName)) {
      lobby.processed.teamList.otherTeams.data[teamName] = {
        number: team.team,
        totalSlots: team.totalSlots,
        defaultOpenSlots: [],
        players: [],
        slots: [],
      };
      lobby.processed.teamList.otherTeams.lookup[team.team] = teamName;
      lobby.processed.teamListLookup[team.team] = {
        type: "otherTeams",
        name: teamName,
      };
    } else if (testSpecTeam.test(teamName)) {
      lobby.processed.teamList.specTeams.data[teamName] = {
        number: team.team,
        totalSlots: team.totalSlots,
        defaultOpenSlots: [],
        players: [],
        slots: [],
      };
      lobby.processed.teamList.specTeams.lookup[team.team] = teamName;
      lobby.processed.teamListLookup[team.team] = {
        type: "specTeams",
        name: teamName,
      };
    } else {
      lobby.processed.teamList.playerTeams.data[teamName] = {
        number: team.team,
        totalSlots: team.totalSlots,
        defaultOpenSlots: [],
        players: [],
        slots: [],
      };
      lobby.processed.teamList.playerTeams.lookup[team.team] = teamName;
      lobby.processed.teamListLookup[team.team] = {
        type: "playerTeams",
        name: teamName,
      };
    }
  });
  payload.players.forEach((player: PlayerPayload) => {
    const teamType = lobby.processed.teamListLookup[player.team].type;
    const teamName = lobby.processed.teamListLookup[player.team].name;
    if (player.slotStatus === 0) {
      lobby.processed.teamList[teamType].data[teamName].defaultOpenSlots.push(
        player.slot
      );
    }
    if (player.isSelf) {
      lobby.processed.startingSlot = player.slot;
    }
  });
  if (settings.elo.type !== "off") {
    lobby.processed.eloList = {};
    lobby.processed.lookingUpELO = new Set();
    const mapName = lobby.mapName;
    if (settings.autoHost.type === "off") {
      if (!lobby.lookupName) {
        if (mapName.match(/(HLW)/i)) {
          lobby.lookupName = "HLW";
          lobby.eloAvailable = true;
          log.info("Autohost disabled. HLW Recognized");
        } else if (mapName.match(/(pyro\s*td\s*league)/i)) {
          lobby.lookupName = "Pyro%20TD";
          lobby.eloAvailable = true;
          log.info("Autohost disabled. Pyro TD Recognized");
        } else {
          lobby.lookupName = mapName
            .trim()
            .replace(/\s*v?\.?(\d+\.)?(\*|\d+)\w*\s*$/gi, "")
            .replace(/\s/g, "%20");
          if (settings.elo.type === "wc3stats") {
            log.info(
              "Autohost disabled. Unkown Map. Querying: https://api.wc3stats.com/maps/" +
                lobby.lookupName
            );
            https
              .get(`https://api.wc3stats.com/maps/${lobby.lookupName}`, (resp) => {
                let dataChunks = "";
                resp.on("data", (chunk) => {
                  dataChunks += chunk;
                });
                resp.on("end", () => {
                  const jsonData = JSON.parse(dataChunks);
                  lobby.eloAvailable = jsonData.status === "OK";
                  log.info(
                    "Autohost disabled. Map queried. Returned: " + lobby.eloAvailable
                  );
                  processLobby(payload);
                  sendWindow("lobbyData", { lobby });
                  // TODO check variants, seasons, modes, and ladders
                  /*if (lobbyData.eloAvailable) {
                        jsonData.body.variants.forEach((variant) => {
                          variant.stats.forEach((stats) => {});
                        });
                      }*/
                });
              })
              .on("error", (err) => {
                log.error("Error: " + err.message);
              });
          }
        }
      }
    } else {
      lobby.processed.voteStartVotes = [];
      lobby.eloAvailable = settings.elo.available;
      lobby.lookupName = settings.elo.lookupName;
      sendWindow("lobbyData", { lobby });
      log.info(
        "Autohost enabled. Map data received",
        lobby.lookupName,
        lobby.eloAvailable
      );
    }
  } else {
    lobby.eloAvailable = false;
    lobby.lookupName = "";
    log.info("Map data received", lobby.lookupName, lobby.eloAvailable);
  }
  if (settings.autoHost.type !== "off") {
    let specTeams = Object.keys(lobby.processed.teamList.specTeams.data);
    if (settings.autoHost.moveToSpec && specTeams.length > 0) {
      if (
        specTeams.some((team) => {
          if (team.match(/host/i)) {
            if (
              lobby.processed.teamList.specTeams.data[team].defaultOpenSlots.length > 0
            ) {
              log.info("Found host slot to move to: " + team);
              sendMessage("SetTeam", {
                slot: lobby.processed.startingSlot,
                team: lobby.processed.teamList.specTeams.data[team].number,
              });
              return true;
            }
            return false;
          }
        }) === false
      ) {
        specTeams.some((team) => {
          if (lobby.processed.teamList.specTeams.data[team].defaultOpenSlots.length > 0) {
            sendMessage("SetTeam", {
              slot: lobby.processed.startingSlot,
              team: lobby.processed.teamList.specTeams.data[team].number,
            });
          }
        });
      }
    }
    settings.autoHost.closeSlots.forEach((toClose) => {
      sendMessage("CloseSlot", {
        slot: toClose,
      });
    });
  }
  sendWindow("lobbyData", { lobby });
  processLobby(payload, true);
}

async function processLobby(payload: GameClientLobbyPayload, sendFull = false) {
  let newAllPlayers: Array<string> = [];
  let newAllLobby: Array<string> = [];
  let newOpenPlayerSlots = 0;
  let newTeamData: {
    otherTeams: { [key: string]: { players: Array<string>; slots: Array<string> } };
    specTeams: { [key: string]: { players: Array<string>; slots: Array<string> } };
    playerTeams: { [key: string]: { players: Array<string>; slots: Array<string> } };
  } = {
    otherTeams: {},
    specTeams: {},
    playerTeams: {},
  };
  (["otherTeams", "specTeams", "playerTeams"] as Array<TeamTypes>).forEach((type) => {
    Object.keys(lobby.processed.teamList[type].data).forEach(function (name) {
      newTeamData[type][name] = {
        players: [],
        slots: [],
      };
    });
  });
  payload.players.forEach((player) => {
    const teamType = lobby.processed.teamListLookup[player.team].type;
    const teamName = lobby.processed.teamListLookup[player.team].name;
    if (player.name) {
      db.open;
      const row = db.prepare("SELECT * FROM banList WHERE username = ?").get(player.name);
      if (row) {
        console.log("dbrow", row);
      }
    }
    if (player.playerRegion !== "" && teamType === "playerTeams") {
      newAllPlayers.push(player.name);
    }
    if (player.playerRegion !== "") {
      newAllLobby.push(player.name);
    }
    if (player.name !== "") {
      newTeamData[teamType][teamName].players.push(player.name);
      newTeamData[teamType][teamName].slots.push(player.name);
    } else if (player.slotStatus === 0) {
      newTeamData[teamType][teamName].slots.push("OPEN SLOT");
      if (teamType === "playerTeams") {
        newOpenPlayerSlots += 1;
      }
    } else {
      newTeamData[teamType][teamName].slots.push("OPEN SLOT");
    }

    //player.name.replace(/#\d+$/g, "");
  });
  newAllPlayers.sort();
  newAllLobby.sort();
  if (!sendFull) {
    if (
      newAllPlayers.length !== lobby.processed.allPlayers.length &&
      JSON.stringify(newAllPlayers) !== JSON.stringify(lobby.processed.allPlayers)
    ) {
      lobbyProcessedUpdate("allPlayers", newAllPlayers);
    }
    if (
      newAllLobby.length !== lobby.processed.allLobby.length &&
      JSON.stringify(newAllLobby) !== JSON.stringify(lobby.processed.allLobby)
    ) {
      lobbyProcessedUpdate("allLobby", newAllLobby);
    }
    if (lobby.processed.openPlayerSlots !== newOpenPlayerSlots) {
      lobbyProcessedUpdate("openPlayerSlots", newOpenPlayerSlots);
    }

    Object.entries(newTeamData).forEach(([type, team]) => {
      Object.entries(team).forEach(([name, data]) => {
        if (
          !lobby.processed.teamList[type as TeamTypes].data[name].players ||
          !lobby.processed.teamList[type as TeamTypes].data[name].slots ||
          lobby.processed.teamList[type as TeamTypes].data[name].players.length !==
            data.players.length ||
          JSON.stringify(
            lobby.processed.teamList[type as TeamTypes].data[name].players
          ) !== JSON.stringify(data.players) ||
          JSON.stringify(lobby.processed.teamList[type as TeamTypes].data[name].slots) !==
            JSON.stringify(data.slots)
        ) {
          lobbyProcessedUpdate(type, data, name);
        }
      });
    });
  } else {
    lobby.processed.allPlayers = newAllPlayers;
    lobby.processed.allLobby = newAllLobby;
    lobby.processed.openPlayerSlots = newOpenPlayerSlots;
    Object.entries(newTeamData).forEach(([type, team]) => {
      Object.entries(team).forEach(([name, data]) => {
        lobby.processed.teamList[type as TeamTypes].data[name].players = data.players;
        lobby.processed.teamList[type as TeamTypes].data[name].slots = data.slots;
      });
    });
  }

  if (lobby.eloAvailable) {
    const mapName = lobby.lookupName;
    let eloUpdated = false;
    Object.keys(lobby.processed.eloList).forEach((user) => {
      if (!lobby.processed.allPlayers.includes(user)) {
        delete lobby.processed.eloList[user];
        eloUpdated = true;
      }
      lobby.processed.lookingUpELO?.delete(user);
    });
    if (eloUpdated && !sendFull) {
      lobbyProcessedUpdate("eloList", lobby.processed.eloList);
    }
    lobby.processed.allPlayers.forEach(function (user) {
      if (
        !Object.keys(lobby.processed.eloList).includes(user) &&
        !lobby.processed.lookingUpELO?.has(user)
      ) {
        lobby.processed.lookingUpELO?.add(user);
        if (settings.elo.type === "wc3stats") {
          https
            .get(
              `https://api.wc3stats.com/leaderboard&map=${mapName}&search=${user
                .trim()
                .replace(/\s/g, "%20")}`,
              (resp) => {
                let dataChunks = "";
                resp.on("data", (chunk) => {
                  dataChunks += chunk;
                });
                // The whole response has been received. Print out the result.
                resp.on("end", async () => {
                  const jsonData = JSON.parse(dataChunks);
                  lobby.processed.lookingUpELO?.delete(user);
                  let elo = 500;
                  if (jsonData.body.length > 0) {
                    elo = jsonData.body[0].rating;
                  }
                  // If they haven't left, set real ELO
                  if (lobby.processed.allPlayers.includes(user)) {
                    lobbyProcessedUpdate("eloList", {
                      [user]: elo,
                      ...lobby.processed.eloList,
                    });
                    // Math needs work
                    sendProgress(
                      "Got ELO for " + user,
                      (Object.keys(lobby.processed.eloList).length /
                        (lobby.processed.allPlayers.length +
                          lobby.processed.openPlayerSlots)) *
                        90 +
                        10
                    );
                    // Send new step to GUI
                    sendWindow("lobbyData", { lobby });
                    log.verbose(user + " ELO: " + elo.toString());
                    if (settings.elo.announce) {
                      sendChatMessage(user + " ELO: " + elo.toString());
                    }
                    // If the lobby is full, and we have the ELO for everyone,
                    if (lobbyIsReady()) {
                      finalizeLobby();
                    }
                  } else {
                    log.verbose(user + " left before ELO was found");
                  }
                });
              }
            )
            .on("error", (err) => {
              log.error("Error: " + err.message);
            });
        }
      }
    });
  }

  if (
    lobby.isHost &&
    (settings.autoHost.type === "smartHost" || settings.autoHost.type === "rapidHost")
  ) {
    if (settings.autoHost.voteStart && voteTimer) {
      cancelVote();
    }
    if (settings.autoHost.announceIsBot && lobby.processed.allLobby.length > 1) {
      let currentTime = Date.now();
      lobby.processed.allLobby.some(function (user) {
        if (
          lobby.processed.playerSet &&
          !lobby.processed.playerSet.includes(user) &&
          currentTime >
            lastAnnounceTime + 1000 * settings.autoHost.announceRestingInterval
        ) {
          console.log("Announcing");
          lastAnnounceTime = currentTime;
          announceBot();
          return;
        }
      });
      lobby.processed.playerSet = lobby.processed.allLobby;
    }
    if (!lobby.eloAvailable && lobbyIsReady()) {
      finalizeLobby();
    }
  }
  sendWindow("lobbyData", { lobby });
  if (sendFull) {
    sendToHub("hostedLobby", lobby);
  }
}

function lobbyIsReady() {
  return (
    (lobby.eloAvailable &&
      Object.keys(lobby.processed.eloList).length === lobby.processed.allPlayers.length &&
      lobby.processed.openPlayerSlots === 0) ||
    (!lobby.eloAvailable && lobby.processed.openPlayerSlots === 0)
  );
}

async function finalizeLobby() {
  if (lobby.eloAvailable && settings.elo.balanceTeams) {
    lobby.processed.totalElo = Object.values(lobby.processed.eloList).reduce(
      (a, b) => a + b,
      0
    );
    let smallestEloDiff = Number.POSITIVE_INFINITY;
    let bestCombo: Array<string> = [];
    const combos = new Combination(
      Object.keys(lobby.processed.eloList),
      Math.floor(Object.keys(lobby.processed.eloList).length / 2)
    );
    for (const combo of combos) {
      const comboElo = combo.reduce(
        (a: any, b: any) => a + lobby.processed.eloList[b],
        0
      );
      const eloDiff = Math.abs(lobby.processed.totalElo / 2 - comboElo);
      if (eloDiff < smallestEloDiff) {
        smallestEloDiff = eloDiff;
        bestCombo = combo;
      }
    }
    lobby.processed.bestCombo = bestCombo;
    lobby.processed.eloDiff = smallestEloDiff;
    swapHelper();
    sendChatMessage("ELO data provided by: " + settings.elo.type);

    if (!lobby.isHost) {
      sendChatMessage(lobby.processed.leastSwap + " should be: " + bestCombo.join(", "));
    } else {
      for (let i = 0; i < lobby.processed.swaps[0].length; i++) {
        if (!lobbyIsReady()) {
          break;
        }
        sendProgress(
          "Swapping " +
            lobby.processed.swaps[0][i] +
            " and " +
            lobby.processed.swaps[1][i],
          100
        );
        sendChatMessage(
          "!swap " + lobby.processed.swaps[0][i] + " " + lobby.processed.swaps[1][i]
        );
      }
    }
  }
  sendProgress("Starting Game", 100);
  if (lobby.isHost) {
    if (
      settings.autoHost.type === "smartHost" ||
      settings.autoHost.type === "rapidHost"
    ) {
      // Wait a quarter second to make sure no one left
      setTimeout(async () => {
        if (lobbyIsReady()) {
          startGame();
        }
      }, 150);
    } else if (settings.autoHost.type === "lobbyHost" && settings.autoHost.sounds) {
      playSound("ready.wav");
    }
  }
}

function startGame() {
  sendChatMessage("AutoHost functionality provided by WC3 MultiTool.");
  if (settings.autoHost.sounds) {
    playSound("ready.wav");
  }
  log.info("Starting game");
  sendMessage("LobbyStart", {});
  if (settings.autoHost.type === "smartHost") {
    setTimeout(findQuit, 15000);
  }
}

function swapHelper() {
  let swapsFromTeam1: Array<string> = [];
  let swapsFromTeam2: Array<string> = [];
  const team1 = Object.keys(lobby.processed.teamList.playerTeams.data)[0];
  const team2 = Object.keys(lobby.processed.teamList.playerTeams.data)[1];
  const bestComboInTeam1 = intersect(
    lobby.processed.bestCombo,

    lobby.processed.teamList.playerTeams.data[team1].players
  );
  const bestComboInTeam2 = intersect(
    lobby.processed.bestCombo,
    lobby.processed.teamList.playerTeams.data[team2].players
  );
  log.verbose(bestComboInTeam1, bestComboInTeam2);
  // If not excludeHostFromSwap and team1 has more best combo people, or excludeHostFromSwap and the best combo includes the host keep all best combo players in team 1.
  if (
    (!settings.elo.excludeHostFromSwap &&
      bestComboInTeam1.length >= bestComboInTeam2.length) ||
    (settings.elo.excludeHostFromSwap &&
      lobby.processed.bestCombo.includes(lobby.playerHost))
  ) {
    lobby.processed.leastSwap = team1;
    // Go through team 1 and grab everyone who is not in the best combo

    lobby.processed.teamList.playerTeams.data[team1].players.forEach((user) => {
      if (!lobby.processed.bestCombo.includes(user)) {
        swapsFromTeam1.push(user);
      }
    });
    // Go through team 2 and grab everyone who is in the best combo

    bestComboInTeam2.forEach(function (user) {
      swapsFromTeam2.push(user);
    });
  } else {
    lobby.processed.leastSwap = team2;
    lobby.processed.teamList.playerTeams.data[team2].players.forEach((user) => {
      if (!lobby.processed.bestCombo.includes(user)) {
        swapsFromTeam2.push(user);
      }
    });
    bestComboInTeam1.forEach(function (user) {
      swapsFromTeam1.push(user);
    });
  }
  lobby.processed.swaps = [swapsFromTeam1, swapsFromTeam2];
}

async function announceBot() {
  if (menuState === "GAME_LOBBY") {
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
    if (settings.autoHost.customAnnouncement.length > 0) {
      sendChatMessage(settings.autoHost.customAnnouncement);
    }
  }
}

function intersect(a: Array<string>, b: Array<string>) {
  var setB = new Set(b);
  return [...new Set(a)].filter((x) => setB.has(x));
}

function sendWindow(
  messageType: WindowReceive["messageType"],
  message: WindowReceive["data"]
) {
  win.webContents.send("fromMain", <WindowReceive>{
    messageType: messageType,
    data: message,
  });
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
  if (inGame || menuState === "LOADING_SCREEN") {
    await activeWindowWar();
    if (warcraftInFocus) {
      let targetRes = "1080/";
      if (warcraftRegion.height > 1440) {
        targetRes = "2160/";
      }
      if (
        ["quitNormal.png", "quitHLW.png"].some(async (file) => {
          try {
            const foundImage = await screen.find(`${targetRes + file}`);
            if (foundImage) {
              return true;
            }
          } catch (e) {
            //log.error(e);
            return false;
          }
        })
      ) {
        //log.verbose("Found quit. Press q");
        await robot.keyTap("q");
        if (settings.autoHost.sounds) {
          playSound("quit.wav");
        }
      } else {
        //log.verbose("Did not find quit, try again in 5 seconds");
      }
    }
    setTimeout(findQuit, 5000);
  }
}

async function quitGame() {
  if (inGame) {
    await activeWindowWar();
    if (warcraftInFocus) {
      robot.keyTap("f10");
      robot.keyTap("e");
      robot.keyTap("q");
      if (settings.autoHost.sounds) {
        playSound("quit.wav");
      }
    } else {
      setTimeout(findQuit, 5000);
    }
  }
}
/*
async function analyzeGame() {
  let data = new Set();
  let dataTypes = new Set();
  parser.on("gamedatablock", (block) => {
    if (block.id === 0x1f) {
      block.commandBlocks.forEach((commandBlock) => {
        if (
          commandBlock.actions.length > 0 &&
          commandBlock.actions[0].filename === "MMD.Dat"
        ) {
          commandBlock.actions.forEach((block) => {
            if (block.key && !/^\d+$/.test(block.key)) {
              if (!/^DefVarP/i.test(block.key)) {
                data.add(block.key);
              } else {
                dataTypes.add(block.key);
              }
            }
          });
        }
      });
    }
  });
  await parser.parse(readFileSync("./replay.w3g"));
}*/

function sendMessage(message: string, payload: any) {
  if (clientWebSocket) {
    clientWebSocket.send(JSON.stringify({ message: message, payload: payload }));
  }
}

function sendChatMessage(content: string) {
  sentMessages.push(content);
  if (sentMessages.length > 3) {
    sentMessages.shift();
  }
  sendMessage("SendGameChatMessage", {
    content,
  });
}

async function activeWindowWar() {
  const warcraftOpenCheck = await isWarcraftOpen();
  if (warcraftIsOpen && !warcraftOpenCheck) {
    warcraftIsOpen = warcraftOpenCheck;
    new Notification({
      title: "Warcraft is not open",
      body: "An action was attempted but Warcraft was not open",
    }).show();
    return;
  } else {
    warcraftIsOpen = warcraftOpenCheck;
  }

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
  }
}

async function isWarcraftOpen() {
  let windows = await getWindows();
  for (let window of windows) {
    let title = await window.title;
    if (title === "Warcraft III") return true;
  }
  return false;
}

function lobbyProcessedUpdate(key = "", value: any, teamName = "") {
  if (["otherTeams", "playerTeams", "specTeams"].includes(key)) {
    lobby.processed.teamList[key as TeamTypes].data[teamName].slots = value.slots;
    lobby.processed.teamList[key as TeamTypes].data[teamName].players = value.players;
    sendToHub("lobbyUpdate", { key, value, teamName });
  } else if (key === "chatMessages") {
    if (!sentMessages.includes(value.content)) {
      lobby.processed.chatMessages.push(value);
      sendToHub("lobbyUpdate", { key, value });
    }
  } else if (lobby.processed[key as keyof LobbyProcessed] !== value) {
    // @ts-ignore
    lobby.processed[key as keyof LobbyProcessed] = value;
    sendToHub("lobbyUpdate", { key, value });
  }
  sendWindow("lobbyData", { lobby });
}

async function openWarcraft2() {
  warcraftIsOpen = await isWarcraftOpen();
  if (!warcraftIsOpen) {
    shell.openPath(warInstallLoc + "\\_retail_\\x86_64\\Warcraft III.exe");
    let targetRes = "1080/";
    let screenHeight = await screen.height();
    if (screenHeight > 1440) {
      targetRes = "2160/";
    }
    let playPosition = await centerOf(
      screen.waitFor(targetRes + "play.png", 15000, {
        confidence: 0.95,
      })
    );
    await mouse.setPosition(playPosition);
    await mouse.leftClick();
  }
}

function openWarcraft() {
  shell.openPath(warInstallLoc + "\\_retail_\\x86_64\\Warcraft III.exe");
  let targetRes = "1080/";
  screen
    .height()
    .then((height) => {
      if (height > 1440) {
        targetRes = "2160/";
      }
    })
    .then(() => {
      screen
        .waitFor(targetRes + "play.png", 25000, {
          confidence: 0.98,
        })
        .then((result) => {
          centerOf(result).then((position) => {
            mouse.setPosition(position).then(() => mouse.leftClick());
          });
        })
        .catch((e) => {
          log.error(e);
          //setTimeout(openWarcraft, 5000);
        });
    });
}
