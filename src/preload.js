const { contextBridge, ipcRenderer } = require("electron");
const Store = require("electron-store");
const store = new Store();

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
// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
/*
contextBridge.exposeInMainWorld("api", {
  send: (channel, data) => {
    // whitelist channels
    let validChannels = ["toMain"];
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, data);
    }
  },
  receive: (channel, func) => {
    let validChannels = ["fromMain"];
    if (validChannels.includes(channel)) {
      // Deliberately strip event as it includes `sender`
      ipcRenderer.on(channel, (event, ...args) => func(...args));
    }
  },
});*/

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
  Object.keys(settings).forEach((setting) => {
    updateSettings(setting);
  });

  // Make all urls open in external browser
  document.body.addEventListener("click", (event) => {
    if (event.target.tagName.toLowerCase() === "a") {
      event.preventDefault();
      require("electron").shell.openExternal(event.target.href);
    }
  });
  // Add event listeners for all input elements
  document.querySelectorAll("input, select").forEach((input) => {
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

  document
    .getElementById("saveNameButton")
    .addEventListener("click", sendNames);

  // Prompt node to open file dialog
  document
    .getElementById("autoHostMapPath")
    .addEventListener("click", function () {
      ipcRenderer.send("toMain", { messageType: "getMapPath" });
    });

  // Open logs externally
  document.getElementById("logsButton").addEventListener("click", function () {
    ipcRenderer.send("toMain", {
      messageType: "openLogs",
    });
  });

  const statusElement = document.getElementById("mainStatus");
  const statusText = document.getElementById("statusText");
  const progressBar = document.getElementById("progressBar");
  const progressBarLabel = document.getElementById("progressBarLabel");

  ipcRenderer.on("fromMain", (event, data) => {
    switch (data.messageType) {
      case "statusChange":
        switch (data.data) {
          case "connected":
            statusText.innerText = "Connected to Warcraft";
            statusElement.classList.remove("bg-secondary", "bg-warning");
            statusElement.classList.add("bg-success", "badge");
            break;
          case "disconnected":
            statusText.innerText = "Disconnected from Warcraft";
            statusElement.classList.remove("bg-secondary", "bg-success");
            statusElement.classList.add("bg-warning", "badge");
            break;
        }
        break;
      case "updateSettingSingle":
        settings[data.data.setting][data.data.key] = data.data.value;
        updateSettings(data.data.setting);
        break;
      case "lobbyUpdate":
        generateTables(data.data);
        break;
      case "lobbyData":
        generateLobbyData(data.data);
        break;
      case "processing":
        progressBarLabel.innerText = data.data.step;
        progressBar.style.width = data.data.progress.toString() + "%";
        break;
      case "menusChange":
        document.getElementById("menuStateLabel").innerText = data.data;
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
        alertDiv.role = "alert";
        alertDiv.innerHTML = `<strong>Error!</strong> ${data.data} <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>`;
        document.body.prepend(alertDiv);
        break;
      case "gotMapPath":
        document.getElementById("mapPathSpan").innerText = data.data;
        break;
      default:
        console.log("Unknown:", data);
    }
  });
}

function generateHotkeys(e) {
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
      e.target.value =
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
    e.target.value = "";
    newValue = false;
  }
  if (newValue != null) {
    ipcRenderer.send("toMain", {
      messageType: "updateSettingSingle",
      data: {
        setting: "obs",
        key: e.target.getAttribute("data-key"),
        value: newValue,
      },
    });
  }
}

function generateLobbyData(data) {
  try {
    document.getElementById("mapName").innerText = data.mapName;
    document.getElementById("gameName").innerText = data.lobbyName;
    document.getElementById("gameHost").innerText = data.playerHost;
    document.getElementById(
      "eloAvailable"
    ).innerText = `${data.eloAvailable}. (${data.lookupName})`;
  } catch (e) {
    console.log(e.message, e.stack);
  }
}

