<script lang="ts">
  import TitleDeco from '../../../assets/keepitmoving/title-deco.png';
  import SettingsCheckbox from './../SettingsCheckbox.svelte';
  import {appSettings} from './../../stores/page';
  import {isValidUrl} from '../../../../main/src/utility';
  import type {AppSettings, SettingsKeys} from '../../../../main/src/globals/settings';

  export let onInputChange: (
    e:
      | (Event & {
          currentTarget: EventTarget & HTMLSelectElement;
        })
      | (Event & {
          currentTarget: EventTarget & HTMLInputElement;
        }),
  ) => void;
  export let updateSettingSingle: (
    setting: keyof AppSettings,
    key: SettingsKeys,
    value: boolean | string | number,
    slot?: number | null,
  ) => void;
</script>

<form
  id="clientForm"
  name="client"
  class="p-2"
>
  <div class="d-flex justify-content-center text-4xl text-active-text">
    <!-- svelte-ignore a11y-missing-attribute -->
    <img
      class="float-left p-2"
      src={TitleDeco}
    />
    <span class="flex-1">Client</span>
  </div>
  <div class="border">
    <div class="row m-2">
      <div class="col p-2">
        <div
          class="grid grid-cols-4"
          style="flex-wrap: wrap;"
          role="group"
        >
          <SettingsCheckbox
            frontFacingName="Restart on update"
            key="restartOnUpdate"
            tooltipContent="Restart the client when a new version is downloaded and installed."
            checked={$appSettings.client.restartOnUpdate}
            on:change={onInputChange}
          />
          <SettingsCheckbox
            frontFacingName="Check for updates"
            key="checkForUpdates"
            tooltipContent="Check for updates on startup and every 30 minutes."
            checked={$appSettings.client.checkForUpdates}
            on:change={onInputChange}
          />
          <SettingsCheckbox
            frontFacingName="Performance Mode(Beta)"
            key="performanceMode"
            tooltipContent="Enable this to strip out Warcraft 3's UI. Does not affect anything in game, mainly meant for low power systems running Rapid Host"
            checked={$appSettings.client.performanceMode}
            on:change={onInputChange}
          />
          <SettingsCheckbox
            frontFacingName="Open warcraft on start"
            key="openWarcraftOnStart"
            tooltipContent="Open up Warcraft when WC3MT is opened"
            checked={$appSettings.client.openWarcraftOnStart}
            on:change={onInputChange}
          />
          <SettingsCheckbox
            frontFacingName="Start on Login"
            key="startOnLogin"
            tooltipContent="Open up WC3MT when you log in"
            checked={$appSettings.client.startOnLogin}
            on:change={onInputChange}
          />
          <SettingsCheckbox
            frontFacingName="Anti-Crash"
            key="antiCrash"
            tooltipContent="Restart Warcraft on crash."
            checked={$appSettings.client.antiCrash}
            on:change={onInputChange}
          />
          <SettingsCheckbox
            frontFacingName="Alternate Launch"
            key="alternateLaunch"
            tooltipContent="Launches Warcraft directly without OCR"
            checked={$appSettings.client.alternateLaunch}
            on:change={e => {
              // @ts-expect-error This exists
              if (!e.target.checked) {
                updateSettingSingle('client', 'bnetUsername', '');
                updateSettingSingle('client', 'bnetPassword', '');
              }
              updateSettingSingle(
                'client',
                'alternateLaunch',
                // @ts-expect-error This exists
                e.target.checked,
              );
            }}
          />
          <SettingsCheckbox
            frontFacingName="Debug Assistance"
            key="debugAssistance"
            tooltipContent="Gives the bot developer (Trenchguns) admin powers."
            checked={$appSettings.client.debugAssistance}
            on:change={onInputChange}
          />
        </div>
      </div>
      <div class="row">
        <div class="col">
          <label
            for="releaseChannel"
            class="form-label">Release Channel</label
          >
          <select
            id="releaseChannel"
            class="form-select"
            value={$appSettings.client.releaseChannel}
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
          value={$appSettings.client.commAddress}
          on:change={e => {
            let value = e.currentTarget.value;
            if (isValidUrl(value) || value === '') {
              onInputChange(e);
            } else {
              alert('Invalid Comm URL');
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
          value={$appSettings.client.language}
          maxlength="2"
          on:change={onInputChange}
        />
      </div>
      {#if $appSettings.client.language}
        <div class="col text-center m-auto">
          <SettingsCheckbox
            frontFacingName="Send to lobby"
            key="translateToLobby"
            tooltipContent="Send translated messages back to the lobby."
            checked={$appSettings.client.translateToLobby}
            on:change={onInputChange}
          />
        </div>
      {/if}
    </div>
    {#if $appSettings.client.alternateLaunch}
      <div class="border border-dashed p-1 m-1">
        <div class="row">
          <div class="col text-center m-auto text-warning">
            Please don't actually use this. Your information is stored insecurely, and malicious
            actors may steal this data. Would you trust me with your password?
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
              value={$appSettings.client.bnetUsername}
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
              value={$appSettings.client.bnetPassword}
              maxlength="35"
              on:change={onInputChange}
            />
          </div>
        </div>
      </div>
    {/if}
  </div>
</form>
