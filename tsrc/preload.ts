const { app, contextBridge, ipcRenderer, shell } = require("electron");
// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld("api", {
  shell: (url: string) => {
    shell.openExternal(url);
  },
  send: (channel: string, data: any) => {
    // whitelist channels
    let validChannels = ["toMain"];
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, data);
    }
  },
  receive: (channel: string, func: any) => {
    let validChannels = ["fromMain"];
    if (validChannels.includes(channel)) {
      // Deliberately strip event as it includes `sender`
      ipcRenderer.on(channel, (event, ...args) => func(...args));
    }
  },
});
// Log details of versions
for (const dependency of ["chrome", "node", "electron"]) {
  console.log(`${dependency}-version`, process.versions[dependency]);
}
/*
const Store = require("electron-store");
const store = new Store();
import type { AppSettings, Lobby, WindowReceive, WindowSend } from "./utility";
var settings: AppSettings = {
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

if (document.readyState !== "loading") {
  console.log("document is ready");
  init();
} else {
  document.addEventListener("DOMContentLoaded", function () {
    console.log("document was not ready");
    init();
  });
}

function init() {
  // Log details of versions
  for (const dependency of ["chrome", "node", "electron"]) {
    console.log(`${dependency}-version`, process.versions[dependency]);
  }
  //Iterate through settings and update settings UI for each
  (Object.keys(settings) as Array<keyof AppSettings>).forEach((setting) => {
    updateSettings(setting);
  });

  // Make all urls open in external browser
  document.body.addEventListener("click", (event) => {
    if ((event.target as HTMLElement).tagName.toLowerCase() === "a") {
      event.preventDefault();
      require("electron").shell.openExternal((event.target as HTMLAnchorElement).href);
    }
  });
  // Add event listeners for all input elements
  document.querySelectorAll("input, select").forEach((target) => {
    let input = target as HTMLInputElement;
    // If it's a textbox, add event listener for keypress. Else, add event listener for change
    if (input.nodeName === "INPUT" && input.type === "text") {
      if (input.getAttribute("data-setting") === "autoHost") {
        input.addEventListener("keyup", updateName);
      } else if (input.getAttribute("data-setting") === "obs") {
        input.addEventListener("keydown", generateHotkeys);
      } else {
        input.addEventListener("change", updateSettingSingle);
      }
    } else {
      input.addEventListener("change", updateSettingSingle);
    }
  });

  document.getElementById("saveNameButton")?.addEventListener("click", sendNames);

  // Prompt node to open file dialog
  document.getElementById("autoHostMapPath")?.addEventListener("click", function () {
    toMain({ messageType: "getMapPath" });
  });

  // Open logs externally
  document.getElementById("logsButton")?.addEventListener("click", function () {
    toMain({ messageType: "openLogs" });
  });
  document.getElementById("warcraftButton")?.addEventListener("click", function () {
    toMain({ messageType: "openWar" });
  });

  const statusElement: HTMLElement | null = document.getElementById("mainStatus");
  const statusText: HTMLElement | null = document.getElementById("statusText");
  const progressBar: HTMLElement | null = document.getElementById("progressBar");
  const progressBarLabel: HTMLElement | null =
    document.getElementById("progressBarLabel");

  ipcRenderer.on("fromMain", (event, data: WindowReceive) => {
    let newData = data.data;
    switch (data.messageType) {
      case "statusChange":
        switch (newData.status) {
          case "connected":
            if (statusText) statusText.innerText = "Connected to Warcraft";
            statusElement?.classList.remove("bg-secondary", "bg-warning");
            statusElement?.classList.add("bg-success", "badge");
            break;
          case "disconnected":
            if (statusText) statusText.innerText = "Disconnected from Warcraft";
            statusElement?.classList.remove("bg-secondary", "bg-success");
            statusElement?.classList.add("bg-warning", "badge");
            break;
        }
        break;
      case "updateSettingSingle":
        let update = newData.update;
        if (update) {
          // @ts-ignore
          settings[update.setting][update.key] = update.value;
          updateSettings(update.setting);
        }
        break;
      case "lobbyUpdate":
        let newLobby = newData.lobby;
        if (newLobby) {
          console.log(newLobby);
          generateTables(newLobby);
        }

        break;
      case "lobbyData":
        if (newData.lobby) {
          generateLobbyData(newData.lobby);
        }
        break;
      case "processing":
        let progress = newData.progress;
        if (progress && progressBarLabel && progressBar) {
          progressBarLabel.innerText = progress.step;
          progressBar.style.width = progress.progress.toString() + "%";
        }

        break;
      case "menusChange":
        (document.getElementById("menuStateLabel") as HTMLElement).innerText =
          newData.value ?? "Unknown";
        break;
      case "error":
        let alertDiv = document.createElement("div");
        alertDiv.classList.add(
          "alert",
          "alert-danger",
          "alert-dismissible",
          "fade",
          "show"
        );
        alertDiv.setAttribute("role", "alert");
        alertDiv.innerHTML = `<strong>Error!</strong> ${data.data} <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>`;
        document.body.prepend(alertDiv);
        break;
      case "gotMapPath":
        (document.getElementById("mapPathSpan") as HTMLElement).innerText =
          newData.value ?? "Unknown";
        break;
      default:
        console.log("Unknown:", data);
    }
  });
}

function generateHotkeys(e: KeyboardEvent) {
  e.preventDefault();
  let newValue;
  if (e.key.toLowerCase() !== "backspace") {
    if (
      e.key !== "Control" &&
      e.key !== "Meta" &&
      e.key !== "Alt" &&
      e.key !== "Shift" &&
      e.key !== "Tab"
    ) {
      (e.target as HTMLInputElement).value =
        (e.shiftKey ? "Shift + " : "") +
        (e.ctrlKey ? "Ctrl + " : "") +
        (e.altKey ? "Alt + " : "") +
        e.key.toUpperCase();
      newValue = {
        shiftKey: e.shiftKey,
        ctrlKey: e.ctrlKey,
        altKey: e.altKey,
        key: e.key.toUpperCase(),
      };
    }
  } else {
    (e.target as HTMLInputElement).value = "";
    newValue = false;
  }
  if (newValue != null) {
    let key = (e.target as HTMLElement).getAttribute("data-key");
    if (key) {
      toMain({
        messageType: "updateSettingSingle",
        data: {
          update: {
            setting: "obs",
            key,
            value: newValue,
          },
        },
      });
    }
  }
}

function generateLobbyData(data: Lobby) {
  try {
    (document.getElementById("mapName") as HTMLElement).innerText = data.mapName;
    (document.getElementById("gameName") as HTMLElement).innerText = data.lobbyName;
    (document.getElementById("gameHost") as HTMLElement).innerText = data.playerHost;
    (
      document.getElementById("eloAvailable") as HTMLElement
    ).innerText = `${data.eloAvailable}. (${data.lookupName})`;
  } catch (e: any) {
    console.log(e.message, e.stack);
  }
}

// This is going to be a very messy function,placeholder to just get it started
function generateTables(lobby: Lobby) {
  try {
    (document.getElementById("tablesDiv") as HTMLElement).innerHTML = "";
    let tbl;
    Object.keys(lobby.processed.teamList.playerTeams.data).forEach((playerTeam) => {
      tbl = document.createElement("table");
      tbl.classList.add("table", "table-hover", "table-striped", "table-sm");
      let trow = tbl.createTHead().insertRow();
      [`${playerTeam} Players`, "ELO"].forEach((label) => {
        let th = document.createElement("th");
        th.appendChild(document.createTextNode(label));
        trow.appendChild(th);
      });
      let tBody = tbl.createTBody();
      lobby.processed.teamList.playerTeams.data[playerTeam].slots?.forEach((player) => {
        let row = tBody.insertRow();
        row.insertCell().appendChild(document.createTextNode(player));
        let cell = row.insertCell();
        let text = document.createTextNode(
          lobby.processed.eloList && lobby.processed.eloList[player]
            ? lobby.processed.eloList[player].toString()
            : "N/A"
        );
        cell.appendChild(text);
      });

      (document.getElementById("tablesDiv") as HTMLElement).appendChild(tbl);
    });
  } catch (e: any) {
    console.error(e.message, e.stack);
  }
}

function updateSettingSingle(event: Event) {
  const target = event.target as HTMLInputElement;
  let value =
    target.nodeName === "INPUT" && target.type === "checkbox"
      ? target.checked
      : target.value;
  const key = target.getAttribute("data-key");
  const setting = target.getAttribute("data-setting");
  let slot = target.getAttribute("data-slot");
  if (key && setting && slot) {
    if (key === "closeSlots" && slot && parseInt(slot)) {
      let slotNum = parseInt(slot);
      if (value === true && !settings.autoHost.closeSlots.includes(slotNum)) {
        settings.autoHost.closeSlots.push(slotNum);
      } else if (settings.autoHost.closeSlots.includes(slotNum)) {
        settings.autoHost.closeSlots.splice(
          settings.autoHost.closeSlots.indexOf(slotNum),
          1
        );
      }
      (value as any) = settings.autoHost.closeSlots;
      console.log(value);
    }
    toMain({
      messageType: "updateSettingSingle",
      data: {
        update: {
          setting: setting as keyof AppSettings,
          key: key,
          value: value,
        },
      },
    });
  }
}

function updateName(event: KeyboardEvent) {
  if (event.key === "Enter") {
    sendNames();
  } else if ((event.target as HTMLInputElement).value !== settings.autoHost.gameName) {
    (document.getElementById("saveNameButton") as HTMLElement).style.display = "block";
  } else {
    (document.getElementById("saveNameButton") as HTMLElement).style.display = "none";
  }
}

function sendNames() {
  const autoHostGameName = (
    document.getElementById("autoHostGameName") as HTMLInputElement
  ).value;
  if (autoHostGameName !== settings.autoHost.gameName) {
    toMain({
      messageType: "updateSettingSingle",
      data: {
        update: {
          setting: "autoHost",
          key: "gameName",
          value: autoHostGameName,
        },
      },
    });
  }
  (document.getElementById("saveNameButton") as HTMLElement).style.display = "none";
}

function updateSettings(setting: keyof AppSettings) {
  if (setting === "autoHost") {
    (document.getElementById("mapPathSpan") as HTMLElement).innerText =
      settings.autoHost.mapPath;
  }
  document.forms[setting as any].querySelectorAll("input, select").forEach((target) => {
    let input = target as HTMLInputElement;
    let key = input.getAttribute("data-key");
    if (key) {
      if (setting === "obs" && (key === "inGameHotkey" || key === "outOfGameHotkey")) {
        const target = settings.obs[key];
        if (target) {
          input.value =
            (target.shiftKey ? "Shift + " : "") +
            (target.ctrlKey ? "Ctrl + " : "") +
            (target.altKey ? "Alt + " : "") +
            target.key;
        }
      } else if (input.type === "checkbox") {
        if (key === "closeSlots") {
          input.checked = settings.autoHost.closeSlots.includes(
            parseInt(input.getAttribute("data-slot") ?? "0")
          );
        } else {
          // @ts-ignore
          input.checked = settings[setting][key];
        }
      } else {
        // @ts-ignore
        input.value = settings[setting][key];
      }
    }
  });
  (document.getElementById(setting + "Settings") as HTMLElement).style.display =
    settings[setting].type !== "off" ? "block" : "none";
}

function toMain(args: WindowSend) {
  ipcRenderer.send("toMain", args);
}
*/
