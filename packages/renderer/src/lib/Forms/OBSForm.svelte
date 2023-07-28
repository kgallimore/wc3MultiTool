<script lang="ts">
  import TitleDeco from "./../../assets/keepitmoving/title-deco.png";

  import SettingsCheckbox from "./../SettingsCheckbox.svelte";
  import { appSettings } from "./../../stores/page";
  import type { WindowSend } from "../../../../tsrc/utility";
  export let onInputChange: (
    e:
      | (Event & {
          currentTarget: EventTarget & HTMLSelectElement;
        })
      | (Event & {
          currentTarget: EventTarget & HTMLInputElement;
        })
  ) => void;
  export let toMain: (args: WindowSend) => void;

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
</script>

<form name="obs" class="p-2">
  <div class="d-flex justify-content-center">
    <!-- svelte-ignore a11y-missing-attribute -->
    <img class="float-left p-2" src={TitleDeco} />
    <span class="flex-1 text-4xl text-active-text">OBS</span>
    <span class="flex-1 m-auto">
      <SettingsCheckbox
        key="obsEnabled"
        frontFacingName="Enabled"
        checked={$appSettings.obs.enabled}
        on:change={onInputChange}
      /></span
    >
  </div>
  <div class="row">
    <div class="col">
      <div class="d-flex justify-content-center" />
    </div>
  </div>
  {#if $appSettings.obs.enabled}
    <div class="border m-2 p-2">
      <div class="row">
        <div class="col">
          <div class="btn-group btn-group-sm w-100 py-1" role="group">
            {#if $appSettings.autoHost.type !== "smartHost" || $appSettings.autoHost.leaveAlternate === false}
              <SettingsCheckbox
                key="autoStream"
                frontFacingName="Auto Stream (Beta)"
                checked={$appSettings.obs.autoStream}
                tooltipContent="Periodically hit spacebar to jump to POIs"
                on:change={onInputChange}
              />
            {/if}
            <SettingsCheckbox
              key="textSource"
              frontFacingName="Text Source"
              checked={$appSettings.obs.textSource}
              tooltipContent="Create a text source in the Documents folder that contains all lobby players and their stats."
              on:change={onInputChange}
            />
          </div>
        </div>
        <div class="row">
          <div class="col">
            <strong>Auto Stream:</strong> Presses SpaceBar in slightly randomized
            intervals to jump to POIs. Incompatible with intrusive check.<br /><strong
              >Text source:</strong
            > Outputs loby data to Documents/wc3mt.txt.
          </div>
        </div>
      </div>
      <div class="row">
        <div class="col">
          <label for="obsSelect" class="form-label">Scene Switch Type</label>
          <select
            id="obsSelect"
            class="form-select"
            value={$appSettings.obs.sceneSwitchType}
            on:change={onInputChange}
          >
            <option value="off" selected>Disabled</option>
            <option value="hotkeys">Simulate Hotkeys</option>
            <option value="websockets">OBS Websockets(Recommended)</option>
          </select>
        </div>
      </div>
      {#if $appSettings.obs.sceneSwitchType === "hotkeys"}
        <div class="row">
          <div class="col d-flex justify-content-center">OBS Hotkeys Settings</div>
          <div class="row">
            <div class="col">
              <label for="inGameHotkey">In game hotkey</label>
              <input
                type="text"
                class="form-control"
                id="inGameHotkey"
                placeholder="In game hotkey"
                on:keydown={(event) => generateHotkeys(event, "inGameHotkey")}
                value={$appSettings.obs.inGameHotkey
                  ? ($appSettings.obs.inGameHotkey.shiftKey ? "Shift + " : "") +
                    ($appSettings.obs.inGameHotkey.ctrlKey ? "Ctrl + " : "") +
                    ($appSettings.obs.inGameHotkey.altKey ? "Alt + " : "") +
                    $appSettings.obs.inGameHotkey.key
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
                value={$appSettings.obs.outOfGameHotkey
                  ? ($appSettings.obs.outOfGameHotkey.shiftKey ? "Shift + " : "") +
                    ($appSettings.obs.outOfGameHotkey.ctrlKey ? "Ctrl + " : "") +
                    ($appSettings.obs.outOfGameHotkey.altKey ? "Alt + " : "") +
                    $appSettings.obs.outOfGameHotkey.key
                  : ""}
              />
            </div>
          </div>
        </div>
      {:else if $appSettings.obs.sceneSwitchType === "websockets"}
        <div class="border m-2">
          <div class="row">
            <div class="col">
              <label for="obsAddress">OBS Address(Blank for unchanged)</label>
              <input
                type="text"
                class="form-control"
                id="obsAddress"
                placeholder="ip:port"
                value={$appSettings.obs.address}
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
                value={$appSettings.obs.token}
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
                value={$appSettings.obs.inGameWSScene}
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
                value={$appSettings.obs.outOfGameWSScene}
                on:change={onInputChange}
              />
            </div>
          </div>
        </div>
      {/if}
    </div>
  {/if}
</form>
