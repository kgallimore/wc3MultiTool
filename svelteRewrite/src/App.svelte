<script lang="ts">
  import type { BanWhiteList, WindowReceive, WindowSend } from "../../tsrc/utility";
  import { onMount } from "svelte";
  import { MicroLobby } from "wc3mt-lobby-container";
  import type { PlayerData } from "wc3mt-lobby-container";
  import StyledButton from "./lib/StyledButton.svelte";
  import Menu from "./lib/Menu.svelte";
  import MainView from "./lib/MainView.svelte";
  import SettingsView from "./lib/SettingsView.svelte";
  import { gameState, clientState, appSettings, windowData } from "./stores/page";
  import UserLists from "./lib/UserLists.svelte";

  let lobby: MicroLobby;

  let banList: {
    data: BanWhiteList;
    page: number;
  } = { data: [], page: 0 };
  let whiteList: {
    data: BanWhiteList;
    page: number;
  } = { data: [], page: 0 };

  let viewSettings: "main" | "banlist" | "settings" = "main";
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

  onMount(() => {
    if (document.readyState !== "loading") {
      init();
    } else {
      document.addEventListener("DOMContentLoaded", function () {
        init();
      });
    }
  });

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
        clientState.update((state) => {
          Object.entries(data.globalUpdate.clientState).forEach(([key, value]) => {
            state[key] = value;
          });
          return state;
        });
      }
      if (data.globalUpdate.gameState) {
        gameState.update((state) => {
          Object.entries(data.globalUpdate.gameState).forEach(([key, value]) => {
            state[key] = value;
          });
          return state;
        });
      }
      if (data.globalUpdate.settings) {
        appSettings.update((state) => {
          Object.entries(data.globalUpdate.settings).forEach(([settingType, updates]) => {
            Object.entries(updates).forEach(([key, value]) => {
              state[settingType][key] = value;
            });
          });
          return state;
        });
        // TODO: this needs to be redone
        // if (data.globalUpdate.settings.elo) {
        //   wc3statsOptions = wc3EloModes(settings.elo.lookupName);
        // }
      }
    } else if (data.init) {
      clientState.set(data.init.clientState);
      gameState.set(data.init.gameState);
      appSettings.set(data.init.settings);
    } else if (data.legacy) {
      let newData = data.legacy.data;
      switch (data.legacy.messageType) {
        case "action":
          windowData.update((state) => {
            state.lastAction = newData.value;
            state.banReason = "";
            state.battleTag = "";
            return state;
          });
          break;
        case "updater":
          windowData.update((state) => {
            state.updateStatus = newData.value;
            return state;
          });
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
          appSettings.update((state) => {
            state.autoHost.mapPath = newData.value;
            return state;
          });
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

  function toMain(args: WindowSend) {
    // @ts-ignore
    window.api.send("toMain", args);
  }
</script>

<Menu />
<div>
  <div class="image-border top-bar w-[90%] top-2 mx-[36px] h-[39px]" />
  <div class="image-border bottom-bar w-[90%] bottom-4 mx-[36px] h-[39px]" />
  <div class="image-border left-bar h-5/6 left-0 w-9 my-[36px]" />
  <div class="image-border right-bar h-5/6 right-0 w-9 my-[36px]" />
  <div class="image-border top-left-corner corner top-2 left-0" />
  <div class="image-border top-right-corner corner top-2 right-0" />
  <div class="image-border bottom-left-corner corner bottom-4 left-0" />
  <div class="image-border bottom-right-corner corner bottom-4 right-0" />
</div>
<div class="w-full">
  <div class="top-wood fixed top-[47px] z-10 h-[83px] left-[36px] right-[39px]">
    <div class="flex w-5/6 mx-auto h-full relative items-center">
      <div class="friz text-center leading-none my-auto">ver<br />1.0.1</div>
      <div class="coture my-auto text-xl font-semibold">WC3 MULTITOOL</div>
      <div class="absolute flex right-0">
        <div class="my-auto">
          <StyledButton
            on:click={() => (viewSettings = "main")}
            disabled={viewSettings === "main"}
            active={viewSettings === "main"}
            >MAIN
          </StyledButton>
        </div>
        <div class="my-auto">
          <StyledButton
            on:click={() => (viewSettings = "banlist")}
            disabled={viewSettings === "banlist"}
            active={viewSettings === "banlist"}
          >
            BANLIST</StyledButton
          >
        </div>
        <div class="my-auto">
          <StyledButton
            on:click={() => (viewSettings = "settings")}
            disabled={viewSettings === "settings"}
            active={viewSettings === "settings"}
            >SETTINGS
          </StyledButton>
        </div>
      </div>
    </div>
  </div>
  <main class="fixed overflow-auto top-[130px] bottom-9 right-9 left-9">
    {#if viewSettings === "settings"}<SettingsView />{:else if viewSettings === "banlist"}
      <UserLists lists={{ banList, whiteList }} {toMain} />
    {:else if viewSettings === "main"}
      <MainView {lobby} {structuredTeamData} />
    {/if}
  </main>
  <div class="flex fixed bottom-[-15px] w-full items-center" style="	z-index: 10000;">
    <div class="m-auto">
      <div class="launch-button content-center inline-block">
        <div class="h-4" />
        <div class="h-10 w-44 m-auto">
          <button
            on:click={() => toMain({ messageType: "openWar" })}
            type="button"
            id="warcraftButton"
            class="cursor-pointer coture active:text-white w-full h-full"
          >
            <strong>OPEN WARCRAFT</strong>
          </button>
        </div>
      </div>
      <span
        class="inline-block connection-status {$gameState.connected
          ? 'online'
          : 'offline'}"
        id="mainStatus"
      >
        <div class="h-8" />
        <h2 class="coture text-center" id="statusText">
          <strong
            >{$gameState.connected ? "CONNECTED TO WARCRAFT" : "NO CONNECTION"}</strong
          >
        </h2>
      </span>
      <div class="launch-button content-center inline-block">
        <div class="h-4" />
        <div class="h-10 w-44 m-auto">
          <button
            on:click={() => console.log("Placeholder")}
            type="button"
            class="cursor-pointer coture active:text-white w-full h-full"
          >
            <strong>PLACEHOLDER</strong>
          </button>
        </div>
      </div>
    </div>
  </div>
</div>
