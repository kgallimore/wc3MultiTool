<script lang="ts">
  import type {
    AppSettings,
    SettingsKeys,
    WindowReceive,
    WindowSend,
  } from "../../tsrc/utility";
  import { MicroLobby } from "../../tsrc/microLobby";
  import CloseSlot from "./components/CloseSlot.svelte";
  import SettingsCheckbox from "./components/SettingsCheckbox.svelte";
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
      announceCustom: false,
      announceRestingInterval: 30,
      moveToSpec: false,
      rapidHostTimer: 0,
      smartHostTimeout: 0,
      voteStart: false,
      voteStartPercent: 60,
      closeSlots: [],
      customAnnouncement: "",
      observers: false,
      advancedMapOptions: false,
      flagLockTeams: true,
      flagPlaceTeamsTogether: true,
      flagFullSharedUnitControl: false,
      flagRandomRaces: false,
      flagRandomHero: false,
      settingVisibility: "0",
      leaveAlternate: false,
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
      wc3statsVariant: "",
      handleReplays: true,
    },
    discord: {
      type: "off",
      token: "",
      announceChannel: "",
      chatChannel: "",
      bidirectionalChat: true,
    },
    client: {
      restartOnUpdate: false,
      checkForUpdates: true,
    },
  };
  let currentStatus: {
    connected: boolean;
    menu: string;
    progress: { percent: number; step: string };
    lobby: MicroLobby | null;
    updater: string;
  } = {
    connected: false,
    menu: "Out of menus",
    progress: { percent: 0, step: "Waiting" },
    lobby: null,
    updater: "Up to date",
  };
  let wc3statsOptions = wc3EloModes(settings.elo.lookupName);
  let battleTag = "";
  let banReason = "";
  let lastAction = "";
  let structuredTeamData = currentStatus.lobby
    ? Object.entries(currentStatus.lobby.exportTeamStructure(false))
    : [];
  $: botAnnouncement = `Welcome. I am a bot. ${
    settings.elo.available && settings.elo.type !== "off"
      ? `I will fetch ELO from ${settings.elo.type}. ${
          settings.elo.balanceTeams ? "I will try to balance teams before we start." : ""
        }`
      : ""
  } ${
    ["smartHost", "rapidHost"].includes(settings.autoHost.type)
      ? "I will start when slots are full."
      : ""
  } ${settings.autoHost.voteStart ? " You can vote start with ?votestart" : ""}`;

  if (document.readyState !== "loading") {
    console.log("document is ready");
    init();
  } else {
    document.addEventListener("DOMContentLoaded", function () {
      console.log("document was not ready");
      init();
    });
  }

  async function wc3EloModes(lookupName: string): Promise<
    Array<{
      key: { mode: string; season: string; round: string; ladder: string };
    }>
  > {
    let stats = await fetch("https://api.wc3stats.com/maps/" + lookupName);
    let data = await stats.json();
    if (data.body.variants) {
      return data.body.variants[0].stats;
    }
    return [];
  }

  function init() {
    toMain({ messageType: "init" });

    // Make all urls open in external browser
    document.body.addEventListener("click", (event) => {
      if ((event.target as HTMLElement).tagName.toLowerCase() === "a") {
        event.preventDefault();
        //@ts-ignore
        window.api.shell((event.target as HTMLAnchorElement).href);
      }
    });
  }
  // @ts-ignore
  window.api.receive("fromMain", (data: WindowReceive) => {
    let newData = data.data;
    switch (data.messageType) {
      case "action":
        lastAction = newData.value;
        banReason = "";
        battleTag = "";
        break;
      case "updater":
        currentStatus.updater = newData.value;
        break;
      case "statusChange":
        currentStatus.connected = newData.connected;
        break;
      case "updateSettings":
        settings = newData.settings;
        wc3statsOptions = wc3EloModes(settings.elo.lookupName);
        break;
      case "updateSettingSingle":
        let update = newData.update;
        if (update) {
          // @ts-ignore
          settings[update.setting][update.key] = update.value;
          if (update.key === "lookupName") {
            wc3statsOptions = wc3EloModes(settings.elo.lookupName);
          }
        }
        break;
      case "lobbyUpdate":
        let lobbyData = newData.lobbyData;
        if (lobbyData.newLobby) {
          currentStatus.lobby = new MicroLobby(lobbyData.newLobby);
          structuredTeamData = Object.entries(
            currentStatus.lobby.exportTeamStructure(false)
          );
        } else if (lobbyData.playerPayload || lobbyData.playerData) {
          if (currentStatus.lobby) {
            currentStatus.lobby.ingestUpdate(lobbyData);
            structuredTeamData = Object.entries(
              currentStatus.lobby.exportTeamStructure(false)
            );
          }
        } else if (lobbyData.leftLobby) {
          currentStatus.lobby = null;
          structuredTeamData = [];
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
        currentStatus.menu = newData.value ?? "Out of Menus";
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
        alertDiv.innerHTML = `<strong>Error!</strong> ${data.data.error} <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>`;
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
      | boolean = false;
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
    }
    if (newValue) {
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
    if (settings[setting][key] !== value || key === "closeSlots") {
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
            <label for="clientForm"> Client Settings</label>
            <form id="clientForm" name="client" class="p-2">
              <div class="row border m-2">
                <div class="col p-2">
                  <SettingsCheckbox
                    frontFacingName="Restart on update"
                    setting="client"
                    key="restartOnUpdate"
                    checked={settings.client.restartOnUpdate}
                    on:change={(e) =>
                      // @ts-ignore
                      updateSettingSingle("client", "restartOnUpdate", e.target.checked)}
                  />
                  <SettingsCheckbox
                    frontFacingName="Check for updates"
                    setting="client"
                    key="checkForUpdates"
                    checked={settings.client.checkForUpdates}
                    on:change={(e) =>
                      // @ts-ignore
                      updateSettingSingle("client", "checkForUpdates", e.target.checked)}
                  />
                </div>
              </div>
            </form>
            <form name="elo" class="p-2">
              <div class="row">
                <div class="col">
                  <label for="eloLookup" class="form-label">
                    <details>
                      <summary>ELO Lookup (click to expand)</summary>
                      <strong>Handle Replay: </strong>Will automatically handle upload to
                      wc3stats.com at the end of each game.
                    </details></label
                  >
                  <select
                    id="eloLookup"
                    class="form-select"
                    data-key="type"
                    data-setting="elo"
                    value={settings.elo.type}
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
                <div id="eloSettings" class="row border p-2">
                  <div class="col">
                    <div class="d-flex justify-content-center">ELO Settings</div>
                    {#if settings.autoHost.type !== "off"}
                      <div class="d-flex justify-content-center">
                        {#if settings.elo.available}
                          <div class="badge bg-success">
                            <a
                              href="https://api.wc3stats.com/maps/{settings.elo
                                .lookupName}">ELO Available!</a
                            >
                          </div>
                        {:else}
                          <div class="badge bg-danger">
                            ELO not found! Reach out to me on discord
                          </div>
                        {/if}
                      </div>
                      {#if settings.elo.type === "wc3stats" && settings.elo.available}
                        <div class="d-flex justify-content-center">
                          <label for="wc3statsOptions">Wc3stats Variant</label>
                          <select
                            class="form-select"
                            id="wc3statsOptions"
                            value={settings.elo.wc3statsVariant}
                            on:change={(e) =>
                              updateSettingSingle(
                                "elo",
                                "wc3statsVariant",
                                // @ts-ignore
                                e.target.value
                              )}
                          >
                            {#await wc3statsOptions}
                              <option>Fetching options...</option>
                            {:then value}
                              <option
                                value=""
                                selected={"" === settings.elo.wc3statsVariant}
                                >Select a value</option
                              >
                              {#each value as option}
                                <option
                                  selected={JSON.stringify(option.key) ===
                                    settings.elo.wc3statsVariant}
                                  value={JSON.stringify(option.key)}
                                  >{option.key.ladder}, {option.key.mode}, {option.key
                                    .round}, {option.key.season}</option
                                >
                              {/each}
                            {/await}
                          </select>
                        </div>
                      {/if}
                    {/if}

                    <div
                      class="btn-group btn-group-sm"
                      style="flex-wrap: wrap;"
                      role="group"
                    >
                      <input
                        type="checkbox"
                        class="btn-check"
                        id="balanceTeamsCheck"
                        data-key="balanceTeams"
                        data-setting="elo"
                        checked={settings.elo.balanceTeams}
                        on:change={(e) =>
                          // @ts-ignore
                          updateSettingSingle("elo", "balanceTeams", e.target.checked)}
                      />
                      <label for="balanceTeamsCheck" class="btn btn-outline-primary"
                        >Balance Teams</label
                      >
                      <SettingsCheckbox
                        key="excludeHostFromSwap"
                        setting="elo"
                        frontFacingName="Don't swap host"
                        checked={settings.elo.excludeHostFromSwap}
                        on:change={(e) =>
                          updateSettingSingle(
                            "elo",
                            "excludeHostFromSwap",
                            // @ts-ignore
                            e.target.checked
                          )}
                      />
                      {#if settings.elo.type === "wc3stats"}
                        <SettingsCheckbox
                          key="handleReplays"
                          setting="elo"
                          frontFacingName="Handle Replays"
                          checked={settings.elo.handleReplays}
                          on:change={(e) =>
                            updateSettingSingle(
                              "elo",
                              "handleReplays",
                              // @ts-ignore
                              e.target.checked
                            )}
                        />
                      {/if}
                      <input
                        type="checkbox"
                        class="btn-check"
                        id="announceELOCheck"
                        data-key="announce"
                        data-setting="elo"
                        checked={settings.elo.announce}
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
                      <summary>Auto Host (click to expand)</summary><strong
                        >Lobby Host:</strong
                      >
                      Starts a lobby with specified settings.<br />
                      <strong>Rapid Host:</strong> Hosts lobbies, auto starts, leaves the
                      game after specified timer(minutes).<br />
                      <strong>Smart Host:</strong> Hosts lobbies, auto starts, quits the
                      game if this end screen pops up:
                      <img class="img-fluid" src="quitNormal.png" alt="Quit Normal" />
                      Intrusive Check will check the chat menu to see if anyone else is left.
                    </details>
                  </label>
                  <select
                    id="autoHostState"
                    class="form-select"
                    data-key="type"
                    data-setting="autoHost"
                    value={settings.autoHost.type}
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
                    <div class="col">
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
                          checked={settings.autoHost.private}
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
                        <SettingsCheckbox
                          key="increment"
                          setting="autoHost"
                          frontFacingName="Incremental Lobbies"
                          checked={settings.autoHost.increment}
                          on:change={(e) =>
                            updateSettingSingle(
                              "autoHost",
                              "increment",
                              // @ts-ignore
                              e.target.checked
                            )}
                        />
                        <SettingsCheckbox
                          frontFacingName="Sound Notifications"
                          key="sounds"
                          setting="autoHost"
                          checked={settings.autoHost.sounds}
                          on:change={(e) =>
                            updateSettingSingle(
                              "autoHost",
                              "sounds",
                              // @ts-ignore
                              e.target.checked
                            )}
                        />
                        <input
                          type="checkbox"
                          class="btn-check"
                          id="moveToSpecCheck"
                          data-key="moveToSpec"
                          data-setting="autoHost"
                          checked={settings.autoHost.moveToSpec}
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
                          id="enbaleObservers"
                          data-key="observers"
                          data-setting="autoHost"
                          checked={settings.autoHost.observers}
                          on:change={(e) =>
                            updateSettingSingle(
                              "autoHost",
                              "observers",
                              // @ts-ignore
                              e.target.checked
                            )}
                        />
                        <label for="enbaleObservers" class="btn btn-outline-primary"
                          >Create Observer Slots</label
                        >
                        <input
                          type="checkbox"
                          class="btn-check"
                          id="announceCustom"
                          data-key="announceCustom"
                          data-setting="autoHost"
                          checked={settings.autoHost.announceCustom}
                          on:change={(e) =>
                            updateSettingSingle(
                              "autoHost",
                              "announceCustom",
                              // @ts-ignore
                              e.target.checked
                            )}
                        />
                        <label for="announceCustom" class="btn btn-outline-primary"
                          >Custom Announcement</label
                        >
                        {#if ["rapidHost", "smartHost"].includes(settings.autoHost.type)}
                          <SettingsCheckbox
                            frontFacingName="Announce Is Bot"
                            key="announceIsBot"
                            setting="autoHost"
                            checked={settings.autoHost.announceIsBot}
                            on:change={(e) =>
                              updateSettingSingle(
                                "autoHost",
                                "announceIsBot",
                                // @ts-ignore
                                e.target.checked
                              )}
                          />
                          <SettingsCheckbox
                            frontFacingName="Vote start"
                            key="voteStart"
                            setting="autoHost"
                            checked={settings.autoHost.voteStart}
                            on:change={(e) =>
                              updateSettingSingle(
                                "autoHost",
                                "voteStart",
                                // @ts-ignore
                                e.target.checked
                              )}
                          />
                          {#if settings.autoHost.type === "smartHost"}
                            <SettingsCheckbox
                              frontFacingName="Intrusive check"
                              key="leaveAlternate"
                              setting="autoHost"
                              checked={settings.autoHost.leaveAlternate}
                              on:change={(e) =>
                                updateSettingSingle(
                                  "autoHost",
                                  "leaveAlternate",
                                  // @ts-ignore
                                  e.target.checked
                                )}
                            />
                          {/if}
                        {/if}
                        <SettingsCheckbox
                          setting="autoHost"
                          key="advancedMapOptions"
                          frontFacingName="Advanced Map Options"
                          checked={settings.autoHost.advancedMapOptions}
                          on:change={(e) =>
                            updateSettingSingle(
                              "autoHost",
                              "advancedMapOptions",
                              // @ts-ignore
                              e.target.checked
                            )}
                        />
                      </div>
                    </div>

                    {#if settings.autoHost.advancedMapOptions}
                      <div class="col">
                        <div
                          class="btn-group btn-group-sm"
                          style="flex-wrap: wrap;"
                          role="group"
                        >
                          <SettingsCheckbox
                            setting="autoHost"
                            key="flagLockTeams"
                            frontFacingName="Lock Teams"
                            checked={settings.autoHost.flagLockTeams}
                            on:change={(e) =>
                              updateSettingSingle(
                                "autoHost",
                                "flagLockTeams",
                                // @ts-ignore
                                e.target.checked
                              )}
                          />
                          <SettingsCheckbox
                            setting="autoHost"
                            key="flagFullSharedUnitControl"
                            frontFacingName="Full Shared Unit Control"
                            checked={settings.autoHost.flagFullSharedUnitControl}
                            on:change={(e) =>
                              updateSettingSingle(
                                "autoHost",
                                "flagFullSharedUnitControl",
                                // @ts-ignore
                                e.target.checked
                              )}
                          />
                          <SettingsCheckbox
                            setting="autoHost"
                            key="flagPlaceTeamsTogether"
                            frontFacingName="Place Teams Together"
                            checked={settings.autoHost.flagPlaceTeamsTogether}
                            on:change={(e) =>
                              updateSettingSingle(
                                "autoHost",
                                "flagPlaceTeamsTogether",
                                // @ts-ignore
                                e.target.checked
                              )}
                          />
                          <SettingsCheckbox
                            setting="autoHost"
                            key="flagRandomRaces"
                            frontFacingName="Random Races"
                            checked={settings.autoHost.flagRandomRaces}
                            on:change={(e) =>
                              updateSettingSingle(
                                "autoHost",
                                "flagRandomRaces",
                                // @ts-ignore
                                e.target.checked
                              )}
                          />
                        </div>
                        <label for="autoHostsettingVisibility">Visibility:</label>
                        <select
                          class="form-control form-control-sm"
                          id="autoHostsettingVisibility"
                          data-key="map"
                          data-setting="autoHost"
                          value={settings.autoHost.settingVisibility}
                          on:change={(e) =>
                            updateSettingSingle(
                              "autoHost",
                              "settingVisibility",
                              // @ts-ignore
                              e.target.value
                            )}
                        >
                          <option value="0">Default</option>
                          <option value="1">Hide Terrain</option>
                          <option value="2">Map Explored</option>
                          <option value="3">Always Visible</option>
                        </select>
                      </div>
                    {/if}
                  </div>
                  <div class="row p-2">
                    <div class="col">
                      <button
                        on:click={() => toMain({ messageType: "getMapPath" })}
                        type="button"
                        class="btn btn-primary"
                        id="autoHostMapPath"
                        >Current Map:
                      </button>
                      <span>{settings.autoHost.mapPath}</span>
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
                        value={settings.autoHost.gameName}
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
                            checked={settings.autoHost.closeSlots.includes(i + 12) ??
                              false}
                            on:change={(e) => {
                              updateSettingSingle(
                                "autoHost",
                                "closeSlots",
                                // @ts-ignore
                                e.target.checked,
                                i + 12
                              );
                            }}
                            number={(i + 13).toString()}
                          />
                        {/each}
                      </div>
                    </div>
                  </div>

                  <div class="row p-2">
                    {#if settings.autoHost.voteStart && ["rapidHost", "smartHost"].includes(settings.autoHost.type)}
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
                          value={settings.autoHost.voteStartPercent}
                          on:change={(e) =>
                            updateSettingSingle(
                              "autoHost",
                              "voteStartPercent",
                              // @ts-ignore
                              e.target.value
                            )}
                        />
                      </div>
                    {/if}
                    {#if settings.autoHost.type === "rapidHost"}
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
                          value={settings.autoHost.rapidHostTimer}
                          on:change={(e) =>
                            updateSettingSingle(
                              "autoHost",
                              "rapidHostTimer",
                              // @ts-ignore
                              e.target.value
                            )}
                        />
                      </div>
                    {/if}
                  </div>
                  {#if (settings.autoHost.announceIsBot && ["rapidHost", "smartHost"].includes(settings.autoHost.type)) || settings.autoHost.announceCustom}
                    <div class="row p-2">
                      <div class="col">
                        <h4>Bot Announcement:</h4>
                        {#if settings.autoHost.announceIsBot && ["rapidHost", "smartHost"].includes(settings.autoHost.type)}
                          <span>{botAnnouncement}</span>
                        {/if}
                        {#if settings.autoHost.announceCustom}
                          <p>{settings.autoHost.customAnnouncement}</p>
                        {/if}
                      </div>
                    </div>
                  {/if}
                  {#if settings.autoHost.announceCustom}
                    <div class="row p-2">
                      <div class="col">
                        <label for="customAnnouncement" class="form-label"
                          >Custom Announcement</label
                        >
                        <input
                          type="text"
                          id="customAnnouncement"
                          class="form-control"
                          data-key="customAnnouncement"
                          data-setting="autoHost"
                          maxlength="120"
                          placeholder="120 Character Max"
                          value={settings.autoHost.customAnnouncement}
                          on:change={(e) =>
                            updateSettingSingle(
                              "autoHost",
                              "customAnnouncement",
                              // @ts-ignore
                              e.target.value
                            )}
                        />
                      </div>
                    </div>
                  {/if}
                  {#if (settings.autoHost.announceIsBot && ["rapidHost", "smartHost"].includes(settings.autoHost.type)) || settings.autoHost.announceCustom}
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
                          value={settings.autoHost.announceRestingInterval}
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
                  {/if}
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
                    value={settings.obs.type}
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
                    value={settings.discord.type}
                    on:change={(e) =>
                      updateSettingSingle(
                        "discord",
                        "type", // @ts-ignore
                        e.target.value
                      )}
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
                          type="password"
                          class="form-control"
                          id="discordToken"
                          placeholder="Token"
                          data-key="token"
                          data-setting="discord"
                          value={settings.discord.token}
                          on:change={(e) =>
                            updateSettingSingle(
                              "discord",
                              "token", // @ts-ignore
                              e.target.value
                            )}
                        />
                      </div>
                    </div>
                    <div class="row">
                      <div class="col">
                        <label for="discordChannel">New Lobby Announce Channel</label>
                        <input
                          type="text"
                          class="form-control"
                          id="discordAnnounceChannel"
                          placeholder="Name or ID"
                          data-key="announceChannel"
                          data-setting="discord"
                          value={settings.discord.announceChannel}
                          on:change={(e) =>
                            updateSettingSingle(
                              "discord",
                              "announceChannel", // @ts-ignore
                              e.target.value
                            )}
                        />
                      </div>
                    </div>
                    <div class="row">
                      <div class="col">
                        <label for="discordChannel">Lobby Chat Channel</label>
                        <input
                          type="text"
                          class="form-control"
                          id="discordChatChannel"
                          placeholder="Name or ID"
                          data-key="chatChannel"
                          data-setting="discord"
                          value={settings.discord.chatChannel}
                          on:change={(e) =>
                            updateSettingSingle(
                              "discord",
                              "chatChannel", // @ts-ignore
                              e.target.value
                            )}
                        />
                      </div>
                    </div>
                  </div>
                  <div class="row">
                    <div class="col">
                      <div class="d-flex justify-content-center">
                        <SettingsCheckbox
                          setting="discord"
                          key="bidirectionalChat"
                          checked={settings.discord.bidirectionalChat}
                          on:change={(e) =>
                            updateSettingSingle(
                              "discord",
                              "bidirectionalChat",
                              // @ts-ignore
                              e.target.checked
                            )}
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
  <div class="container-lg">
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
    <div class="d-flex justify-content-center p-2">
      <span class="badge bg-primary" id="mainStatus">
        {currentStatus.updater}
      </span>
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
    <form class="border p-2">
      {#if lastAction}
        <div class="alert alert-warning alert-dismissible fade show" role="alert">
          {lastAction}<button
            type="button"
            class="btn-close"
            data-bs-dismiss="alert"
            aria-label="Close"
          />
        </div>
      {/if}
      <div class="row p-2">
        <div class="col">
          <input
            type="text"
            class="form-control"
            placeholder="BattleTag"
            pattern="^\D\S&#123;2,11}#\d&#123;4,8}$"
            bind:value={battleTag}
          />
        </div>
        <div class="col-6">
          <input
            type="text"
            class="form-control"
            placeholder="Ban Reason"
            bind:value={banReason}
          />
        </div>
      </div>
      <div class="row justify-content-center p-2">
        <div class="col d-flex justify-content-center">
          <div class="btn-group">
            <submit
              class="btn btn-danger"
              type="submit"
              on:click={() =>
                toMain({
                  messageType: "banPlayer",
                  ban: { player: battleTag, reason: banReason },
                })}
            >
              Ban
            </submit>
            <submit
              class="btn btn-success"
              type="submit"
              on:click={() =>
                toMain({
                  messageType: "unbanPlayer",
                  ban: { player: battleTag },
                })}
            >
              UnBan
            </submit>
          </div>
          <div class="btn-group">
            <submit
              class="btn btn-primary"
              type="submit"
              on:click={() =>
                toMain({
                  messageType: "changePerm",
                  perm: { player: battleTag, role: "moderator" },
                })}
            >
              Mod
            </submit>
            <submit
              class="btn btn-warning"
              type="submit"
              on:click={() =>
                toMain({
                  messageType: "changePerm",
                  perm: { player: battleTag, role: "admin" },
                })}
            >
              Admin
            </submit>
            <submit
              class="btn btn-danger"
              type="submit"
              on:click={() =>
                toMain({
                  messageType: "changePerm",
                  perm: { player: battleTag, role: "" },
                })}
            >
              Remove Perms
            </submit>
          </div>
        </div>
      </div>
      <div class="row justify-content-center p-2">
        <div class="col d-flex ">
          <details>
            <summary>Permissions</summary><strong>Mod: </strong>May ban and unban players.<br
            /> <strong>Admin:</strong> Mod + add/remove mods.
          </details>
        </div>
      </div>
    </form>

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
          {#if currentStatus.lobby}
            <td id="mapName">{currentStatus.lobby.lobbyStatic.mapData.mapName}</td>
            <td id="lobbyName">{currentStatus.lobby.lobbyStatic.lobbyName}</td>
            <td id="gameHost">{currentStatus.lobby.lobbyStatic.playerHost}</td>
            <td id="eloAvailable">{currentStatus.lobby.eloAvailable}</td>
          {:else}
            <td id="mapName" />
            <td id="lobbyName" />
            <td id="gameHost" />
            <td id="eloAvailable" />
          {/if}
        </tr>
      </tbody>
    </table>

    <div class="p-2" id="tablesDiv">
      {#if structuredTeamData}
        {#each structuredTeamData as [teamName, teamData]}
          <table class="table table-hover table-striped table-sm">
            <thead>
              <tr>
                <th>{teamName} Players</th>
                <th>ELO/Rank/Games/Wins/Losses</th>
              </tr>
            </thead>
            <tbody>
              {#each teamData as player}
                <tr>
                  <td>
                    {#if player.slotStatus === 2 && player.realPlayer}
                      <button
                        class="btn btn-danger"
                        on:click={() =>
                          toMain({
                            messageType: "banPlayer",
                            ban: { player: player.name, reason: banReason },
                          })}>Ban</button
                      >
                    {/if}{player.name}
                  </td>
                  <td
                    >{player.rating > -1
                      ? [
                          player.rating,
                          player.rank,
                          player.played,
                          player.wins,
                          player.losses,
                        ].join(" / ")
                      : "N/A"}</td
                  >
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
  </div>
</main>
