<script lang="ts">
  import {
    BanWhiteList,
    WindowReceive,
    WindowSend,
    isValidUrl,
  } from "../../tsrc/utility";
  import type { AppSettings, SettingsKeys } from "./../../tsrc/globals/settings";
  import { onMount } from "svelte";
  import { getTargetRegion } from "../../tsrc/utility";
  import { MicroLobby, PlayerData } from "wc3mt-lobby-container";
  import CloseSlot from "./components/CloseSlot.svelte";
  import SettingsCheckbox from "./components/SettingsCheckbox.svelte";
  import WhiteBanList from "./components/WhiteBanList.svelte";
  import SettingsTextInput from "./components/SettingsTextInput.svelte";
  import type { GameState } from "../../tsrc/globals/gameState";
  import type { ClientState } from "../../tsrc/globals/clientState";

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
      regionChangeType: "off",
      regionChangeTimeEU: "11:00",
      regionChangeOpenVPNConfigEU: "",
      regionChangeTimeNA: "01:00",
      regionChangeOpenVPNConfigNA: "",
      whitelist: false,
      minPlayers: 0,
      delayStart: 0,
      openVPNPath: "",
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
      dbIP: "127.0.0.1",
      dbPort: 3306,
      dbUser: "",
      dbPassword: "",
      dbName: "",
      dbTableName: "",
      dbSecondaryTable: "",
      dbPrimaryTableKey: "",
      dbSecondaryTableKey: "",
      dbUserColumn: "player",
      dbELOColumn: "rating",
      dbDefaultElo: 500,
      dbRankColumn: "rank",
      dbLastChangeColumn: "",
      dbPlayedColumn: "played",
      dbWonColumn: "wins",
      sqlitePath: "",
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
      adminChannel: "",
      logLevel: "error",
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
      releaseChannel: "latest",
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
  let clientState: ClientState = {
    tableVersion: 0,
    latestUploadedReplay: 0,
    currentStep: "",
    currentStepProgress: 0,
    currentIP: "",
    vpnActive: false,
    ipCountry: "",
    ipIsEU: false,
  };
  let gameState: GameState = {
    selfRegion: "",
    menuState: "OUT_OF_MENUS",
    selfBattleTag: "",
    inGame: false,
    action: "openingWarcraft",
    openLobbyParams: undefined,
    connected: false,
    gameVersion: "",
  };
  let updateStatus: string = "";
  let lobby: MicroLobby;
  let wc3statsOptions = wc3EloModes(settings.elo.lookupName);
  let battleTag = "";
  let banReason = "";
  let lastAction = "";
  let banList: {
    data: Array<BanWhiteList>;
    page: number;
  } = { data: [], page: 0 };
  let whiteList: {
    data: Array<BanWhiteList>;
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
      ? settings.autoHost.minPlayers < 1
        ? "I will start when slots are full."
        : "I will start with " + settings.autoHost.minPlayers + " players."
      : ""
  } ${settings.autoHost.voteStart ? " You can vote start with ?votestart" : ""}`;
  onMount(() => {
    if (document.readyState !== "loading") {
      init();
    } else {
      document.addEventListener("DOMContentLoaded", function () {
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

  function onInputChange(
    e:
      | (Event & {
          currentTarget: EventTarget & HTMLSelectElement;
        })
      | (Event & {
          currentTarget: EventTarget & HTMLInputElement;
        })
  ) {
    let val: string | boolean;
    if (e.currentTarget.getAttribute("type") === "checkbox") {
      val = (e.currentTarget as EventTarget & HTMLInputElement).checked;
    } else {
      val = e.currentTarget.value;
    }
    let keyName: string;
    if (e.currentTarget.id.indexOf(e.currentTarget.form.name) === 0) {
      keyName =
        e.currentTarget.id.charAt(e.currentTarget.form.name.length).toLowerCase() +
        e.currentTarget.id.slice(e.currentTarget.form.name.length + 1);
    } else {
      keyName = e.currentTarget.id;
    }
    updateSettingSingle(
      e.currentTarget.form.name as keyof AppSettings,
      keyName as SettingsKeys,
      val
    );
  }

  function updateNumber(
    e: Event & {
      currentTarget: EventTarget & HTMLInputElement;
    },
    min: number = 0
  ) {
    let val = parseInt(e.currentTarget.value);
    if (isNaN(val)) {
      val = min;
      e.currentTarget.value = min.toString();
    }
    updateSettingSingle(
      e.currentTarget.form.name as keyof AppSettings,
      e.currentTarget.id as SettingsKeys,
      val
    );
  }

  function updatestructuredTeamData() {
    let exported = lobby.exportTeamStructure(false);
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
    if (data.globalUpdate) {
      if (data.globalUpdate.clientState) {
        Object.entries(data.globalUpdate.clientState).forEach(([key, value]) => {
          clientState[key] = value;
        });
      }
      if (data.globalUpdate.gameState) {
        Object.entries(data.globalUpdate.gameState).forEach(([key, value]) => {
          gameState[key] = value;
        });
      }
      if (data.globalUpdate.settings) {
        Object.entries(data.globalUpdate.settings).forEach(([settingType, updates]) => {
          Object.entries(updates).forEach(([key, value]) => {
            settings[settingType][key] = value;
          });
        });
        if (data.globalUpdate.settings.elo) {
          wc3statsOptions = wc3EloModes(settings.elo.lookupName);
        }
      }
    } else if (data.init) {
      clientState = data.init.clientState;
      gameState = data.init.gameState;
      settings = data.init.settings;
    } else if (data.legacy) {
      let newData = data.legacy.data;
      switch (data.legacy.messageType) {
        case "action":
          lastAction = newData.value;
          banReason = "";
          battleTag = "";
          break;
        case "updater":
          updateStatus = newData.value;
          break;
        case "lobbyUpdate":
          let lobbyData = newData.lobbyData;
          if (lobbyData.newLobby) {
            lobby = new MicroLobby({
              region: "us",
              fullData: lobbyData.newLobby,
            });
            updatestructuredTeamData();
          } else if (lobbyData.playerPayload || lobbyData.playerData) {
            if (lobby) {
              let updated = lobby.ingestUpdate(lobbyData).isUpdated;
              if (updated) updatestructuredTeamData();
            }
          } else if (lobbyData.leftLobby) {
            lobby = null;
            structuredTeamData = [];
          }
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
          alertDiv.innerHTML = `<strong>Error!</strong> ${data.legacy.data.error} <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>`;
          document.body.prepend(alertDiv);
          break;
        case "gotMapPath":
          settings.autoHost.mapPath = newData.value;
          break;
        case "fetchedWhiteBanList":
          if (newData.fetched) {
            if (newData.fetched.type === "banList") {
              banList = { data: newData.fetched.list, page: newData.fetched.page };
            } else if (newData.fetched.type === "whiteList") {
              whiteList = { data: newData.fetched.list, page: newData.fetched.page };
            }
          }
          break;
        default:
          console.log("Unknown:", data);
      }
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
          obs: {
            [key as "inGameHotkey" | "outOfGameHotkey"]: newValue,
          },
        },
      });
    }
  }

  function updateSettingSingle(
    setting: keyof AppSettings,
    key: SettingsKeys,
    value: boolean | string | number,
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
        update: { [setting]: { [key]: value } },
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
                      on:change={onInputChange}
                    />
                    <SettingsCheckbox
                      frontFacingName="Check for updates"
                      setting="client"
                      key="checkForUpdates"
                      tooltip="Check for updates on startup and every 30 minutes."
                      checked={settings.client.checkForUpdates}
                      on:change={onInputChange}
                    />
                    <SettingsCheckbox
                      frontFacingName="Performance Mode(Beta)"
                      setting="client"
                      key="performanceMode"
                      tooltip="Enable this to strip out Warcraft 3's UI. Does not affect anything in game, mainly meant for low power systems running Rapid Host"
                      checked={settings.client.performanceMode}
                      on:change={onInputChange}
                    />
                    <SettingsCheckbox
                      frontFacingName="Open warcraft on start"
                      setting="client"
                      key="openWarcraftOnStart"
                      tooltip="Open up Warcraft when WC3MT is opened"
                      checked={settings.client.openWarcraftOnStart}
                      on:change={onInputChange}
                    />
                    <SettingsCheckbox
                      frontFacingName="Start on Login"
                      setting="client"
                      key="startOnLogin"
                      tooltip="Open up WC3MT when you log in"
                      checked={settings.client.startOnLogin}
                      on:change={onInputChange}
                    />
                    <SettingsCheckbox
                      frontFacingName="Anti-Crash"
                      setting="client"
                      key="antiCrash"
                      tooltip="Restart Warcraft on crash."
                      checked={settings.client.antiCrash}
                      on:change={onInputChange}
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
                <div class="row">
                  <div class="col">
                    <label for="releaseChannel" class="form-label">Release Channel</label>
                    <select
                      id="releaseChannel"
                      class="form-select"
                      value={settings.client.releaseChannel}
                      on:change={onInputChange}
                    >
                      <option value="latest">Latest</option>
                      <option value="beta">Beta</option>
                      <option value="alpha">Alpha</option>
                    </select>
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
                      let value = e.currentTarget.value;
                      if (isValidUrl(value) || value === "") {
                        onInputChange(e);
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
                    on:change={onInputChange}
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
                      on:change={onInputChange}
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
                        on:change={onInputChange}
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
                        on:change={onInputChange}
                      />
                    </div>
                  </div>
                </div>
              {/if}
            </form>
            <form name="elo" class="p-2">
              <div class="row">
                <div class="col">
                  <label for="eloType" class="form-label"> ELO Lookup</label>
                  <select
                    id="eloType"
                    class="form-select"
                    value={settings.elo.type}
                    on:change={onInputChange}
                  >
                    <option value="off">Disabled</option>
                    <option value="wc3stats">wc3stats.com</option>
                    <option value="mariadb">MariaDB</option>
                    <option value="mysql">MySQL</option>
                    <option value="sqlite">Sqlite</option>
                    <option value="random">Random (Test mode)</option>
                  </select>
                </div>
              </div>
              {#if settings.elo.type !== "off"}
                <div id="eloSettings" class="border p-2">
                  <div class="row">
                    <div class="col">
                      <div class="d-flex justify-content-center">ELO Settings</div>
                      {#if ["mysql", "mariadb"].includes(settings.elo.type)}
                        <div class="row">
                          <div class="col">
                            <label for="dbIP">Databse Address</label>
                            <input
                              type="text"
                              class="form-control"
                              id="dbIP"
                              placeholder=""
                              value={settings.elo.dbIP}
                              on:change={onInputChange}
                            />
                          </div>
                          <div class="col">
                            <label for="dbPort">Databse Port</label>
                            <input
                              type="number"
                              class="form-control"
                              id="dbPort"
                              min="20"
                              max="25565"
                              value={settings.elo.dbPort}
                              on:change={(e) => updateNumber(e, 20)}
                            />
                          </div>
                        </div>
                        <div class="row">
                          <SettingsTextInput
                            frontFacingName="Databse User"
                            key="dbUser"
                            value={settings.elo.dbUser}
                            on:change={onInputChange}
                          />
                          <SettingsTextInput
                            frontFacingName="Databse Pass"
                            placeholder="Password"
                            key="dbPassword"
                            value={settings.elo.dbPassword}
                            on:change={onInputChange}
                          />
                        </div>
                        <div class="row">
                          <SettingsTextInput
                            frontFacingName="Databse Name"
                            key="dbName"
                            value={settings.elo.dbName}
                            on:change={onInputChange}
                          />
                        </div>
                      {:else if settings.elo.type === "sqlite"}
                        <div class="row">
                          <SettingsTextInput
                            frontFacingName="Sqlite Path"
                            key="sqlitePath"
                            placeholder="Absolute Path"
                            value={settings.elo.sqlitePath}
                            on:change={onInputChange}
                          />
                        </div>
                      {/if}
                      {#if ["mysql", "mariadb", "sqlite"].includes(settings.elo.type)}
                        <div class="row">
                          <div class="col">
                            <label for="dbDefaultElo">Default Elo</label>
                            <input
                              type="number"
                              class="form-control"
                              id="dbDefaultElo"
                              placeholder="0 for none"
                              value={settings.elo.dbDefaultElo}
                              on:change={updateNumber}
                            />
                          </div>
                        </div>
                        <div class="border m-2 p-2">
                          <div class="text-center">Column Mappings</div>
                          <div class="row">
                            <div class="col">
                              <label for="dbTableName">User Table</label>
                              <input
                                type="text"
                                class="form-control"
                                id="dbTableName"
                                placeholder="User Table"
                                value={settings.elo.dbTableName}
                                on:change={onInputChange}
                              />
                            </div>
                            <div class="col">
                              <label for="dbUserColumn">Username</label>
                              <input
                                type="text"
                                class="form-control"
                                id="dbUserColumn"
                                placeholder="Username Column"
                                value={settings.elo.dbUserColumn}
                                on:change={onInputChange}
                              />
                            </div>
                            <div class="col">
                              <label for="dbELOColumn">ELO/Rating</label>
                              <input
                                type="text"
                                class="form-control"
                                id="dbELOColumn"
                                placeholder="ELO Column"
                                value={settings.elo.dbELOColumn}
                                on:change={onInputChange}
                              />
                            </div>
                          </div>
                          <div class="row pt-2">
                            <div class="col text-center">Optional (Blank to disable)</div>
                          </div>
                          <div class="border m-1 p-1">
                            <div class="row">
                              <SettingsTextInput
                                frontFacingName="Rank"
                                key="dbRankColumn"
                                value={settings.elo.dbRankColumn}
                                on:change={onInputChange}
                              />
                              <SettingsTextInput
                                frontFacingName="Played"
                                key="dbPlayedColumn"
                                value={settings.elo.dbPlayedColumn}
                                on:change={onInputChange}
                              />
                              <SettingsTextInput
                                frontFacingName="Wins"
                                key="dbWonColumn"
                                value={settings.elo.dbWonColumn}
                                on:change={onInputChange}
                              />
                            </div>
                            <div class="row pt-2">
                              <div class="col text-center">Advanced</div>
                            </div>
                            <div class="row">
                              <SettingsTextInput
                                frontFacingName="Join Table"
                                key="dbSecondaryTable"
                                placeholder="Secondary Table"
                                value={settings.elo.dbSecondaryTable}
                                on:change={onInputChange}
                              />
                              <SettingsTextInput
                                frontFacingName="Table 1 Key"
                                key="dbPrimaryTableKey"
                                value={settings.elo.dbPrimaryTableKey}
                                on:change={onInputChange}
                              />
                              <SettingsTextInput
                                frontFacingName="Table 2 Key"
                                key="dbSecondaryTableKey"
                                value={settings.elo.dbSecondaryTableKey}
                                on:change={onInputChange}
                              />
                            </div>
                          </div>
                        </div>
                      {/if}
                      {#if settings.autoHost.type !== "off"}
                        <div class="d-flex justify-content-center">
                          {#if settings.elo.available}
                            <div class="badge bg-success">
                              {#if settings.elo.type === "wc3stats"}
                                <a
                                  href="https://api.wc3stats.com/maps/{settings.elo
                                    .lookupName}">ELO Available!</a
                                >
                              {:else}
                                ELO Available!
                              {/if}
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
                              on:change={onInputChange}
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
                                  on:change={onInputChange}
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
                          on:change={onInputChange}
                        />
                        <SettingsCheckbox
                          key="excludeHostFromSwap"
                          setting="elo"
                          frontFacingName="Don't swap host"
                          checked={settings.elo.excludeHostFromSwap}
                          tooltip="Will not swap the local user during auto balancing."
                          on:change={onInputChange}
                        />
                        {#if settings.elo.type === "wc3stats"}
                          <SettingsCheckbox
                            key="handleReplays"
                            setting="elo"
                            frontFacingName="Handle Replays"
                            checked={settings.elo.handleReplays}
                            tooltip="Automatically handle upload to wc3stats.com at the end of each game."
                            on:change={onInputChange}
                          />
                        {/if}
                        <SettingsCheckbox
                          key="announce"
                          setting="elo"
                          frontFacingName="Announce Stats"
                          checked={settings.elo.announce}
                          tooltip="Announce stats to the lobby."
                          on:change={onInputChange}
                        />
                        <SettingsCheckbox
                          key="requireStats"
                          setting="elo"
                          frontFacingName="Require Stats"
                          checked={settings.elo.requireStats}
                          tooltip="Will require minimum stats of games/wins/rank/rating in order to join the lobby."
                          on:change={onInputChange}
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
                          on:change={updateNumber}
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
                          on:change={updateNumber}
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
                          on:change={updateNumber}
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
                          on:change={updateNumber}
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
                    id="autoHostType"
                    class="form-select"
                    value={settings.autoHost.type}
                    on:change={onInputChange}
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
                          on:change={onInputChange}
                        />
                        <SettingsCheckbox
                          key="increment"
                          setting="autoHost"
                          frontFacingName="Incremental Lobbies"
                          checked={settings.autoHost.increment}
                          tooltip="Will append the current game number to end of the lobby name."
                          on:change={onInputChange}
                        />
                        <SettingsCheckbox
                          frontFacingName="Sound Notifications"
                          key="sounds"
                          setting="autoHost"
                          checked={settings.autoHost.sounds}
                          tooltip="Will play sounds when a game is full, when a game loads in, and when a game ends."
                          on:change={onInputChange}
                        />
                        <SettingsCheckbox
                          frontFacingName="Move to Spec/Host/Team"
                          key="moveToSpec"
                          setting="autoHost"
                          checked={settings.autoHost.moveToSpec}
                          tooltip="Will move the local user to a spectator slot upon joining the lobby."
                          on:change={onInputChange}
                        />
                        <SettingsCheckbox
                          frontFacingName="Custom Announcement"
                          key="announceCustom"
                          setting="autoHost"
                          checked={settings.autoHost.announceCustom}
                          tooltip="Will announce custom text to the lobby."
                          on:change={onInputChange}
                        />
                        {#if ["rapidHost", "smartHost"].includes(settings.autoHost.type)}
                          <SettingsCheckbox
                            frontFacingName="Announce Is Bot"
                            key="announceIsBot"
                            setting="autoHost"
                            checked={settings.autoHost.announceIsBot}
                            tooltip="Will announce if the local user is a bot. You can check the message below."
                            on:change={onInputChange}
                          />
                          <SettingsCheckbox
                            frontFacingName="Vote start"
                            key="voteStart"
                            setting="autoHost"
                            checked={settings.autoHost.voteStart}
                            tooltip="Will allow users to vote to start the game."
                            on:change={onInputChange}
                          />
                          {#if settings.elo.type === "off" || !settings.elo.balanceTeams}
                            <SettingsCheckbox
                              frontFacingName="Shuffle Players"
                              key="shufflePlayers"
                              setting="autoHost"
                              checked={settings.autoHost.shufflePlayers}
                              tooltip="Shuffles players randomly before starting."
                              on:change={onInputChange}
                            />
                          {/if}
                          {#if settings.autoHost.voteStart}
                            <SettingsCheckbox
                              frontFacingName="Require All Teams for Votestart"
                              key="voteStartTeamFill"
                              setting="autoHost"
                              checked={settings.autoHost.voteStartTeamFill}
                              tooltip="Will require all teams to have at least 1 player before players can vote start."
                              on:change={onInputChange}
                            />
                          {/if}
                          {#if settings.autoHost.type === "smartHost" && settings.autoHost.moveToSpec && settings.autoHost.observers}
                            <SettingsCheckbox
                              frontFacingName="Intrusive check"
                              key="leaveAlternate"
                              setting="autoHost"
                              checked={settings.autoHost.leaveAlternate}
                              tooltip="Queries the chat menu periodically in game in order to attempt to see if there are any other players left in lobby. Note: this still will not gaurantee that it games will be left successfully due to a minor WC3 bug."
                              on:change={onInputChange}
                            />
                          {/if}
                        {/if}
                        <SettingsCheckbox
                          setting="autoHost"
                          key="advancedMapOptions"
                          frontFacingName="Advanced Map Options"
                          checked={settings.autoHost.advancedMapOptions}
                          tooltip="Will show advanced map options."
                          on:change={onInputChange}
                        />
                        <SettingsCheckbox
                          key="whitelist"
                          setting="autoHost"
                          frontFacingName="Whitelist"
                          checked={settings.autoHost.whitelist}
                          tooltip="Only allow certain players to join."
                          on:change={onInputChange}
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
                            on:change={onInputChange}
                          />
                          <SettingsCheckbox
                            setting="autoHost"
                            key="flagFullSharedUnitControl"
                            frontFacingName="Full Shared Unit Control"
                            checked={settings.autoHost.flagFullSharedUnitControl}
                            on:change={onInputChange}
                          />
                          <SettingsCheckbox
                            setting="autoHost"
                            key="flagPlaceTeamsTogether"
                            frontFacingName="Place Teams Together"
                            checked={settings.autoHost.flagPlaceTeamsTogether}
                            on:change={onInputChange}
                          />
                          <SettingsCheckbox
                            setting="autoHost"
                            key="flagRandomRaces"
                            frontFacingName="Random Races"
                            checked={settings.autoHost.flagRandomRaces}
                            on:change={onInputChange}
                          />
                          <label for="observerType">Add observers:</label>
                          <select
                            class="form-control form-control-sm"
                            id="observerType"
                            value={settings.autoHost.observers}
                            on:change={onInputChange}
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
                          on:change={onInputChange}
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
                            onInputChange(e);
                          }
                        }}
                        on:change={onInputChange}
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
                        on:change={updateNumber}
                      />
                    </div>
                    {#if ["rapidHost", "smartHost"].includes(settings.autoHost.type)}
                      <div class="col">
                        <label for="minPlayers">Mini Players to Autostart</label>
                        <input
                          type="number"
                          class="form-control"
                          id="minPlayers"
                          placeholder="0 to disable"
                          min="0"
                          max="24"
                          value={settings.autoHost.minPlayers}
                          on:change={updateNumber}
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
                              onInputChange(e);
                            }
                          }}
                          on:change={onInputChange}
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
                                e.currentTarget.checked,
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
                              Math.min(Math.max(parseInt(e.currentTarget.value), 5), 100)
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
                          on:change={onInputChange}
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
                          on:change={onInputChange}
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
                          on:change={updateNumber}
                        />
                      </div>
                    </div>
                  {/if}
                  <div class="row p-2">
                    <div class="col">
                      <label for="regionChangeType">Change Region</label>
                      <select
                        class="form-control form-control-sm"
                        id="regionChangeType"
                        value={settings.autoHost.regionChangeType}
                        on:change={onInputChange}
                      >
                        <option value="off" selected>Off</option>
                        <option disabled={settings.client.alternateLaunch} value="realm"
                          >Bnet Realm</option
                        >
                        <option value="openVPN">OpenVPN</option>
                        <option disabled={settings.client.alternateLaunch} value="both"
                          >Both</option
                        >
                      </select>
                    </div>
                  </div>
                  {#if settings.autoHost.regionChangeType !== "off"}
                    <div class="row p-2">
                      <div class="col flex text-center">
                        Current UTC time is: {utcTime}
                        Target: {region}
                      </div>
                    </div>
                    {#if settings.autoHost.regionChangeType === "both" || settings.autoHost.regionChangeType === "openVPN"}
                      <div class="row p-2">
                        <div class="col">
                          <button
                            on:click={() => toMain({ messageType: "getOpenVPNPath" })}
                            type="button"
                            class="btn btn-sm {settings.autoHost.openVPNPath
                              ? 'btn-primary'
                              : 'btn-danger'}"
                            id="openVPNPath"
                            >OpenVPN-GUI.exe Path:
                          </button>
                          <span
                            class={settings.autoHost.openVPNPath ? "" : "alert-warning"}
                            >{settings.autoHost.openVPNPath || "Please set a path."}</span
                          >
                        </div>
                      </div>
                      <div class="row p-2">
                        <div class="col">
                          <label for="regionChangeOpenVPNConfigNA" class="form-label"
                            >NA OVPN File Name</label
                          >
                          <input
                            type="text"
                            id="regionChangeOpenVPNConfigNA"
                            class="form-control"
                            placeholder="With or without extension"
                            value={settings.autoHost.regionChangeOpenVPNConfigNA}
                            on:change={onInputChange}
                          />
                        </div>
                        <div class="col">
                          <label for="regionChangeOpenVPNConfigEU" class="form-label"
                            >EU OVPN File Name</label
                          >
                          <input
                            type="text"
                            id="regionChangeOpenVPNConfigEU"
                            class="form-control"
                            placeholder="With or without extension"
                            value={settings.autoHost.regionChangeOpenVPNConfigEU}
                            on:change={onInputChange}
                          />
                        </div>
                      </div>
                    {/if}
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
                          on:change={onInputChange}
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
                          on:change={onInputChange}
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
                      key="discordEnabled"
                      frontFacingName="Discord Integration"
                      checked={settings.discord.enabled}
                      on:change={onInputChange}
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
                          on:change={onInputChange}
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
                          on:change={onInputChange}
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
                          on:change={onInputChange}
                        />
                      </div>
                    </div>
                    <div class="row">
                      <div class="col">
                        <label for="adminChannel">Admin Channel</label>
                        <input
                          type="text"
                          class="form-control"
                          id="adminChannel"
                          placeholder="Name or ID"
                          value={settings.discord.adminChannel}
                          on:change={onInputChange}
                        />
                      </div>
                      <div class="col-auto">
                        <label for="logLevel">Log Level</label>
                        <select
                          id="logLevel"
                          class="form-select"
                          value={settings.discord.logLevel}
                          on:change={onInputChange}
                        >
                          <option value="off" selected>Disabled</option>
                          <option value="warn">Warnings</option>
                          <option value="error">Errors</option>
                        </select>
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
                            on:change={onInputChange}
                          />
                          {#if settings.discord.bidirectionalChat && (settings.autoHost.type !== "smartHost" || settings.autoHost.leaveAlternate === false)}
                            <SettingsCheckbox
                              frontFacingName="Send Chat in Game"
                              setting="discord"
                              key="sendInGameChat"
                              checked={settings.discord.sendInGameChat}
                              tooltip="Users may send messages during game from the Discord channel. Not recommended."
                              on:change={onInputChange}
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
                      key="obsEnabled"
                      frontFacingName="OBS Integration"
                      checked={settings.obs.enabled}
                      on:change={onInputChange}
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
                            on:change={onInputChange}
                          />
                        {/if}
                        <SettingsCheckbox
                          setting="obs"
                          key="textSource"
                          frontFacingName="Text Source"
                          checked={settings.obs.textSource}
                          tooltip="Create a text source in the Documents folder that contains all lobby players and their stats."
                          on:change={onInputChange}
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
                        on:change={onInputChange}
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
                            on:change={onInputChange}
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
                            on:change={onInputChange}
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
                            on:change={onInputChange}
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
                            on:change={onInputChange}
                          />
                        </div>
                      </div>
                    </div>
                  {/if}
                </div>
              {/if}
            </form>
            <form name="streaming" class="p-2">
              <div class="row">
                <div class="col">
                  <div class="d-flex justify-content-center">
                    <SettingsCheckbox
                      setting="streaming"
                      key="streamingEnabled"
                      frontFacingName="Streaming Integration (Pre-Alpha)"
                      checked={settings.streaming.enabled}
                      on:change={onInputChange}
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
                        on:change={onInputChange}
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
                          on:change={onInputChange}
                        />
                        <SettingsCheckbox
                          setting="streaming"
                          key="sendTipsInLobby"
                          frontFacingName="Send Tips in Lobby"
                          checked={settings.streaming.sendTipsInLobby}
                          tooltip="Send tips in lobby."
                          on:change={onInputChange}
                        />
                        <SettingsCheckbox
                          setting="streaming"
                          key="sendTipsInDiscord"
                          frontFacingName="Send Tips in Discord"
                          checked={settings.streaming.sendTipsInDiscord}
                          tooltip="Send tips in Discord."
                          on:change={onInputChange}
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
                          on:change={(e) => updateNumber(e, 1)}
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
  <WhiteBanList type="whiteList" list={whiteList} {toMain} />
  <WhiteBanList type="banList" list={banList} {toMain} />

  <div class="container-lg">
    <div class="d-flex justify-content-center p-2">
      {#if gameState.connected}
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
        {updateStatus}
      </span>
    </div>
    <!--<div class="d-flex justify-content-center pt-1">
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
          <li>Sort white and ban list</li>
          <li>Export and import white and ban list</li>
          <li>Remove whitelisted and banned players from within list</li>
          <li>Discord rich presence integration</li>
          <li>Join others through Discord</li>
        </ul>
        <strong>Fixes:</strong>
        <ul>
          <li>N/A</li>
        </ul>
      </details>
    </div>-->
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
    <div class="d-flex justify-content-center pt-1">
      <details class="bg-primary rounded-2 m-1">
        <summary class="bg-secondary rounded-2 p-2">Advanced Status </summary>
        {#each Object.entries(gameState) as [key, value]}
          <div class="d-flex justify-content-center pt-1">
            {key}: {typeof value !== "object" ? value : JSON.stringify(value)}
          </div>
        {/each}
        {#each Object.entries(clientState) as [key, value]}
          <div class="d-flex justify-content-center pt-1">
            {key}: {typeof value !== "object" ? value : JSON.stringify(value)}
          </div>
        {/each}
      </details>
    </div>

    <h4>Current Step: <span />{clientState.currentStep}</h4>
    <div class="progress">
      <div
        id="progressBar"
        class="progress-bar progress-bar-striped progress-bar-animated"
        role="progressbar"
        aria-valuenow={clientState.currentStepProgress}
        style="width: {clientState.currentStepProgress.toString()}%"
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
                  messageType: "addWhiteBan",
                  addWhiteBan: { type: "banList", player: battleTag, reason: banReason },
                })}
            >
              Ban
            </submit>
            <submit
              class="btn btn-success"
              type="submit"
              on:click={() =>
                toMain({
                  messageType: "removeWhiteBan",
                  removeWhiteBan: { type: "banList", player: battleTag },
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
                  messageType: "addWhiteBan",
                  addWhiteBan: {
                    type: "whiteList",
                    player: battleTag,
                    reason: banReason,
                  },
                })}
            >
              WhiteList
            </submit>
            <submit
              class="btn btn-danger"
              type="submit"
              on:click={() =>
                toMain({
                  messageType: "removeWhiteBan",
                  removeWhiteBan: { type: "whiteList", player: battleTag },
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
                    messageType: "fetchWhiteBanList",
                    fetch: { type: "banList", page: 0 },
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
                    messageType: "fetchWhiteBanList",
                    fetch: { type: "whiteList", page: 0 },
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
            ?perm (name) (?admin|mod|swapper): Promotes a player to a specified role (mod by
            default).<br />
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
          {#if lobby}
            <td id="mapName">{lobby.lobbyStatic.mapData.mapName}</td>
            <td id="lobbyName">{lobby.lobbyStatic.lobbyName}</td>
            <td id="gameHost">{lobby.lobbyStatic.playerHost}</td>
            <td id="eloAvailable">{lobby.statsAvailable}</td>
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
                            messageType: "addWhiteBan",
                            addWhiteBan: {
                              type: "banList",
                              player: player.name,
                              reason: banReason,
                            },
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
