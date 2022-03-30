<script lang="ts">
  import {
    AppSettings,
    BanWhiteList,
    SettingsKeys,
    WindowReceive,
    WindowSend,
    isValidUrl,
  } from "../../tsrc/utility";
  import { onMount } from "svelte";
  import { getTargetRegion } from "../../tsrc/utility";
  import { MicroLobby, PlayerData } from "wc3mt-lobby-container";
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
      moveToTeam: "",
      rapidHostTimer: 0,
      smartHostTimeout: 0,
      voteStart: false,
      voteStartPercent: 60,
      voteStartTeamFill: true,
      closeSlots: [],
      customAnnouncement: "",
      observers: "0",
      advancedMapOptions: false,
      flagLockTeams: true,
      flagPlaceTeamsTogether: true,
      flagFullSharedUnitControl: false,
      flagRandomRaces: false,
      flagRandomHero: false,
      settingVisibility: "0",
      leaveAlternate: false,
      shufflePlayers: false,
      regionChange: false,
      regionChangeTimeEU: "11:00",
      regionChangeTimeNA: "01:00",
      whitelist: false,
      minPlayers: 0,
      delayStart: 0,
    },
    obs: {
      enabled: false,
      sceneSwitchType: "off",
      inGameHotkey: false,
      outOfGameHotkey: false,
      inGameWSScene: "",
      outOfGameWSScene: "",
      address: "",
      token: "",
      autoStream: false,
      textSource: false,
    },
    elo: {
      type: "off",
      balanceTeams: true,
      announce: true,
      excludeHostFromSwap: true,
      lookupName: "",
      privateKey: "",
      available: false,
      wc3StatsVariant: "",
      handleReplays: true,
      requireStats: false,
      minGames: 0,
      minWins: 0,
      minRank: 0,
      minRating: 0,
    },
    discord: {
      enabled: false,
      token: "",
      announceChannel: "",
      chatChannel: "",
      bidirectionalChat: false,
      sendInGameChat: false,
    },
    client: {
      restartOnUpdate: false,
      checkForUpdates: true,
      performanceMode: false,
      openWarcraftOnStart: false,
      startOnLogin: false,
      commAddress: "",
      language: "en",
      translateToLobby: false,
      antiCrash: true,
      alternateLaunch: false,
      bnetPassword: "",
      bnetUsername: "",
    },
    streaming: {
      enabled: false,
      seToken: "",
      sendTipsInGame: false,
      sendTipsInLobby: false,
      sendTipsInDiscord: false,
      minInGameTip: 1,
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
  let banList: {
    data: Array<
      BanWhiteList & {
        ban_date: string;
        unban_date: string;
      }
    >;
    page: number;
  } = { data: [], page: 0 };
  let whiteList: {
    data: Array<
      BanWhiteList & {
        white_date: string;
        unwhite_date: string;
      }
    >;
    page: number;
  } = { data: [], page: 0 };
  $: region = getTargetRegion(
    settings.autoHost.regionChangeTimeEU,
    settings.autoHost.regionChangeTimeNA
  );
  let utcTime =
    ("0" + new Date().getUTCHours().toString()).slice(-2) +
    ":" +
    ("0" + new Date().getUTCMinutes().toString()).slice(-2);
  setInterval(() => {
    utcTime =
      ("0" + new Date().getUTCHours().toString()).slice(-2) +
      ":" +
      ("0" + new Date().getUTCMinutes().toString()).slice(-2);
  }, 60000);

  let structuredTeamData: [
    string,
    {
      name: string;
      slotStatus: 0 | 2 | 1;
      slot: number;
      realPlayer: boolean;
      data: PlayerData;
    }[]
  ][] = [];
  $: botAnnouncement = `Welcome. I am a bot. ${
    settings.elo.available && settings.elo.type !== "off"
      ? `I will fetch ELO from ${settings.elo.type}. ${
          settings.elo.balanceTeams ? "I will try to balance teams before we start." : ""
        }`
      : ""
  }${
    (settings.elo.type === "off" || !settings.elo.balanceTeams) &&
    settings.autoHost.shufflePlayers
      ? "I will shuffle players before we start."
      : ""
  } ${
    ["smartHost", "rapidHost"].includes(settings.autoHost.type)
      ? "I will start when slots are full."
      : ""
  } ${settings.autoHost.voteStart ? " You can vote start with ?votestart" : ""}`;
  onMount(() => {
    if (document.readyState !== "loading") {
      console.log("document is ready");
      init();
    } else {
      document.addEventListener("DOMContentLoaded", function () {
        console.log("document was not ready");
        init();
      });
    }
  });

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

  function updatestructuredTeamData() {
    let exported = currentStatus.lobby.exportTeamStructure(false);
    if (exported) {
      structuredTeamData = Object.entries(exported);
    } else {
      structuredTeamData = [];
    }
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
          currentStatus.lobby = new MicroLobby({
            region: "us",
            fullData: lobbyData.newLobby,
          });
          updatestructuredTeamData();
        } else if (lobbyData.playerPayload || lobbyData.playerData) {
          if (currentStatus.lobby) {
            let updated = currentStatus.lobby.ingestUpdate(lobbyData).isUpdated;
            if (updated) updatestructuredTeamData();
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
        currentStatus.menu = newData.value ?? "OUT_OF_MENUS";
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
      case "banList":
        banList = { data: newData.banList, page: newData.page };
        break;
      case "whiteList":
        whiteList = { data: newData.whiteList, page: newData.page };
        break;
      default:
        console.log("Unknown:", data);
    }
  });
  function generateHotkeys(e: KeyboardEvent, key: string) {
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
      toMain({
        messageType: "updateSettingSingle",
        update: {
          setting: "obs",
          key: key as SettingsKeys,
          value: newValue,
        },
      });
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
        update: {
          setting: setting,
          key,
          value: value,
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
            <form id="clientForm" name="client" class="p-2 border">
              <div class="row m-2">
                <div class="col p-2">
                  <div
                    class="btn-group btn-group-sm"
                    style="flex-wrap: wrap;"
                    role="group"
                  >
                    <SettingsCheckbox
                      frontFacingName="Restart on update"
                      setting="client"
                      key="restartOnUpdate"
                      tooltip="Restart the client when a new version is downloaded and installed."
                      checked={settings.client.restartOnUpdate}
                      on:change={(e) =>
                        updateSettingSingle(
                          "client",
                          "restartOnUpdate",
                          // @ts-ignore
                          e.target.checked
                        )}
                    />
                    <SettingsCheckbox
                      frontFacingName="Check for updates"
                      setting="client"
                      key="checkForUpdates"
                      tooltip="Check for updates on startup and every 30 minutes."
                      checked={settings.client.checkForUpdates}
                      on:change={(e) =>
                        updateSettingSingle(
                          "client",
                          "checkForUpdates",
                          // @ts-ignore
                          e.target.checked
                        )}
                    />
                    <SettingsCheckbox
                      frontFacingName="Performance Mode(Beta)"
                      setting="client"
                      key="performanceMode"
                      tooltip="Enable this to strip out Warcraft 3's UI. Does not affect anything in game, mainly meant for low power systems running Rapid Host"
                      checked={settings.client.performanceMode}
                      on:change={(e) =>
                        // @ts-ignore
                        updateSettingSingle(
                          "client",
                          "performanceMode",
                          // @ts-ignore
                          e.target.checked
                        )}
                    />
                    <SettingsCheckbox
                      frontFacingName="Open warcraft on start"
                      setting="client"
                      key="openWarcraftOnStart"
                      tooltip="Open up Warcraft when WC3MT is opened"
                      checked={settings.client.openWarcraftOnStart}
                      on:change={(e) =>
                        // @ts-ignore
                        updateSettingSingle(
                          "client",
                          "openWarcraftOnStart",
                          // @ts-ignore
                          e.target.checked
                        )}
                    />
                    <SettingsCheckbox
                      frontFacingName="Start on Login"
                      setting="client"
                      key="startOnLogin"
                      tooltip="Open up WC3MT when you log in"
                      checked={settings.client.startOnLogin}
                      on:change={(e) =>
                        // @ts-ignore
                        updateSettingSingle(
                          "client",
                          "startOnLogin",
                          // @ts-ignore
                          e.target.checked
                        )}
                    />
                    <SettingsCheckbox
                      frontFacingName="Anti-Crash"
                      setting="client"
                      key="antiCrash"
                      tooltip="Restart Warcraft on crash."
                      checked={settings.client.antiCrash}
                      on:change={(e) =>
                        // @ts-ignore
                        updateSettingSingle(
                          "client",
                          "antiCrash",
                          // @ts-ignore
                          e.target.checked
                        )}
                    />
                    <SettingsCheckbox
                      frontFacingName="Alternate Launch"
                      setting="client"
                      key="alternateLaunch"
                      tooltip="Launches Warcraft directly without OCR"
                      checked={settings.client.alternateLaunch}
                      on:change={(e) => {
                        // @ts-ignore
                        if (!e.target.checked) {
                          updateSettingSingle("client", "bnetUsername", "");
                          updateSettingSingle("client", "bnetPassword", "");
                        }
                        // @ts-ignore
                        updateSettingSingle(
                          "client",
                          "alternateLaunch",
                          // @ts-ignore
                          e.target.checked
                        );
                      }}
                    />
                  </div>
                </div>
              </div>
              <div class="row">
                <div class="col">
                  <label for="commAddress">Comm Address (For Adv Users)</label>
                  <input
                    type="url"
                    class="form-control"
                    id="commAddress"
                    placeholder="WebSocket Address"
                    value={settings.client.commAddress}
                    on:change={(e) => {
                      // @ts-ignore
                      let value = e.target.value;
                      if (isValidUrl(value) || value === "") {
                        updateSettingSingle(
                          "client",
                          "commAddress", // @ts-ignore
                          value
                        );
                      } else {
                        alert("Invalid Comm URL");
                      }
                    }}
                  />
                </div>
              </div>
              <div class="row">
                <div class="col">
                  <label for="targetLanguage">Translate Target Language </label>
                  <input
                    type="text"
                    class="form-control"
                    id="targetLanguage"
                    placeholder="2 letter ISO code (Blank for none)"
                    value={settings.client.language}
                    maxlength="2"
                    on:change={(e) =>
                      updateSettingSingle(
                        "client",
                        "language", // @ts-ignore
                        e.target.value
                      )}
                  />
                </div>
                {#if settings.client.language}
                  <div class="col text-center m-auto">
                    <SettingsCheckbox
                      frontFacingName="Send to lobby"
                      setting="client"
                      key="translateToLobby"
                      tooltip="Send translated messages back to the lobby."
                      checked={settings.client.translateToLobby}
                      on:change={(e) =>
                        // @ts-ignore
                        updateSettingSingle(
                          "client",
                          "translateToLobby",
                          // @ts-ignore
                          e.target.checked
                        )}
                    />
                  </div>
                {/if}
              </div>
              {#if settings.client.alternateLaunch}
                <div class="border border-dashed p-1 m-1">
                  <div class="row">
                    <div class="col text-center m-auto text-warning">
                      Please don't actually use this. Your information is stored
                      insecurely, and malicious actors may steal this data. Would you
                      trust me with your password?
                    </div>
                  </div>
                  <div class="row">
                    <div class="col">
                      <label for="bnetUsername">Battle.net Username</label>
                      <input
                        type="text"
                        class="form-control"
                        id="bnetUsername"
                        placeholder="BNet Username"
                        value={settings.client.bnetUsername}
                        maxlength="35"
                        on:change={(e) =>
                          updateSettingSingle(
                            "client",
                            "bnetUsername", // @ts-ignore
                            e.target.value
                          )}
                      />
                    </div>
                    <div class="col">
                      <label for="bnetPassword">Battle.net Password</label>
                      <input
                        type="password"
                        class="form-control"
                        id="bnetPassword"
                        placeholder="BNet Password"
                        value={settings.client.bnetPassword}
                        maxlength="35"
                        on:change={(e) =>
                          updateSettingSingle(
                            "client",
                            "bnetPassword", // @ts-ignore
                            e.target.value
                          )}
                      />
                    </div>
                  </div>
                </div>
              {/if}
            </form>
            <form name="elo" class="p-2">
              <div class="row">
                <div class="col">
                  <label for="eloLookup" class="form-label"> ELO Lookup</label>
                  <select
                    id="eloLookup"
                    class="form-select"
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
                <div id="eloSettings" class="border p-2">
                  <div class="row">
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
                              value={settings.elo.wc3StatsVariant}
                              on:change={(e) =>
                                updateSettingSingle(
                                  "elo",
                                  "wc3StatsVariant",
                                  // @ts-ignore
                                  e.target.value
                                )}
                            >
                              {#await wc3statsOptions}
                                <option>Fetching options...</option>
                              {:then value}
                                <option
                                  value=""
                                  selected={"" === settings.elo.wc3StatsVariant}
                                  >Select a value</option
                                >
                                {#each value as option}
                                  <option
                                    selected={JSON.stringify(option.key) ===
                                      settings.elo.wc3StatsVariant}
                                    value={JSON.stringify(option.key)}
                                    >{option.key.ladder}, {option.key.mode}, {option.key
                                      .round}, {option.key.season}</option
                                  >
                                {/each}
                              {/await}
                            </select>
                          </div>
                          {#if settings.elo.handleReplays}
                            <div class="row">
                              <div class="col">
                                <label for="eloPrivateKey">Private Key</label>
                                <input
                                  type="text"
                                  class="form-control"
                                  id="eloPrivateKey"
                                  placeholder="Optional"
                                  value={settings.elo.privateKey}
                                  on:change={(e) =>
                                    updateSettingSingle(
                                      "elo",
                                      "privateKey", // @ts-ignore
                                      e.target.value
                                    )}
                                />
                              </div>
                            </div>
                          {/if}
                        {/if}
                      {/if}

                      <div
                        class="btn-group btn-group-sm"
                        style="flex-wrap: wrap;"
                        role="group"
                      >
                        <SettingsCheckbox
                          key="balanceTeams"
                          setting="elo"
                          frontFacingName="Balance teams"
                          checked={settings.elo.balanceTeams}
                          tooltip="Balance teams based off ELO. Only tested with 2 teams."
                          on:change={(e) =>
                            updateSettingSingle(
                              "elo",
                              "balanceTeams",
                              // @ts-ignore
                              e.target.checked
                            )}
                        />
                        <SettingsCheckbox
                          key="excludeHostFromSwap"
                          setting="elo"
                          frontFacingName="Don't swap host"
                          checked={settings.elo.excludeHostFromSwap}
                          tooltip="Will not swap the local user during auto balancing."
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
                            tooltip="Automatically handle upload to wc3stats.com at the end of each game."
                            on:change={(e) =>
                              updateSettingSingle(
                                "elo",
                                "handleReplays",
                                // @ts-ignore
                                e.target.checked
                              )}
                          />
                        {/if}
                        <SettingsCheckbox
                          key="announce"
                          setting="elo"
                          frontFacingName="Announce Stats"
                          checked={settings.elo.announce}
                          tooltip="Announce stats to the lobby."
                          on:change={(e) =>
                            updateSettingSingle(
                              "elo",
                              "announce",
                              // @ts-ignore
                              e.target.checked
                            )}
                        />
                        <SettingsCheckbox
                          key="requireStats"
                          setting="elo"
                          frontFacingName="Require Stats"
                          checked={settings.elo.requireStats}
                          tooltip="Will require minimum stats of games/wins/rank/rating in order to join the lobby."
                          on:change={(e) =>
                            updateSettingSingle(
                              "elo",
                              "requireStats",
                              // @ts-ignore
                              e.target.checked
                            )}
                        />
                      </div>
                    </div>
                  </div>
                  {#if settings.elo.requireStats}
                    <div class="row">
                      <div class="col">
                        <label for="minRank">Min Rank</label>
                        <input
                          type="number"
                          class="form-control"
                          id="minRank"
                          placeholder="0 for none"
                          value={settings.elo.minRank}
                          on:change={(e) =>
                            updateSettingSingle(
                              "elo",
                              "minRank", // @ts-ignore
                              parseInt(e.target.value)
                            )}
                        />
                      </div>
                      <div class="col">
                        <label for="minGames">Min Games</label>
                        <input
                          type="number"
                          class="form-control"
                          id="minGames"
                          placeholder="Minimum Games Played"
                          value={settings.elo.minGames}
                          on:change={(e) =>
                            updateSettingSingle(
                              "elo",
                              "minGames", // @ts-ignore
                              parseInt(e.target.value)
                            )}
                        />
                      </div>
                      <div class="col">
                        <label for="minWins">Min Wins</label>
                        <input
                          type="number"
                          class="form-control"
                          id="minWins"
                          placeholder="Minimum Wins"
                          value={settings.elo.minWins}
                          on:change={(e) =>
                            updateSettingSingle(
                              "elo",
                              "minWins", // @ts-ignore
                              parseInt(e.target.value)
                            )}
                        />
                      </div>
                      <div class="col">
                        <label for="minRating">Min Rating</label>
                        <input
                          type="number"
                          class="form-control"
                          id="minRating"
                          placeholder="Minimum Rating"
                          value={settings.elo.minRating}
                          on:change={(e) =>
                            updateSettingSingle(
                              "elo",
                              "minRating", // @ts-ignore
                              parseInt(e.target.value)
                            )}
                        />
                      </div>
                    </div>
                  {/if}
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
                      game after specified timer(minutes). (-1 will force quit at loading
                      screen)<br />
                      <strong>Smart Host:</strong> Hosts lobbies, auto starts, quits the
                      game if you use the wc3mt lib (see discord), with a fallback to
                      attempting to see if this screen opens(OCR, unreliable):
                      <img class="img-fluid" src="quitNormal.png" alt="Quit Normal" />
                      Intrusive Check will check the chat menu to see if anyone else is left.
                    </details>
                  </label>
                  <select
                    id="autoHostState"
                    class="form-select"
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
                    <option value="lobbyHost">Lobby Host: Host but don't autostart</option
                    >
                    <option value="rapidHost">Rapid Host: Leave after time</option>
                    <option value="smartHost"
                      >Smart Host: Use OCR to detect game end</option
                    >
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
                        <SettingsCheckbox
                          key="private"
                          setting="autoHost"
                          frontFacingName="Private Lobbies"
                          checked={settings.autoHost.private}
                          tooltip="Will host private lobbies."
                          on:change={(e) =>
                            updateSettingSingle(
                              "autoHost",
                              "private",
                              // @ts-ignore
                              e.target.checked
                            )}
                        />
                        <SettingsCheckbox
                          key="increment"
                          setting="autoHost"
                          frontFacingName="Incremental Lobbies"
                          checked={settings.autoHost.increment}
                          tooltip="Will append the current game number to end of the lobby name."
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
                          tooltip="Will play sounds when a game is full, when a game loads in, and when a game ends."
                          on:change={(e) =>
                            updateSettingSingle(
                              "autoHost",
                              "sounds",
                              // @ts-ignore
                              e.target.checked
                            )}
                        />
                        <SettingsCheckbox
                          frontFacingName="Move to Spec/Host/Team"
                          key="moveToSpec"
                          setting="autoHost"
                          checked={settings.autoHost.moveToSpec}
                          tooltip="Will move the local user to a spectator slot upon joining the lobby."
                          on:change={(e) =>
                            updateSettingSingle(
                              "autoHost",
                              "moveToSpec",
                              // @ts-ignore
                              e.target.checked
                            )}
                        />
                        <SettingsCheckbox
                          frontFacingName="Custom Announcement"
                          key="announceCustom"
                          setting="autoHost"
                          checked={settings.autoHost.announceCustom}
                          tooltip="Will announce custom text to the lobby."
                          on:change={(e) =>
                            updateSettingSingle(
                              "autoHost",
                              "announceCustom",
                              // @ts-ignore
                              e.target.checked
                            )}
                        />
                        {#if ["rapidHost", "smartHost"].includes(settings.autoHost.type)}
                          <SettingsCheckbox
                            frontFacingName="Announce Is Bot"
                            key="announceIsBot"
                            setting="autoHost"
                            checked={settings.autoHost.announceIsBot}
                            tooltip="Will announce if the local user is a bot. You can check the message below."
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
                            tooltip="Will allow users to vote to start the game."
                            on:change={(e) =>
                              updateSettingSingle(
                                "autoHost",
                                "voteStart",
                                // @ts-ignore
                                e.target.checked
                              )}
                          />
                          {#if settings.elo.type === "off" || !settings.elo.balanceTeams}
                            <SettingsCheckbox
                              frontFacingName="Shuffle Players"
                              key="shufflePlayers"
                              setting="autoHost"
                              checked={settings.autoHost.shufflePlayers}
                              tooltip="Shuffles players randomly before starting."
                              on:change={(e) =>
                                updateSettingSingle(
                                  "autoHost",
                                  "shufflePlayers",
                                  // @ts-ignore
                                  e.target.checked
                                )}
                            />
                          {/if}
                          {#if settings.autoHost.voteStart}
                            <SettingsCheckbox
                              frontFacingName="Require All Teams for Votestart"
                              key="voteStartTeamFill"
                              setting="autoHost"
                              checked={settings.autoHost.voteStartTeamFill}
                              tooltip="Will require all teams to have at least 1 player before players can vote start."
                              on:change={(e) =>
                                updateSettingSingle(
                                  "autoHost",
                                  "voteStartTeamFill",
                                  // @ts-ignore
                                  e.target.checked
                                )}
                            />
                          {/if}
                          {#if settings.autoHost.type === "smartHost" && settings.autoHost.moveToSpec && settings.autoHost.observers}
                            <SettingsCheckbox
                              frontFacingName="Intrusive check"
                              key="leaveAlternate"
                              setting="autoHost"
                              checked={settings.autoHost.leaveAlternate}
                              tooltip="Queries the chat menu periodically in game in order to attempt to see if there are any other players left in lobby. Note: this still will not gaurantee that it games will be left successfully due to a minor WC3 bug."
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
                          tooltip="Will show advanced map options."
                          on:change={(e) =>
                            updateSettingSingle(
                              "autoHost",
                              "advancedMapOptions",
                              // @ts-ignore
                              e.target.checked
                            )}
                        />
                        {#if !settings.client.alternateLaunch}
                          <SettingsCheckbox
                            key="regionChange"
                            setting="autoHost"
                            frontFacingName="Auto Change Regions"
                            checked={settings.autoHost.regionChange}
                            tooltip="Will automatically change regions at the specified time."
                            on:change={(e) =>
                              updateSettingSingle(
                                "autoHost",
                                "regionChange",
                                // @ts-ignore
                                e.target.checked
                              )}
                          />
                        {/if}
                        <SettingsCheckbox
                          key="whitelist"
                          setting="autoHost"
                          frontFacingName="Whitelist"
                          checked={settings.autoHost.whitelist}
                          tooltip="Only allow certain players to join."
                          on:change={(e) =>
                            updateSettingSingle(
                              "autoHost",
                              "whitelist",
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
                          <label for="observerType">Add observers:</label>
                          <select
                            class="form-control form-control-sm"
                            id="observerType"
                            value={settings.autoHost.observers}
                            on:change={(e) =>
                              updateSettingSingle(
                                "autoHost",
                                "observers",
                                // @ts-ignore
                                e.target.value
                              )}
                          >
                            <option value="0">None</option>
                            <option value="1">Obs on defeat</option>
                            <option value="2">Referees(Recommended)</option>
                            <option value="3">Observers</option>
                          </select>
                        </div>
                        <label for="autoHostsettingVisibility">Visibility:</label>
                        <select
                          class="form-control form-control-sm"
                          id="autoHostsettingVisibility"
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
                      <label for="delayStart">Delay Start</label>
                      <input
                        type="number"
                        class="form-control"
                        id="delayStart"
                        placeholder="Seconds to delay"
                        min="0"
                        max="30"
                        value={settings.autoHost.delayStart}
                        on:change={(e) =>
                          updateSettingSingle(
                            "autoHost",
                            "delayStart", // @ts-ignore
                            parseInt(e.target.value)
                          )}
                      />
                    </div>
                    {#if ["rapidHost", "smartHost"].includes(settings.autoHost.type)}
                      <div class="col">
                        <label for="minPlayers">Minimum Players to Start</label>
                        <input
                          type="number"
                          class="form-control"
                          id="minPlayers"
                          placeholder="0 to disable"
                          min="0"
                          max="24"
                          value={settings.autoHost.minPlayers}
                          on:change={(e) =>
                            updateSettingSingle(
                              "autoHost",
                              "minPlayers", // @ts-ignore
                              parseInt(e.target.value)
                            )}
                        />
                      </div>
                    {/if}
                  </div>
                  {#if settings.autoHost.moveToSpec}
                    <div class="row p-2">
                      <div class="col">
                        <label for="autoHostGameName" class="form-label"
                          >Target Team Name (Blank for Auto)</label
                        >
                        <input
                          type="text"
                          class="form-control"
                          id="moveToTeam"
                          placeholder="Team Name to Move to"
                          value={settings.autoHost.moveToTeam}
                          on:keydown={(e) => {
                            if (e.key === "Enter") {
                              updateSettingSingle(
                                "autoHost",
                                "moveToTeam",
                                // @ts-ignore
                                e.target.value
                              );
                            }
                          }}
                          on:change={(e) =>
                            updateSettingSingle(
                              "autoHost",
                              "moveToTeam",
                              // @ts-ignore
                              e.target.value
                            )}
                        />
                      </div>
                    </div>
                  {/if}
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
                          min="5"
                          max="100"
                          value={settings.autoHost.voteStartPercent}
                          on:change={(e) =>
                            updateSettingSingle(
                              "autoHost",
                              "voteStartPercent",
                              // @ts-ignore
                              Math.min(Math.max(parseInt(e.target.value), 5), 100)
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
                          min="-1"
                          max="360"
                          value={settings.autoHost.rapidHostTimer}
                          on:change={(e) =>
                            updateSettingSingle(
                              "autoHost",
                              "rapidHostTimer",
                              // @ts-ignore
                              Math.min(Math.max(parseInt(e.target.value), -1), 360)
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
                          min="0"
                          max="600"
                          value={settings.autoHost.announceRestingInterval}
                          on:change={(e) =>
                            updateSettingSingle(
                              "autoHost",
                              "announceRestingInterval",
                              // @ts-ignore
                              parseInt(e.target.value)
                            )}
                        />
                      </div>
                    </div>
                  {/if}
                  {#if settings.autoHost.regionChange && !settings.client.alternateLaunch}
                    <div class="row p-2">
                      <div class="col flex text-center">
                        Current UTC time is: {utcTime}
                        Target: {region}
                      </div>
                    </div>
                    <div class="row p-2">
                      <div class="col">
                        <label for="regionChangeTimeNA" class="form-label"
                          >UTC time to swap to NA</label
                        >
                        <input
                          type="time"
                          id="regionChangeTimeNA"
                          class="form-control"
                          value={settings.autoHost.regionChangeTimeNA}
                          on:change={(e) =>
                            updateSettingSingle(
                              "autoHost",
                              "regionChangeTimeNA",
                              // @ts-ignore
                              e.target.value
                            )}
                        />
                      </div>
                      <div class="col">
                        <label for="regionChangeTimeEU" class="form-label"
                          >UTC time to swap to EU</label
                        >
                        <input
                          type="time"
                          id="regionChangeTimeEU"
                          class="form-control"
                          value={settings.autoHost.regionChangeTimeEU}
                          on:change={(e) =>
                            updateSettingSingle(
                              "autoHost",
                              "regionChangeTimeEU",
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

            <form name="discord" class="p-2">
              <div class="row">
                <div class="col">
                  <div class="d-flex justify-content-center">
                    <SettingsCheckbox
                      setting="discord"
                      key="enabled"
                      frontFacingName="Discord Integration"
                      checked={settings.discord.enabled}
                      on:change={(e) =>
                        updateSettingSingle(
                          "discord",
                          "enabled",
                          // @ts-ignore
                          e.target.checked
                        )}
                    />
                  </div>
                </div>
              </div>
              {#if settings.discord.enabled}
                <div class="border m-2 p-2">
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
                        <div class="btn-group btn-group-sm w-100 py-1" role="group">
                          <SettingsCheckbox
                            frontFacingName="Bidirectional Chat"
                            setting="discord"
                            key="bidirectionalChat"
                            checked={settings.discord.bidirectionalChat}
                            tooltip="Users may send messages to the to the lobby from the Discord channel."
                            on:change={(e) =>
                              updateSettingSingle(
                                "discord",
                                "bidirectionalChat",
                                // @ts-ignore
                                e.target.checked
                              )}
                          />
                          {#if settings.discord.bidirectionalChat && (settings.autoHost.type !== "smartHost" || settings.autoHost.leaveAlternate === false)}
                            <SettingsCheckbox
                              frontFacingName="Send Chat in Game"
                              setting="discord"
                              key="sendInGameChat"
                              checked={settings.discord.sendInGameChat}
                              tooltip="Users may send messages during game from the Discord channel. Not recommended."
                              on:change={(e) =>
                                updateSettingSingle(
                                  "discord",
                                  "sendInGameChat",
                                  // @ts-ignore
                                  e.target.checked
                                )}
                            />
                          {/if}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              {/if}
            </form>
            <form name="obs" class="p-2">
              <div class="row">
                <div class="col">
                  <div class="d-flex justify-content-center">
                    <SettingsCheckbox
                      setting="obs"
                      key="enabled"
                      frontFacingName="OBS Integration"
                      checked={settings.obs.enabled}
                      on:change={(e) =>
                        updateSettingSingle(
                          "obs",
                          "enabled",
                          // @ts-ignore
                          e.target.checked
                        )}
                    />
                  </div>
                </div>
              </div>
              {#if settings.obs.enabled}
                <div class="border m-2 p-2">
                  <div class="row">
                    <div class="col">
                      <div class="btn-group btn-group-sm w-100 py-1" role="group">
                        {#if settings.autoHost.type !== "smartHost" || settings.autoHost.leaveAlternate === false}
                          <SettingsCheckbox
                            setting="obs"
                            key="autoStream"
                            frontFacingName="Auto Stream (Beta)"
                            checked={settings.obs.autoStream}
                            tooltip="Periodically hit spacebar to jump to POIs"
                            on:change={(e) =>
                              updateSettingSingle(
                                "obs",
                                "autoStream",
                                // @ts-ignore
                                e.target.checked
                              )}
                          />
                        {/if}
                        <SettingsCheckbox
                          setting="obs"
                          key="textSource"
                          frontFacingName="Text Source"
                          checked={settings.obs.textSource}
                          tooltip="Create a text source in the Documents folder that contains all lobby players and their stats."
                          on:change={(e) =>
                            updateSettingSingle(
                              "obs",
                              "textSource",
                              // @ts-ignore
                              e.target.checked
                            )}
                        />
                      </div>
                    </div>
                    <div class="row">
                      <div class="col">
                        <strong>Auto Stream:</strong> Presses SpaceBar in slightly
                        randomized intervals to jump to POIs. Incompatible with intrusive
                        check.<br /><strong>Text source:</strong> Outputs loby data to Documents/wc3mt.txt.
                      </div>
                    </div>
                  </div>
                  <div class="row">
                    <div class="col">
                      <label for="obsSelect" class="form-label">Scene Switch Type</label>
                      <select
                        id="obsSelect"
                        class="form-select"
                        value={settings.obs.sceneSwitchType}
                        on:change={(e) =>
                          updateSettingSingle(
                            "obs",
                            "sceneSwitchType", // @ts-ignore
                            e.target.value
                          )}
                      >
                        <option value="off" selected>Disabled</option>
                        <option value="hotkeys">Simulate Hotkeys</option>
                        <option value="websockets">OBS Websockets(Recommended)</option>
                      </select>
                    </div>
                  </div>
                  {#if settings.obs.sceneSwitchType === "hotkeys"}
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
                            on:keydown={(event) => generateHotkeys(event, "inGameHotkey")}
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
                            on:keydown={(e) => generateHotkeys(e, "outOfGameHotkey")}
                            value={settings.obs.outOfGameHotkey
                              ? (settings.obs.outOfGameHotkey.shiftKey
                                  ? "Shift + "
                                  : "") +
                                (settings.obs.outOfGameHotkey.ctrlKey ? "Ctrl + " : "") +
                                (settings.obs.outOfGameHotkey.altKey ? "Alt + " : "") +
                                settings.obs.outOfGameHotkey.key
                              : ""}
                          />
                        </div>
                      </div>
                    </div>
                  {:else if settings.obs.sceneSwitchType === "websockets"}
                    <div class="border m-2">
                      <div class="row">
                        <div class="col">
                          <label for="obsAddress">OBS Address(Blank for unchanged)</label>
                          <input
                            type="text"
                            class="form-control"
                            id="obsAddress"
                            placeholder="ip:port"
                            value={settings.obs.address}
                            on:change={(e) =>
                              updateSettingSingle(
                                "obs",
                                "address",
                                // @ts-ignore
                                e.target.value
                              )}
                          />
                        </div>
                      </div>
                      <div class="row">
                        <div class="col">
                          <label for="obsPassword">OBS Password(Optional)</label>
                          <input
                            type="password"
                            class="form-control"
                            id="obsPassword"
                            placeholder="Password"
                            value={settings.obs.token}
                            on:change={(e) =>
                              updateSettingSingle(
                                "obs",
                                "token",
                                // @ts-ignore
                                e.target.value
                              )}
                          />
                        </div>
                      </div>
                      <div class="row">
                        <div class="col">
                          <label for="inGameWSScene">In Game Scene Name</label>
                          <input
                            type="text"
                            class="form-control"
                            id="inGameWSScene"
                            placeholder="In Game Scene Name"
                            value={settings.obs.inGameWSScene}
                            on:change={(e) =>
                              updateSettingSingle(
                                "obs",
                                "inGameWSScene",
                                // @ts-ignore
                                e.target.value
                              )}
                          />
                        </div>
                      </div>
                      <div class="row">
                        <div class="col">
                          <label for="outOfGameWSScene">Out of Game Scene Name</label>
                          <input
                            type="text"
                            class="form-control"
                            id="outOfGameWSScene"
                            placeholder="Out of Game Scene Name"
                            value={settings.obs.outOfGameWSScene}
                            on:change={(e) =>
                              updateSettingSingle(
                                "obs",
                                "outOfGameWSScene",
                                // @ts-ignore
                                e.target.value
                              )}
                          />
                        </div>
                      </div>
                    </div>
                  {/if}
                </div>
              {/if}
            </form>
            <form name="discord" class="p-2">
              <div class="row">
                <div class="col">
                  <div class="d-flex justify-content-center">
                    <SettingsCheckbox
                      setting="streaming"
                      key="enabled"
                      frontFacingName="Streaming Integration (Pre-Alpha)"
                      checked={settings.streaming.enabled}
                      on:change={(e) =>
                        updateSettingSingle(
                          "streaming",
                          "enabled",
                          // @ts-ignore
                          e.target.checked
                        )}
                    />
                  </div>
                </div>
              </div>
              {#if settings.streaming.enabled}
                <div class="border m-2 p-2">
                  <div class="row">
                    <div class="col">
                      <label for="seToken">Steam Elements Token</label>
                      <input
                        type="password"
                        class="form-control"
                        id="seToken"
                        placeholder="Stream Elements JWT Token"
                        value={settings.streaming.seToken}
                        on:change={(e) =>
                          updateSettingSingle(
                            "streaming",
                            "seToken",
                            // @ts-ignore
                            e.target.value
                          )}
                      />
                    </div>
                  </div>
                  <div class="row">
                    <div class="col">
                      <div class="btn-group btn-group-sm w-100 py-1" role="group">
                        <SettingsCheckbox
                          setting="streaming"
                          key="sendDonationsInGame"
                          frontFacingName="Send Tips in Game"
                          checked={settings.streaming.sendTipsInGame}
                          tooltip="Send tips in game. Not recommended."
                          on:change={(e) =>
                            updateSettingSingle(
                              "streaming",
                              "sendTipsInGame",
                              // @ts-ignore
                              e.target.checked
                            )}
                        />
                        <SettingsCheckbox
                          setting="streaming"
                          key="sendTipsInLobby"
                          frontFacingName="Send Tips in Lobby"
                          checked={settings.streaming.sendTipsInLobby}
                          tooltip="Send tips in lobby."
                          on:change={(e) =>
                            updateSettingSingle(
                              "streaming",
                              "sendTipsInLobby",
                              // @ts-ignore
                              e.target.checked
                            )}
                        />
                        <SettingsCheckbox
                          setting="streaming"
                          key="sendTipsInDiscord"
                          frontFacingName="Send Tips in Discord"
                          checked={settings.streaming.sendTipsInDiscord}
                          tooltip="Send tips in Discord."
                          on:change={(e) =>
                            updateSettingSingle(
                              "streaming",
                              "sendTipsInDiscord",
                              // @ts-ignore
                              e.target.checked
                            )}
                        />
                      </div>
                    </div>
                  </div>
                  <div class="row">
                    <div class="col">
                      {#if settings.streaming.sendTipsInGame || settings.streaming.sendTipsInLobby || settings.streaming.sendTipsInDiscord}
                        <label for="minInGameTip" class="form-label"
                          >Min for Tip Announce</label
                        >
                        <input
                          type="number"
                          id="minInGameTip"
                          class="form-control"
                          min="1"
                          value={settings.streaming.minInGameTip}
                          on:change={(e) =>
                            updateSettingSingle(
                              "streaming",
                              "minInGameTip",
                              // @ts-ignore
                              parseInt(e.target.value)
                            )}
                        />
                      {/if}
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
  <div class="modal fade" id="banListModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-lg">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">BanList</h5>
          <button
            type="button"
            class="btn-close"
            data-bs-dismiss="modal"
            aria-label="Close"
          />
        </div>
        <div class="modal-body">
          <div class="w-full text-center">
            <button
              class="btn btn-primary"
              disabled={banList.page === 0}
              on:click={() => {
                toMain({
                  messageType: "fetchBanList",
                  page: banList.page - 1,
                });
              }}
            >
              Previous Page
            </button>
            Page: {banList.page}
            <button
              class="btn btn-primary"
              disabled={banList.data.length !== 10}
              on:click={() => {
                toMain({
                  messageType: "fetchBanList",
                  page: banList.page + 1,
                });
              }}
            >
              Next Page
            </button>
          </div>
          <table class="table table-sm table-striped table-hover">
            <tr>
              <th>Username</th>
              <th>Date Added</th>
              <th>Admin</th>
              <th>Reason</th>
              <th>Removal</th>
            </tr>
            <tbody>
              {#each banList.data as player}
                <tr>
                  <td>{player.username}</td>
                  <td>{player.ban_date}</td>
                  <td>{player.admin}</td>
                  <td>{player.reason}</td>
                  <td>{player.unban_date}</td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
  <div class="modal fade" id="whiteListModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-lg">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">WhiteList</h5>
          <button
            type="button"
            class="btn-close"
            data-bs-dismiss="modal"
            aria-label="Close"
          />
        </div>
        <div class="modal-body">
          <div class="w-full text-center">
            <button
              class="btn btn-primary"
              disabled={whiteList.page === 0}
              on:click={() => {
                toMain({
                  messageType: "fetchWhiteList",
                  page: whiteList.page - 1,
                });
              }}
            >
              Previous Page
            </button>
            Page: {whiteList.page}
            <button
              class="btn btn-primary"
              disabled={whiteList.data.length !== 10}
              on:click={() => {
                toMain({
                  messageType: "fetchWhiteList",
                  page: whiteList.page + 1,
                });
              }}
            >
              Next Page
            </button>
          </div>
          <table class="table table-sm table-striped table-hover">
            <tr>
              <th>Username</th>
              <th>Date Added</th>
              <th>Admin</th>
              <th>Reason</th>
              <th>Removal</th>
            </tr>
            <tbody>
              {#each whiteList.data as player}
                <tr>
                  <td>{player.username}</td>
                  <td>{player.white_date}</td>
                  <td>{player.admin}</td>
                  <td>{player.reason}</td>
                  <td>{player.unwhite_date}</td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
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
      <details>
        <summary>Known issues (click to expand)</summary>
        <ul>
          <li>Generally unstable performance mode</li>
          <li>
            Intrusive check may fail due to an issue with WC3 not updating chat info
          </li>
          <li>Can get stuck on loading screen if WC gets stuck loading</li>
          <li>Updating discord options can require a program restart</li>
          <li>Anti crash may fail</li>
        </ul>
      </details>
    </div>
    <div class="d-flex justify-content-center pt-1">
      <details>
        <summary>Updates this version (click to expand)</summary>
        <strong>New:</strong>
        <ul>
          <li>
            New option for smart host to watch for files to leave, bypassing ocr
            requirements. Check out the discord
          </li>
          <li>Filter out !debug messages from sending to discord/hub</li>
          <li>Private key for wc3stats uploads</li>
          <li>Choose observer type</li>
        </ul>
        <strong>Fixes:</strong>
        <ul>
          <li>Fixes to lobby container</li>
          <li>Announce player shuffle</li>
          <li>Fixed issue where sometimes senders wouldn't be recognized</li>
          <li>Fix double start issue</li>
        </ul>
      </details>
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
          <div class="btn-group btn-group-sm">
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
          <div class="btn-group btn-group-sm">
            <submit
              class="btn btn-success"
              type="submit"
              on:click={() =>
                toMain({
                  messageType: "whitePlayer",
                  white: { player: battleTag, reason: banReason },
                })}
            >
              WhiteList
            </submit>
            <submit
              class="btn btn-danger"
              type="submit"
              on:click={() =>
                toMain({
                  messageType: "unwhitePlayer",
                  white: { player: battleTag },
                })}
            >
              UnWhiteList
            </submit>
          </div>
          <div class="btn-group btn-group-sm">
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
      <div class="row">
        <div class="col d-flex justify-content-center">
          <div class="btn-group">
            <button
              type="button"
              class="btn btn-primary"
              data-bs-toggle="modal"
              data-bs-target="#banListModal"
              on:click={() => {
                if (banList.data.length === 0) {
                  toMain({
                    messageType: "fetchBanList",
                  });
                }
              }}
            >
              Show BanList
            </button>
            <button
              type="button"
              class="btn btn-primary"
              data-bs-toggle="modal"
              data-bs-target="#whiteListModal"
              on:click={() => {
                if (whiteList.data.length === 0) {
                  toMain({
                    messageType: "fetchWhiteList",
                  });
                }
              }}
            >
              Show WhiteList
            </button>
          </div>
        </div>
      </div>
      <div class="row justify-content-center p-2">
        <div class="col d-flex text-xs">
          <details>
            <summary>Permissions</summary><strong>Mod: </strong>
            ?a: Aborts game start<br />
            ?ban (name|slotNumber) (?reason): Bans a player forever<br />
            ?close (name|slotNumber): Closes a slot/player<br />
            ?handi (name|slotNumber) (50|60|70|80|100): Sets slot/player handicap<br />
            ?kick (name|slotNumber) (?reason): Kicks a slot/player<br />
            ?open (name|slotNumber) (?reason): Opens a slot/player<br />
            ?unban (name): Un-bans a player<br />
            ?unwhite (name): Un-whitelists a player<br />
            ?white (name) (?reason): WhiteLists a player<br />
            ?start: Starts game<br />
            ?swap (name|slotNumber) (name|slotNumber): Swaps two players<br />
            ?sp: Shuffles players completely randomly ?st: Shuffles players randomly between
            teams<br />
            <strong>Admin:</strong><br />
            ?perm (name) (?admin|mod): Promotes a player to admin or moderator (mod by default).<br
            />
            ?unperm (name): Demotes player to normal<br />
            ?autohost (?off|rapid|lobby|smart): Gets/?Sets autohost type
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
            <td id="eloAvailable">{currentStatus.lobby.statsAvailable}</td>
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
                <th>Actions</th>
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
                    {/if}</td
                  >
                  <td>
                    {player.name}<br />
                    {player.data.joinedAt
                      ? new Date(player.data.joinedAt).toLocaleString(undefined, {
                          timeZone: "UTC",
                          minute: "2-digit",
                          hour: "2-digit",
                        })
                      : ""}
                  </td>
                  <td
                    >{player.data.extra && player.data.extra.rating > -1
                      ? [
                          player.data.extra.rating,
                          player.data.extra.rank,
                          player.data.extra.played,
                          player.data.extra.wins,
                          player.data.extra.losses,
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
