<script lang="ts">
  import TitleDeco from '../../../assets/keepitmoving/title-deco.png';

  import SettingsCheckbox from '../SettingsCheckbox.svelte';
  import {appSettings} from '../../stores/page';
  export let onInputChange: (
    e:
      | (Event & {
          currentTarget: EventTarget & HTMLSelectElement;
        })
      | (Event & {
          currentTarget: EventTarget & HTMLInputElement;
        }),
  ) => void;
  export let updateNumber: (
    e:
      | (Event & {
          currentTarget: EventTarget & HTMLInputElement;
        })
      | (Event & {
          currentTarget: EventTarget & HTMLSelectElement;
        }),
    min: number,
  ) => void;
</script>

<form
  name="streaming"
  class="p-2"
>
  <div class="d-flex justify-content-center">
    <!-- svelte-ignore a11y-missing-attribute -->
    <img
      class="float-left p-2"
      src={TitleDeco}
    />
    <span class="flex-1 text-4xl text-active-text">Streaming</span>
    <span class="flex-1 m-auto">
      <SettingsCheckbox
        key="streamingEnabled"
        frontFacingName="Enabled"
        checked={$appSettings.streaming.enabled}
        on:change={onInputChange}
      /></span
    >
  </div>
  {#if $appSettings.streaming.enabled}
    <div class="border m-2 p-2">
      <div class="row">
        <div class="col">
          <label for="seToken">Steam Elements Token</label>
          <input
            type="password"
            class="form-control"
            id="seToken"
            placeholder="Stream Elements JWT Token"
            value={$appSettings.streaming.seToken}
            on:change={onInputChange}
          />
        </div>
      </div>
      <div class="row">
        <div class="col">
          <div
            class="btn-group btn-group-sm w-100 py-1"
            role="group"
          >
            <SettingsCheckbox
              key="sendDonationsInGame"
              frontFacingName="Send Tips in Game"
              checked={$appSettings.streaming.sendTipsInGame}
              tooltipContent="Send tips in game. Not recommended."
              on:change={onInputChange}
            />
            <SettingsCheckbox
              key="sendTipsInLobby"
              frontFacingName="Send Tips in Lobby"
              checked={$appSettings.streaming.sendTipsInLobby}
              tooltipContent="Send tips in lobby."
              on:change={onInputChange}
            />
            <SettingsCheckbox
              key="sendTipsInDiscord"
              frontFacingName="Send Tips in Discord"
              checked={$appSettings.streaming.sendTipsInDiscord}
              tooltipContent="Send tips in Discord."
              on:change={onInputChange}
            />
          </div>
        </div>
      </div>
      <div class="row">
        <div class="col">
          {#if $appSettings.streaming.sendTipsInGame || $appSettings.streaming.sendTipsInLobby || $appSettings.streaming.sendTipsInDiscord}
            <label
              for="minInGameTip"
              class="form-label">Min for Tip Announce</label
            >
            <input
              type="number"
              id="minInGameTip"
              class="form-control"
              min="1"
              value={$appSettings.streaming.minInGameTip}
              on:change={e => updateNumber(e, 1)}
            />
          {/if}
        </div>
      </div>
    </div>
  {/if}
</form>