// This is going to be a very messy function,placeholder to just get it started
function generateTables(lobby) {
  try {
    document.getElementById("tablesDiv").innerHTML = "";
    let tbl;
    Object.keys(lobby.processed.teamList.playerTeams.data).forEach(
      (playerTeam) => {
        tbl = document.createElement("table");
        tbl.classList.add("table", "table-hover", "table-striped", "table-sm");
        let trow = tbl.createTHead().insertRow();
        [`${playerTeam} Players`, "ELO"].forEach((label) => {
          let th = document.createElement("th");
          th.appendChild(document.createTextNode(label));
          trow.appendChild(th);
        });
        let tBody = tbl.createTBody();
        lobby.processed.teamList.playerTeams.data[playerTeam].slots.forEach(
          (player) => {
            let row = tBody.insertRow();
            row.insertCell().appendChild(document.createTextNode(player));
            let cell = row.insertCell();
            let text = document.createTextNode(
              lobby.processed.eloList && lobby.processed.eloList[player]
                ? lobby.processed.eloList[player]
                : "N/A"
            );
            cell.appendChild(text);
          }
        );
        document.getElementById("tablesDiv").appendChild(tbl);
      }
    );
  } catch (e) {
    console.error(e.message, e.stack);
  }
}

function updateSettingSingle(event) {
  let value =
    event.target.nodeName === "INPUT" && event.target.type === "checkbox"
      ? event.target.checked
      : event.target.value;
  const key = event.target.getAttribute("data-key");
  const setting = event.target.getAttribute("data-setting");
  if (key === "closeSlots") {
    const slot = event.target.getAttribute("data-slot");
    if (value === true && !settings.autoHost.closeSlots.includes(slot)) {
      settings.autoHost.closeSlots.push(slot);
    } else if (settings.autoHost.closeSlots.includes(slot)) {
      settings.autoHost.closeSlots.splice(
        settings.autoHost.closeSlots.indexOf(slot),
        1
      );
    }
    value = settings.autoHost.closeSlots;
    console.log(value);
  }
  ipcRenderer.send("toMain", {
    messageType: "updateSettingSingle",
    data: {
      setting: setting,
      key: key,
      value: value,
    },
  });
}

function updateName(event) {
  if (event.key === "Enter") {
    sendNames();
  } else if (event.target.value !== settings.autoHost.gameName) {
    document.getElementById("saveNameButton").style.display = "block";
  } else {
    document.getElementById("saveNameButton").style.display = "none";
  }
}

function sendNames() {
  const autoHostGameName = document.getElementById("autoHostGameName").value;
  if (autoHostGameName !== settings.autoHost.gameName) {
    ipcRenderer.send("toMain", {
      messageType: "updateSettingSingle",
      data: {
        setting: "autoHost",
        key: "gameName",
        value: autoHostGameName,
      },
    });
  }
  document.getElementById("saveNameButton").style.display = "none";
}

function updateSettings(setting) {
  if (setting === "autoHost") {
    document.getElementById("mapPathSpan").innerText =
      settings.autoHost.mapPath;
  }
  document.forms[setting].querySelectorAll("input, select").forEach((input) => {
    if (input.getAttribute("data-key")) {
      if (
        setting === "obs" &&
        (input.getAttribute("data-key") === "inGameHotkey" ||
          input.getAttribute("data-key") === "outOfGameHotkey")
      ) {
        const target = settings.obs[input.getAttribute("data-key")];
        if (target) {
          input.value =
            (target.shiftKey ? "Shift + " : "") +
            (target.ctrlKey ? "Ctrl + " : "") +
            (target.altKey ? "Alt + " : "") +
            target.key;
        }
      } else if (input.type === "checkbox") {
        if (input.getAttribute("data-key") === "closeSlots") {
          input.checked = settings.autoHost.closeSlots.includes(
            input.getAttribute("data-slot")
          );
        } else {
          input.checked = settings[setting][input.getAttribute("data-key")];
        }
      } else {
        input.value = settings[setting][input.getAttribute("data-key")];
      }
    }
  });
  document.getElementById(setting + "Settings").style.display =
    settings[setting].type !== "off" ? "block" : "none";
}
