const {
  app,
  BrowserWindow,
  Tray,
  Menu,
  ipcMain,
  globalShortcut,
  dialog,
  shell,
  Notification,
} = require("electron");
require = require("esm")(module);
const { Combination } = require("js-combinatorics");
const { autoUpdater } = require("electron-updater");
const {
  screen,
  getActiveWindow,
  mouse,
  getWindows,
  getWindowTitle,
  centerOf,
} = require("@nut-tree/nut-js");
const log = require("electron-log");
const https = require("https");
const WebSocket = require("ws");
const path = require("path");
const Store = require("electron-store");
const sound = require("sound-play");
const robot = require("robotjs");
const { nanoid } = require("nanoid");
const fs = require("fs");

autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = "info";

screen.config.confidence = 0.65;

log.info("App starting...");

const store = new Store();
const testNonPlayersTeam = /((computer)|(creeps)|(summoned))/i;
const testSpecTeam = /((host)|(spectator)|(observer))/i;

var win;
var appIcon;
var socket = null;
var currentStatus = "Waiting For Connection";
var gameNumber = 0;
var lobby = {};
var menuState = "Out of Menus";
var inGame = false;
var wss;
var clientWebSocket;
var hubWebSocket;
var warcraftInFocus = false;
var warcraftIsOpen = false;
var warcraftRegion = { left: 0, top: 0, width: 0, height: 0 };
var voteTimer;
var openLobbyParams;
var screenState;
var selfBattleTag;
var selfRegion;
var settings = {
  autoHost: {
    type: store.get("autoHost.type") || "off",
    private: store.get("autoHost.private") || false,
    sounds: store.get("autoHost.sounds") || false,
    increment: store.get("autoHost.increment") || true,
    mapName: store.get("autoHost.mapName") || "",
    gameName: store.get("autoHost.gameName") || "",
    mapPath: store.get("autoHost.mapPath") || "N/A",
    announceIsBot: store.get("autoHost.announceIsBot") || false,
    announceRestingInterval: store.get("autoHost.announceRestingInterval") || 30,
    moveToSpec: store.get("autoHost.moveToSpec") || false,
    rapidHostTimer: store.get("autoHost.rapidHostTimer") || 0,
    voteStart: store.get("autoHost.voteStart") || false,
    voteStartPercent: store.get("autoHost.voteStartPercent") || 60,
    closeSlots: store.get("autoHost.closeSlots") || [],
  },
  obs: {
    type: store.get("obs.type") || "off",
    inGameHotkey: store.get("obs.inGameHotkey") || false,
    outOfGameHotkey: store.get("obs.outOfGameHotkey") || false,
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
var appVersion;
var identifier = store.get("anonymousIdentifier");
if (!identifier) {
  identifier = nanoid();
  store.set("anonymousIdentifier", identifier);
}

var warInstallLoc = store.get("warInstallLoc");
if (!warInstallLoc) {
  fs.readFile("warInstallLoc.txt", (err, data) => {
    if (err) {
      console.error(err);
      return;
    }
    warInstallLoc = data.toString();
    store.set("warInstallLoc", warInstallLoc);
  });
}

var lastAnnounceTime = 0;
var sentMessages = [];

if (!app.requestSingleInstanceLock()) {
  app.quit();
  return;
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

function protocolHandler(url = "") {
  openLobbyParams = getQueryVariables(url.split("?", 2)[1]);
  log.info(openLobbyParams);
  isWarcraftOpen().then((isOpen) => {
    warcraftIsOpen = isOpen;
    if (!isOpen) {
      log.info("Warcraft is not open, opening.");
      openWarcraft().catch((err) => {
        log.error(err);
      });
    } else {
      openParamsJoin();
    }
  });
}

function getQueryVariables(url) {
  var vars = url.split("&");
  let pairs = {};
  for (var i = 0; i < vars.length; i++) {
    if (vars[i]) pairs[vars[i].split("=")[0]] = decodeURI(vars[i].split("=")[1]);
  }
  return pairs;
}

ipcMain.on("toMain", (event, args) => {
  switch (args.messageType) {
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
            mapName = mapName.substring(0, mapName.length - 4);
            settings.autoHost.mapName = mapName;
            store.set("autoHost.mapName", mapName);
            sendWindow("updateSettingSingle", {
              setting: "autoHost",
              key: "mapPath",
              value: settings.autoHost.mapPath,
            });
            eloMapNameCheck();
          }
        })
        .catch((err) => {
          log.error(err.message, err.stack);
        });
      break;
    case "updateSettingSingle":
      settings[args.data.setting][args.data.key] = args.data.value;
      sendSocket(args.data.setting + "Settings", settings[args.data.setting]);
      sendWindow("updateSettingSingle", {
        setting: args.data.setting,
        key: args.data.key,
        value: args.data.value,
      });
      store.set(args.data.setting, settings[args.data.setting]);
      log.info(args.data.setting + " settings changed:", settings[args.data.setting]);
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
                sendWindow(
                  "error",
                  "We couldn't find any ELO data for your map. Please raise an issue on <a href='https://github.com/trenchguns/wc3multitool/issues/new?title=Map%20Request&body=Map%20Name%3A%0A&labels=Map%20Request' class='alert-link'> Github</a> if you think there should be."
                );
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
  win.webContents.send("fromMain", {
    messageType: "updater",
    data: "Checking for update...",
  });
});
autoUpdater.on("update-available", (info) => {
  new Notification({
    title: "Update Available",
    body: "An update is available!",
  }).show();
  win.webContents.send("fromMain", {
    messageType: "updater",
    data: "Update available.",
  });
});
autoUpdater.on("update-not-available", (info) => {
  win.webContents.send("fromMain", {
    messageType: "updater",
    data: "Update not available.",
  });
});
autoUpdater.on("error", (err) => {
  new Notification({
    title: "Update Error",
    body: "There was an error with the auto updater!",
  }).show();
  log.error(err);
  win.webContents.send("fromMain", {
    messageType: "updater",
    data: "Error in auto-updater. " + err,
  });
});
autoUpdater.on("download-progress", (progressObj) => {
  let log_message = "Download speed: " + progressObj.bytesPerSecond;
  log_message = log_message + " - Downloaded " + progressObj.percent + "%";
  log_message =
    log_message + " (" + progressObj.transferred + "/" + progressObj.total + ")";
  win.webContents.send("fromMain", {
    messageType: "updater",
    data: log_message,
  });
});
autoUpdater.on("update-downloaded", (info) => {
  new Notification({
    title: "Update Downloaded",
    body: "The latest version has been downloaded",
  }).show();
  win.webContents.send("fromMain", {
    messageType: "updater",
    data: "Update downloaded",
  });
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
        appIcon.destroy();
        appIcon = null;
        win.show();
      },
    },
    {
      label: "Quit",
      click: function () {
        app.isQuitting = true;
        app.quit();
      },
    },
  ]);
  win.once("ready-to-show", () => {
    sendStatus(currentStatus);
    win.show();
  });
  win.on("minimize", function (event) {
    event.preventDefault();
    appIcon = new Tray(path.join(__dirname, "images/wc3_auto_balancer_v2.png"));

    appIcon.setContextMenu(contextMenu);

    new Notification({
      title: "Still Running",
      body: "WC3 MultiTool will keep running in your taskbar",
    }).show();
    win.hide();
  });
  win.loadFile(path.join(__dirname, "index.html"));
};

