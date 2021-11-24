<script lang="ts">
  import type {
    AppSettings,
    Lobby,
    SettingsKeys,
    WindowReceive,
    WindowSend,
  } from "../../tsrc/utility";
  import CloseSlot from "./components/CloseSlot.svelte";
  let settings: AppSettings = {
    autoHost: {
      type: "off",
      private: false,
      sounds: false,
      increment: true,
      mapName: "",
      gameName: "",
      mapPath: "N/A",
      announceIsBot: false,
      announceRestingInterval: 30,
      moveToSpec: false,
      rapidHostTimer: 0,
      voteStart: false,
      voteStartPercent: 60,
      closeSlots: [],
    },
    obs: {
      type: "off",
      inGameHotkey: false,
      outOfGameHotkey: false,
    },
    elo: {
      type: "off",
      balanceTeams: true,
      announce: true,
      excludeHostFromSwap: true,
      lookupName: "",
      available: false,
    },
    discord: {
      type: "off",
      token: "",
      channel: "",
    },
  };
  let currentStatus = {
    connected: false,
    menu: "Out of menus",
    progress: { percent: 0, step: "Waiting" },
    lobby: {} as Lobby,
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
    toMain({ messageType: "init" });

    // Make all urls open in external browser
    document.body.addEventListener("click", (event) => {
      if ((event.target as HTMLElement).tagName.toLowerCase() === "a") {
        event.preventDefault();
        require("electron").shell.openExternal((event.target as HTMLAnchorElement).href);
      }
    });
  }
  // @ts-ignore
  window.api.receive("fromMain", (data: WindowReceive) => {
    let newData = data.data;
    switch (data.messageType) {
      case "statusChange":
        currentStatus.connected = newData.connected;
        break;
      case "updateSettings":
        settings = newData.settings;
        console.log(settings);
        break;
      case "updateSettingSingle":
        let update = newData.update;
        if (update) {
          // @ts-ignore
          settings[update.setting][update.key] = update.value;
        }
        break;
      case "lobbyData":
        console.dir(newData.lobby);
        let newLobby = newData.lobby;
        if (newLobby) {
          currentStatus.lobby = newLobby;
        }
        break;
      case "progress":
        let progress = newData.progress;
        if (progress) {
          currentStatus.progress.step = progress.step;
          currentStatus.progress.percent = progress.progress;
        }
        break;
      case "menusChange":
        currentStatus.menu = newData.value ?? "Out of Menuts";
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
        settings.autoHost.mapPath = newData.value;
        break;
      default:
        console.log("Unknown:", data);
    }
  });
  function generateHotkeys(e: KeyboardEvent) {
    e.preventDefault();
    let newValue:
      | { key: string; shiftKey: boolean; ctrlKey: boolean; altKey: boolean }
      | false;
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
              key: key as SettingsKeys,
              value: newValue,
            },
          },
        });
      }
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

  function updateSettingSingle(
    setting: keyof AppSettings,
    key: SettingsKeys,
    value: boolean | string,
    slot: number | null = null
  ) {
    if (key === "closeSlots" && slot != null) {
      let slotNum = slot;
      if (value === true && !settings.autoHost.closeSlots.includes(slotNum)) {
        settings.autoHost.closeSlots.push(slotNum);
      } else if (settings.autoHost.closeSlots.includes(slotNum)) {
        settings.autoHost.closeSlots.splice(
          settings.autoHost.closeSlots.indexOf(slotNum),
          1
        );
      }
      (value as any) = settings.autoHost.closeSlots;
    }
    toMain({
      messageType: "updateSettingSingle",
      data: {
        update: {
          setting: setting,
          key,
          value: value,
        },
      },
    });
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

  function toMain(args: WindowSend) {
    // @ts-ignore
    window.api.send("toMain", args);
  }
</script>

<main>
  <div class="modal fade" id="settingsModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-lg">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">Settings</h5>
          <button
            type="button"
            class="btn-close"
            data-bs-dismiss="modal"
            aria-label="Close"
          />
        </div>
        <div class="modal-body">
          <div class="container">
            <form name="elo" class="p-2">
              <div class="row">
                <div class="col">
                  <label for="eloLookup" class="form-label">ELO Lookup</label>
                  <select
                    id="eloLookup"
                    class="form-select"
                    data-key="type"
                    data-setting="elo"
                    bind:value={settings.elo.type}
                    on:change={(e) =>
                      // @ts-ignore
                      updateSettingSingle("elo", "type", e.target.value)}
                  >
                    <option value="off">Disabled</option>
                    <option value="wc3stats">wc3stats.com</option>
                  </select>
                </div>
              </div>
              {#if settings.elo.type !== "off"}
                <div id="eloSettings" class="row border m-2">
                  <div class="col">
                    <div class="d-flex justify-content-center">ELO Settings</div>
                    <div
                      class="d-flex justify-content-center btn-group pb-2"
                      role="group"
                    >
                      <input
                        type="checkbox"
                        class="btn-check"
                        id="balanceTeamsCheck"
                        data-key="balanceTeams"
                        data-setting="elo"
                        bind:checked={settings.elo.balanceTeams}
                        on:change={(e) =>
                          // @ts-ignore
                          updateSettingSingle("elo", "balanceTeams", e.target.checked)}
                      />
                      <label for="balanceTeamsCheck" class="btn btn-outline-primary"
                        >Balance Teams</label
                      >
                      <input
                        type="checkbox"
                        class="btn-check"
                        id="excludeHostFromSwapCheck"
                        data-key="excludeHostFromSwap"
                        data-setting="elo"
                        bind:checked={settings.elo.excludeHostFromSwap}
                        on:change={(e) =>
                          updateSettingSingle(
                            "elo",
                            "excludeHostFromSwap",
                            // @ts-ignore
                            e.target.checked
                          )}
                      />
                      <label
                        for="excludeHostFromSwapCheck"
                        class="btn btn-outline-primary">Exclude Host From Swap</label
                      >
                      <input
                        type="checkbox"
                        class="btn-check"
                        id="announceELOCheck"
                        data-key="announce"
                        data-setting="elo"
                        bind:checked={settings.elo.announce}
                        on:change={(e) =>
                          updateSettingSingle(
                            "elo",
                            "announce",
                            // @ts-ignore
                            e.target.checked
                          )}
                      />
                      <label for="announceELOCheck" class="btn btn-outline-primary"
                        >Announce ELO</label
                      >
                    </div>
                  </div>
                </div>
              {/if}
            </form>
            <form name="autoHost" class="p-2">
              <div class="row">
                <div class="col">
                  <label for="autoHostState" class="form-label">
                    <details>
                      <summary>Auto Host</summary><strong>Lobby Host:</strong> Starts a
                      lobby with specified settings. (Ignores Announce is Bot)<br />
                      <strong>Rapid Host:</strong> Hosts lobbies, auto starts, leaves the
                      game after specified timer(minutes).<br />
                      <strong>Smart Host:</strong> Hosts lobbies, auto starts, quits the
                      game if this end screen pops up:
                      <img
                        class="img-fluid"
                        src="images/1080/quitNormal.png"
                        alt="Quit Normal"
                      />
                    </details>
                  </label>
                  <select
                    id="autoHostState"
                    class="form-select"
                    data-key="type"
                    data-setting="autoHost"
                    bind:value={settings.autoHost.type}
                    on:change={(e) =>
                      updateSettingSingle(
                        "autoHost",
                        "type",
                        // @ts-ignore
                        e.target.value
                      )}
                  >
                    <option value="off">Disabled</option>
                    <option value="lobbyHost">Lobby Host</option>
                    <option value="rapidHost">Rapid Host</option>
                    <option value="smartHost">Smart Host</option>
                  </select>
                </div>
              </div>
              {#if settings.autoHost.type !== "off"}
                <div id="autoHostSettings" class="border m-2">
                  <div class="row">
                    <div class="col d-flex justify-content-center">
                      Auto Host Settings
                    </div>
                  </div>
                  <div class="row p-2">
                    <div
                      class="btn-group btn-group-sm"
                      style="flex-wrap: wrap;"
                      role="group"
                    >
                      <input
                        type="checkbox"
                        class="btn-check"
                        id="autoHostPrivateCheck"
                        data-key="private"
                        data-setting="autoHost"
                        bind:checked={settings.autoHost.private}
                        on:change={(e) =>
                          updateSettingSingle(
                            "autoHost",
                            "private",
                            // @ts-ignore
                            e.target.checked
                          )}
                      />
                      <label for="autoHostPrivateCheck" class="btn btn-outline-primary"
                        >Private Lobbies</label
                      >
                      <input
                        type="checkbox"
                        class="btn-check"
                        id="autoHostIncrementCheck"
                        data-key="increment"
                        data-setting="autoHost"
                        bind:checked={settings.autoHost.increment}
                        on:change={(e) =>
                          updateSettingSingle(
                            "autoHost",
                            "increment",
                            // @ts-ignore
                            e.target.checked
                          )}
                      />
                      <label for="autoHostIncrementCheck" class="btn btn-outline-primary"
                        >Incremental Lobbies</label
                      >
                      <input
                        type="checkbox"
                        class="btn-check"
                        id="autoHostSoundsCheck"
                        data-key="sounds"
                        data-setting="autoHost"
                        bind:checked={settings.autoHost.sounds}
                        on:change={(e) =>
                          updateSettingSingle(
                            "autoHost",
                            "sounds",
                            // @ts-ignore
                            e.target.checked
                          )}
                      />
                      <label for="autoHostSoundsCheck" class="btn btn-outline-primary"
                        >Sound Notifications</label
                      >
                      <input
                        type="checkbox"
                        class="btn-check"
                        id="announceIsBotCheck"
                        data-key="announceIsBot"
                        data-setting="autoHost"
                        bind:checked={settings.autoHost.announceIsBot}
                        on:change={(e) =>
                          updateSettingSingle(
                            "autoHost",
                            "announceIsBot",
                            // @ts-ignore
                            e.target.checked
                          )}
                      />
                      <label for="announceIsBotCheck" class="btn btn-outline-primary"
                        >Announce Is Bot</label
                      >
                      <input
                        type="checkbox"
                        class="btn-check"
                        id="moveToSpecCheck"
                        data-key="moveToSpec"
                        data-setting="autoHost"
                        bind:checked={settings.autoHost.moveToSpec}
                        on:change={(e) =>
                          updateSettingSingle(
                            "autoHost",
                            "moveToSpec",
                            // @ts-ignore
                            e.target.checked
                          )}
                      />
                      <label for="moveToSpecCheck" class="btn btn-outline-primary"
                        >Move to Spec/Host</label
                      >
                      <input
                        type="checkbox"
                        class="btn-check"
                        id="voteStartCheck"
                        data-key="voteStart"
                        data-setting="autoHost"
                        bind:checked={settings.autoHost.voteStart}
                        on:change={(e) =>
                          updateSettingSingle(
                            "autoHost",
                            "voteStart",
                            // @ts-ignore
                            e.target.checked
                          )}
                      />
                      <label for="voteStartCheck" class="btn btn-outline-primary"
                        >Vote start</label
                      >
                    </div>
                  </div>
                  <div class="row p-2">
                    <div class="col">
                      <button
                        on:click={() => toMain({ messageType: "getMapPath" })}
                        type="button"
                        class="btn btn-primary"
                        id="autoHostMapPath"
                        >Current Map:
                      </button><span>{settings.autoHost.mapPath}</span>
                    </div>
                  </div>
                  <div class="row p-2">
                    <div class="col">
                      <label for="autoHostGameName" class="form-label">Game Name</label>
                      <input
                        type="text"
                        class="form-control"
                        id="autoHostGameName"
                        placeholder="Game Name"
                        maxlength="27"
                        minlength="3"
                        data-key="gameName"
                        data-setting="autoHost"
                        bind:value={settings.autoHost.gameName}
                        on:keydown={(e) => {
                          if (e.key === "Enter") {
                            updateSettingSingle(
                              "autoHost",
                              "gameName",
                              // @ts-ignore
                              e.target.value
                            );
                          }
                        }}
                        on:change={(e) =>
                          updateSettingSingle(
                            "autoHost",
                            "gameName",
                            // @ts-ignore
                            e.target.value
                          )}
                      />
                    </div>
                  </div>
                  <div class="row p-2">
                    <div class="col">
                      <label for="voteStartPercent" class="form-label"
                        >Vote Start Percentage</label
                      >
                      <input
                        type="number"
                        id="voteStartPercent"
                        class="form-control"
                        data-key="voteStartPercent"
                        data-setting="autoHost"
                        min="5"
                        max="100"
                        bind:value={settings.autoHost.voteStartPercent}
                        on:change={(e) =>
                          updateSettingSingle(
                            "autoHost",
                            "voteStartPercent",
                            // @ts-ignore
                            e.target.value
                          )}
                      />
                    </div>
                    <div class="col">
                      <label for="rapidHostTimer" class="form-label"
                        >Rapid Host Timer</label
                      >
                      <input
                        type="number"
                        id="rapidHostTimer"
                        class="form-control"
                        data-key="rapidHostTimer"
                        data-setting="autoHost"
                        min="0"
                        max="360"
                        bind:value={settings.autoHost.rapidHostTimer}
                        on:change={(e) =>
                          updateSettingSingle(
                            "autoHost",
                            "rapidHostTimer",
                            // @ts-ignore
                            e.target.value
                          )}
                      />
                    </div>
                  </div>
                  <div class="row p-2">
                    <div class="col">
                      <label for="announceRestingInterval" class="form-label"
                        >Minimum seconds between announcements</label
                      >
                      <input
                        type="number"
                        id="announceRestingInterval"
                        class="form-control"
                        data-key="announceRestingInterval"
                        data-setting="autoHost"
                        min="0"
                        max="600"
                        bind:value={settings.autoHost.announceRestingInterval}
                        on:change={(e) =>
                          updateSettingSingle(
                            "autoHost",
                            "announceRestingInterval",
                            // @ts-ignore
                            e.target.value
                          )}
                      />
                    </div>
                  </div>
                  <div class="row p-2">
                    <div class="col">
                      Close Slots:
                      <div class="btn-group btn-group-sm w-100 py-1" role="group">
                        {#each Array.from(Array(12).keys()) as i}
                          <CloseSlot
                            checked={settings.autoHost.closeSlots.includes(i) ?? false}
                            on:change={(e) => {
                              updateSettingSingle(
                                "autoHost",
                                "closeSlots",
                                // @ts-ignore
                                e.target.checked,
                                i
                              );
                            }}
                            number={(i + 1).toString()}
                          />
                        {/each}
                      </div>
                      <div class="btn-group btn-group-sm w-100 py-1" role="group">
                        {#each Array.from(Array(12).keys()) as i}
                          <CloseSlot
                            checked={settings.autoHost.closeSlots.includes(i + 13) ??
                              false}
                            on:change={(e) => {
                              updateSettingSingle(
                                "autoHost",
                                "closeSlots",
                                // @ts-ignore
                                e.target.checked,
                                i + 13
                              );
                            }}
                            number={(i + 13).toString()}
                          />
                        {/each}
                      </div>
                    </div>
                  </div>
                </div>
              {/if}
            </form>
            <form name="obs" class="p-2">
              <div class="row">
                <div class="col">
                  <label for="obsSelect" class="form-label">OBS Integration</label>
                  <select
                    id="obsSelect"
                    class="form-select"
                    data-key="type"
                    data-setting="obs"
                    bind:value={settings.obs.type}
                    on:change={(e) =>
                      updateSettingSingle(
                        "obs",
                        "type", // @ts-ignore
                        e.target.value
                      )}
                  >
                    <option value="off" selected>Disabled</option>
                    <option value="hotkeys">Simulate Hotkeys</option>
                    <!--<option value="websockets" disabled>OBS Websockets</option>-->
                  </select>
                </div>
              </div>
              {#if settings.obs.type === "hotkeys"}
                <div id="obsSettings" class="border m-2 p-2">
                  <div class="row">
                    <div class="col d-flex justify-content-center">
                      OBS Hotkeys Settings
                    </div>
                    <div class="row">
                      <div class="col">
                        <label for="inGameHotkey">In game hotkey</label>
                        <input
                          type="text"
                          class="form-control"
                          id="inGameHotkey"
                          placeholder="In game hotkey"
                          data-key="inGameHotkey"
                          data-setting="obs"
                          on:keydown={generateHotkeys}
                          value={settings.obs.inGameHotkey
                            ? (settings.obs.inGameHotkey.shiftKey ? "Shift + " : "") +
                              (settings.obs.inGameHotkey.ctrlKey ? "Ctrl + " : "") +
                              (settings.obs.inGameHotkey.altKey ? "Alt + " : "") +
                              settings.obs.inGameHotkey.key
                            : ""}
                        />
                      </div>
                    </div>
                    <div class="row">
                      <div class="col">
                        <label for="outOfGameHotkey">Out of game hotkey</label>
                        <input
                          type="text"
                          class="form-control"
                          id="outOfGameHotkey"
                          placeholder="Out of game hotkey"
                          data-key="outOfGameHotkey"
                          data-setting="obs"
                          on:keydown={generateHotkeys}
                          value={settings.obs.outOfGameHotkey
                            ? (settings.obs.outOfGameHotkey.shiftKey ? "Shift + " : "") +
                              (settings.obs.outOfGameHotkey.ctrlKey ? "Ctrl + " : "") +
                              (settings.obs.outOfGameHotkey.altKey ? "Alt + " : "") +
                              settings.obs.outOfGameHotkey.key
                            : ""}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              {:else if settings.obs.type === "websockets"}
                <div id="obsWeboscketsSettings" class="border m-2" style="display:none" />
              {/if}
            </form>
            <form name="discord" class="p-2">
              <div class="row">
                <div class="col">
                  <label for="discordSelect" class="form-label">Discord Integration</label
                  >
                  <select
                    id="discordSelect"
                    class="form-select"
                    data-key="type"
                    data-setting="discord"
                    disabled
                  >
                    <option value="off" selected>Disabled</option>
                    <option value="on">Enabled</option>
                  </select>
                </div>
              </div>
              {#if settings.discord.type !== "off"}
                <div id="discordSettings" class="border m-2 p-2">
                  <div class="row">
                    <div class="col d-flex justify-content-center">Discord Settings</div>
                    <div class="row">
                      <div class="col">
                        <label for="discordToken">Token</label>
                        <input
                          type="text"
                          class="form-control"
                          id="discordToken"
                          placeholder="Token"
                          data-key="token"
                          data-setting="discord"
                        />
                      </div>
                    </div>
                    <div class="row">
                      <div class="col">
                        <label for="discordChannel">Channel</label>
                        <input
                          type="text"
                          class="form-control"
                          id="discordChannel"
                          placeholder="Channel"
                          data-key="channel"
                          data-setting="discord"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              {/if}
            </form>
          </div>
        </div>
        <div />
      </div>
    </div>
  </div>
  <div class="d-flex justify-content-center p-2">
    {#if currentStatus.connected}
      <span class="badge bg-success" id="mainStatus">
        <h2 id="statusText">Connected to Warcraft</h2>
      </span>
    {:else}
      <span class="badge bg-secondary" id="mainStatus">
        <h2 id="statusText">Waiting for Connection</h2>
      </span>
    {/if}
  </div>
  <div class="d-flex justify-content-center pt-1">
    <button
      type="button"
      class="btn btn-primary"
      data-bs-toggle="modal"
      data-bs-target="#settingsModal"
    >
      Settings
    </button>
    <button
      on:click={() => toMain({ messageType: "openLogs" })}
      type="button"
      class="btn btn-primary"
      id="logsButton"
    >
      Open Logs
    </button>
    <button
      on:click={() => toMain({ messageType: "openWar" })}
      type="button"
      class="btn btn-primary"
      id="warcraftButton"
    >
      Open Warcraft
    </button>
    <a href="https://war.trenchguns.com" type="button" class="btn btn-primary">
      Visit The Hub
    </a>
    <a href="https://discord.gg/yNAyJyE9V8" type="button" class="btn btn-primary">
      Discord
    </a>
  </div>
  <h4>Menu State: <span id="menuStateLabel">{currentStatus.menu}</span></h4>
  <h4>Current Step: <span />{currentStatus.progress.step}</h4>
  <div class="progress">
    <div
      id="progressBar"
      class="progress-bar progress-bar-striped progress-bar-animated"
      role="progressbar"
      aria-valuenow={currentStatus.progress.percent}
      style="width: {currentStatus.progress.percent.toString()}%"
    />
  </div>
  <table class="table table-sm">
    <thead>
      <tr>
        <th>Map Name</th>
        <th>Game Name</th>
        <th>Game Host</th>
        <th>ELO Available</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td id="mapName">{currentStatus.lobby.mapName ?? ""}</td>
        <td id="lobbyName">{currentStatus.lobby.lobbyName ?? ""}</td>
        <td id="gameHost">{currentStatus.lobby.playerHost ?? ""}</td>
        <td id="eloAvailable">{currentStatus.lobby.eloAvailable ?? ""}</td>
      </tr>
    </tbody>
  </table>
  <div class="p-2" id="tablesDiv">
    {#if currentStatus.lobby?.processed?.teamList?.playerTeams?.data}
      {#each Object.entries(currentStatus.lobby.processed.teamList.playerTeams.data) as [teamName, teamData]}
        <table class="table table-hover table-striped table-sm">
          <thead>
            <tr>
              <th>{teamName} Players</th>
              <th>ELO</th>
            </tr>
          </thead>
          <tbody>
            {#each teamData.slots as player}
              <tr>
                <td>{player}</td>
                <td>{currentStatus.lobby.processed.eloList[player] ?? "N/A"}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      {/each}
    {/if}

    <script
      src="https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/js/bootstrap.bundle.min.js"
      integrity="sha384-MrcW6ZMFYlzcLA8Nl+NtUVF0sA7MsXsP1UyJoMp4YLEuNSfAP+JcXn/tWtIaxVXM"
      crossorigin="anonymous">
    </script>
  </div>
</main>