app.on("ready", function () {
  log.info("App ready");
  appVersion = app.getVersion();
  wss = new WebSocket.Server({ port: 8888 });
  wss.on("connection", function connection(ws) {
    log.info("Connection");
    socket = ws;
    sendSocket("autoHost", settings.autoHost);
    sendStatus("connected");
    ws.on("message", handleWSMessage);
    ws.on("close", function close() {
      log.warn("Socket closed");
      socket = null;
      sendProgress();
      sendStatus("disconnected");
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
  hubWebSocket.on("open", function open() {
    log.info("Connected to hub");
    if (lobby.lobbyName && (!settings.autoHost.private || !app.isPackaged)) {
      sendToHub("hostedLobby", lobby);
    }
    setTimeout(hubHeartbeat, 30000);
  });
  hubWebSocket.on("message", function incoming(data) {
    log.info("Received message from hub: " + data);
  });
  hubWebSocket.on("close", function close() {
    log.warn("Disconnected from hub");
    setTimeout(connectToHub, Math.random() * 10000 + 3000);
    hubWebSocket = null;
  });
}

function hubHeartbeat() {
  if (hubWebSocket) {
    sendToHub("heartbeat");
    setTimeout(hubHeartbeat, 30000);
  }
}

function sendToHub(messageType, data = {}) {
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
  sendWindow("progress", { step, progress });
}

function sendStatus(status = "Waiting For Connection") {
  currentStatus = status;
  win.webContents.send("fromMain", {
    messageType: "statusChange",
    data: status,
  });
}

async function handleWSMessage(message) {
  message = JSON.parse(message);
  switch (message.messageType) {
    case "sendMessage":
      //console.log(message.data);
      break;
    case "clientWebSocket":
      handleClientMessage(message);
      break;
    case "toggleAutoHost":
      log.info("Toggling autoHost");
      autoHost.type = autoHost.type === "off" ? "autoHost" : "off";
      store.set("autoHost", autoHost);
      sendSocket("autoHost", autoHost);
      sendWindow("autoHost", autoHost);
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

function handleClientMessage(message) {
  if (message.data) {
    clientWebSocket = new WebSocket(message.data);

    clientWebSocket.on("open", function open() {
      openParamsJoin();
    });
    clientWebSocket.on("message", function incoming(data) {
      data = JSON.parse(data.toString());
      switch (data.messageType) {
        case "ScreenTransitionInfo":
          screenState = data.payload.screen;
          console.log(screenState);
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
              if (openLobbyParams) {
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
                    flagLockTeams: true,
                    flagPlaceTeamsTogether: true,
                    flagFullSharedUnitControl: false,
                    flagRandomRaces: false,
                    flagRandomHero: false,
                    settingObservers: 0,
                    settingVisibility: 0,
                  },
                  privateGame: settings.autoHost.private,
                };
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
                setTimeout(quitGame, settings.autoHost.rapidHostTimer * 1000 * 60 + 250);
              }
            } else {
              triggerOBS();
              inGame = false;
              clearLobby();
            }
            menuState = data.payload.screen;
            console.log(menuState);
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
    });
    clientWebSocket.on("close", function close() {
      clearLobby();
      log.warn("Game client connection closed!");
    });
  }
}

function handleGameList(data) {
  if (data.games && data.games.length > 0) {
    data.games.some((game) => {
      if (openLobbyParams.lobbyName && game.name === openLobbyParams.lobbyName) {
        log.info("Found game by name");
        sendMessage("JoinGame", {
          gameId: game.id,
          password: "",
          mapFile: game.mapFile,
        });
        return true;
      } else if (openLobbyParams.gameId && game.id === openLobbyParams.gameId) {
        log.info("Found game by Id");
        sendMessage("JoinGame", {
          gameId: game.gameId,
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
  if (lobby.isHost && (!settings.autoHost.private || !app.isPackaged)) {
    sendToHub("hostedLobbyClosed");
  }
  lobby = {};
  if (!inGame) {
    sendWindow("lobbyData", lobby);
  }
}

function openParamsJoin() {
  if (openLobbyParams && menuState === "MAIN_MENU") {
    if (openLobbyParams.lobbyName) {
      sendMessage("SendGameListing", {});
      setTimeout(() => {
        sendMessage("GetGameList", {});
      }, 500);
    } else if (openLobbyParams.gameID && openLobbyParams.mapFile) {
      sendMessage("JoinGame", {
        gameId: openLobbyParams.gameId,
        password: "",
        mapFile: openLobbyParams.mapFile,
      });
      openLobbyParams = null;
    }
  }
}

function handleChatMessage(payload) {
  if (payload.message.source === "gameChat") {
    var sender = payload.message.sender.includes("#")
      ? payload.message.sender
      : selfBattleTag;
    if (
      settings.autoHost.voteStart &&
      payload.message.content.toLowerCase() === "?votestart"
    ) {
      if (lobby.processed.voteStartVotes.size === 0) {
        const emptyPlayerTeam = Object.keys(
          lobby.processed.teamList.playerTeams.data
        ).some(function (team) {
          if (lobby.processed.teamList.playerTeams.data[team].players.length === 0) {
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
      if (!lobby.processed.voteStartVotes.has(sender) && voteTimer) {
        lobby.processed.voteStartVotes.add(sender);
        if (
          lobby.processed.voteStartVotes.size >=
          lobby.processed.allPlayers.length * (settings.autoHost.voteStartPercent / 100)
        ) {
          startGame();
        } else {
          sendChatMessage(
            Math.ceil(
              lobby.processed.allPlayers.length *
                (settings.autoHost.voteStartPercent / 100) -
                lobby.processed.voteStartVotes.size
            ).toString() + " more vote(s) required."
          );
        }
      }
    } else if (payload.message.content.toLowerCase() === "?elo" && lobby.eloAvailable) {
      if (lobby.processed.eloList[sender]) {
        sendChatMessage(sender + " ELO: " + lobby.processed.eloList[sender]);
      } else {
        sendChatMessage("ELO not available");
      }
    } else if (
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

function cancelVote() {
  if (voteTimer) {
    clearTimeout(voteTimer);
    voteTimer = null;
    sendChatMessage("Vote cancelled.");
  } else {
    sendChatMessage("Vote timed out.");
  }
  lobby.processed.voteStartVotes.clear();
}

function handleLobbyUpdate(payload) {
  // If we are not in the same lobby
  if (payload.teamData.playableSlots > 1) {
    if (lobby.lobbyName !== payload.lobbyName) {
      lobby = {};
      processMapData(payload);
    } else {
      lobby.teamData = payload.teamData;
      lobby.availableTeamColors = payload.availableTeamColors;
    }
    processLobby(payload);
  }
}

function processMapData(payload) {
  lobby.isHost = payload.isHost;
  lobby.playerHost = payload.playerHost;
  lobby.mapName = payload.mapData.mapName;
  lobby.lobbyName = payload.lobbyName;
  lobby.region = selfRegion;
  lobby.processed = {
    chatMessages: [],
    lookingUpELO: new Set(),
    eloList: {},
    teamList: {
      lookup: {},
      otherTeams: { data: {}, lookup: {} },
      specTeams: { data: {}, lookup: {} },
      playerTeams: { data: {}, lookup: {} },
    },
    teamListLookup: {},
    allPlayers: [],
    allLobby: [],
    openPlayerSlots: 0,
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
      };
      lobby.processed.teamList.playerTeams.lookup[team.team] = teamName;
      lobby.processed.teamListLookup[team.team] = {
        type: "playerTeams",
        name: teamName,
      };
    }
  });
  payload.players.forEach((player) => {
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
                  sendWindow("lobbyData", lobby);
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
      lobby.processed.voteStartVotes = new Set();
      lobby.eloAvailable = settings.elo.available;
      lobby.lookupName = settings.elo.lookupName;
      sendWindow("lobbyData", lobby);
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
        slot: parseInt(toClose),
      });
    });
  }
  sendWindow("lobbyData", lobby);
  processLobby(payload, true);
}

async function processLobby(payload, sendFull = false) {
  let newAllPlayers = [];
  let newAllLobby = [];
  let newOpenPlayerSlots = 0;
  let newTeamData = {};
  ["otherTeams", "specTeams", "playerTeams"].forEach(function (type) {
    newTeamData[type] = {};
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
          !lobby.processed.teamList[type].data[name].players ||
          !lobby.processed.teamList[type].data[name].slots ||
          lobby.processed.teamList[type].data[name].players.length !==
            data.players.length ||
          JSON.stringify(lobby.processed.teamList[type].data[name].players) !==
            JSON.stringify(data.players) ||
          JSON.stringify(lobby.processed.teamList[type].data[name].slots) !==
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
        lobby.processed.teamList[type].data[name].players = data.players;
        lobby.processed.teamList[type].data[name].slots = data.slots;
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
      lobby.processed.lookingUpELO.delete(user);
    });
    if (eloUpdated && !sendFull) {
      lobbyProcessedUpdate("eloList", lobby.processed.eloList);
    }
    lobby.processed.allPlayers.forEach(function (user) {
      if (
        !Object.keys(lobby.processed.eloList).includes(user) &&
        !lobby.processed.lookingUpELO.has(user)
      ) {
        lobby.processed.lookingUpELO.add(user);
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
                  lobby.processed.lookingUpELO.delete(user);
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
                    win.webContents.send("fromMain", {
                      messageType: "lobbyUpdate",
                      data: lobby,
                    });
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
    if (lobbyIsReady()) {
      finalizeLobby();
    }
  }
  sendWindow("lobbyUpdate", lobby);
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
    let bestCombo = [];
    const combos = new Combination(
      Object.keys(lobby.processed.eloList),
      Math.floor(Object.keys(lobby.processed.eloList).length / 2)
    );
    for (const combo of combos) {
      const comboElo = combo.reduce(
        (a, b) => a + parseInt(lobby.processed.eloList[b]),
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
    swapHelper(lobby);
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
      }, 250);
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
  let swapsFromTeam1 = [];
  let swapsFromTeam2 = [];
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
    if (settings.autoHost.voteStart) {
      text += " You can vote start with ?votestart";
    }
    sendChatMessage(text);
  }
}

function intersect(a, b) {
  var setB = new Set(b);
  return [...new Set(a)].filter((x) => setB.has(x));
}

function sendWindow(messageType, message) {
  win.webContents.send("fromMain", {
    messageType: messageType,
    data: message,
  });
}

function sendSocket(messageType = "info", data = "none") {
  if (socket) {
    socket.send(JSON.stringify({ messageType: messageType, data: data }));
  }
}

function playSound(file) {
  if (!app.isPackaged) {
    sound.play(path.join(__dirname, "sounds\\" + file));
  } else {
    sound.play(path.join(app.getAppPath(), "\\..\\..\\sounds\\" + file));
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
            log.error(e);
            return false;
          }
        })
      ) {
        log.verbose("Found quit. Press q");
        await robot.keyTap("q");
        if (settings.autoHost.sounds) {
          playSound("quit.wav");
        }
      } else {
        log.verbose("Did not find quit, try again in 5 seconds");
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
}

function sendMessage(message, payload) {
  if (clientWebSocket) {
    clientWebSocket.send(JSON.stringify({ message: message, payload: payload }));
  }
}

function sendChatMessage(content) {
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
    title = await window.title;
    if (title === "Warcraft III") return true;
  }
  return false;
}

function getFile(relativePath = "") {
  if (!app.isPackaged) {
    //return path.join(__dirname, relativePath);
    return "src/" + relativePath;
  } else {
    return relativePath;
    //return path.join(app.getAppPath(), "\\..\\..\\" + relativePath);
  }
}

function lobbyProcessedUpdate(key = "", value, teamName = "") {
  if (["otherTeams", "playerTeams", "specTeams"].includes(key)) {
    lobby.processed.teamList[key].data[teamName].slots = value.slots;
    lobby.processed.teamList[key].data[teamName].players = value.players;
    sendToHub("lobbyUpdate", { key, value, teamName });
  } else if (key === "chatMessages") {
    if (!sentMessages.includes(value.content)) {
      lobby.processed.chatMessages.push(value);
      sendToHub("lobbyUpdate", { key, value });
    }
  } else if (lobby.processed[key] !== value) {
    lobby.processed[key] = value;
    sendToHub("lobbyUpdate", { key, value });
  }
  sendWindow("lobbyUpdate", lobby);
}

async function openWarcraft2() {
  warcraftIsOpen = await isWarcraftOpen();
  if (!warcraftIsOpen) {
    shell.openPath(warInstallLoc + "\\_retail_\\x86_64\\Warcraft III.exe");
    let playPosition = await centerOf(
      screen.waitFor("2160/play.png", 15000, {
        confidence: 0.9,
      })
    );
    await mouse.setPosition(playPosition);
    await mouse.leftClick();
  }
}

function openWarcraft() {
  shell.openPath(warInstallLoc + "\\_retail_\\x86_64\\Warcraft III.exe");
  screen
    .waitFor("2160/play.png", 10000, {
      confidence: 0.9,
    })
    .then((result) => {
      centerOf(result).then((position) => {
        mouse.setPosition(position).then(mouse.leftClick());
      });
    })
    .catch((e) => {
      log.error(e);
      //setTimeout(openWarcraft, 5000);
    });
}
