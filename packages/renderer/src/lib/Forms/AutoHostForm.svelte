<script lang="ts">
  import TitleDeco from '../../../assets/title-deco.png';
  import CloseSlot from '../CloseSlot.svelte';
  import SettingsCheckbox from '../SettingsCheckbox.svelte';
  import {appSettings} from '../../stores/page';
  import {type WindowSend, getTargetRegion} from '../../../../main/src/utility';
  import type {AppSettings, SettingsKeys} from '../../../../main/src/globals/settings';
  import SettingsTextInput from '../SettingsTextInput.svelte';
  export let onInputChange: (
    e:
      | KeyboardEvent
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
    min?: number,
  ) => void;
  export let toMain: (args: WindowSend) => void;
  export let updateSettingSingle: (
    setting: keyof AppSettings,
    key: SettingsKeys,
    value: boolean | string | number,
    slot?: number | null,
  ) => void;
  let utcTime =
    ('0' + new Date().getUTCHours().toString()).slice(-2) +
    ':' +
    ('0' + new Date().getUTCMinutes().toString()).slice(-2);
  setInterval(() => {
    utcTime =
      ('0' + new Date().getUTCHours().toString()).slice(-2) +
      ':' +
      ('0' + new Date().getUTCMinutes().toString()).slice(-2);
  }, 60000);

  $: region = getTargetRegion(
    $appSettings.autoHost.regionChangeTimeEU,
    $appSettings.autoHost.regionChangeTimeNA,
  );

  $: botAnnouncement = `Welcome. I am a bot. ${
    $appSettings.elo.available && $appSettings.elo.type !== 'off'
      ? `I will fetch ELO from ${$appSettings.elo.type}. ${
          $appSettings.elo.balanceTeams ? 'I will try to balance teams before we start.' : ''
        }`
      : ''
  }${
    ($appSettings.elo.type === 'off' || !$appSettings.elo.balanceTeams) &&
    $appSettings.autoHost.shufflePlayers
      ? 'I will shuffle players before we start.'
      : ''
  } ${
    ['smartHost', 'rapidHost'].includes($appSettings.autoHost.type)
      ? $appSettings.autoHost.minPlayers < 1
        ? 'I will start when slots are full.'
        : 'I will start with ' + $appSettings.autoHost.minPlayers + ' players.'
      : ''
  } ${$appSettings.autoHost.voteStart ? ' You can vote start with ?votestart' : ''}`;
</script>

<form
  name="autoHost"
  class="p-2"
>
  <div class="d-flex justify-content-center text-4xl text-active-text">
    <!-- svelte-ignore a11y-missing-attribute -->
    <img
      class="float-left p-2"
      src={TitleDeco}
    />
    <span class="flex-1">Auto Host</span>
  </div>
  <div class="row">
    <div class="col">
      <label
        for="autoHostState"
        class="form-label"
      >
        <details>
          <summary>Auto Host Details (click to expand)</summary><strong>Lobby Host:</strong>
          Starts a lobby with specified settings.<br />
          <strong>Rapid Host:</strong> Hosts lobbies, auto starts, leaves the game after specified
          timer(minutes). (-1 will force quit at loading screen)<br />
          <strong>Smart Host:</strong> Hosts lobbies, auto starts, quits the game if you use the
          wc3mt lib (see discord), with a fallback to attempting to see if this screen opens(OCR,
          unreliable):
          <img
            class="img-fluid"
            src="quitNormal.png"
            alt="Quit Normal"
          />
          Intrusive Check will check the chat menu to see if anyone else is left.
        </details>
      </label>
      <select
        id="autoHostType"
        class="form-select"
        value={$appSettings.autoHost.type}
        on:change={onInputChange}
      >
        <option value="off">Disabled</option>
        <option value="lobbyHost">Lobby Host: Host but don't autostart</option>
        <option value="rapidHost">Rapid Host: Leave after time</option>
        <option value="smartHost">Smart Host: Use OCR to detect game end</option>
      </select>
    </div>
  </div>

  {#if $appSettings.autoHost.type !== 'off'}
    <div
      id="autoHostSettings"
      class="border m-2"
    >
      <div class="row p-2">
        <div class="col">
          <div class="grid grid-cols-3">
            <SettingsCheckbox
              key="private"
              frontFacingName="Private Lobbies"
              checked={$appSettings.autoHost.private}
              tooltipContent="Will host private lobbies."
              on:change={onInputChange}
            />
            <SettingsCheckbox
              key="increment"
              frontFacingName="Incremental Lobbies"
              checked={$appSettings.autoHost.increment}
              tooltipContent="Will append the current game number to end of the lobby name."
              on:change={onInputChange}
            />
            <SettingsCheckbox
              frontFacingName="Sound Notifications"
              key="sounds"
              checked={$appSettings.autoHost.sounds}
              tooltipContent="Will play sounds when a game is full, when a game loads in, and when a game ends."
              on:change={onInputChange}
            />
            <SettingsCheckbox
              frontFacingName="Move to Spec/Host/Team"
              key="moveToSpec"
              checked={$appSettings.autoHost.moveToSpec}
              tooltipContent="Will move the local user to a spectator slot upon joining the lobby."
              on:change={onInputChange}
            />
            <SettingsCheckbox
              frontFacingName="Custom Announcement"
              key="announceCustom"
              checked={$appSettings.autoHost.announceCustom}
              tooltipContent="Will announce custom text to the lobby."
              on:change={onInputChange}
            />
            {#if ['rapidHost', 'smartHost'].includes($appSettings.autoHost.type)}
              <SettingsCheckbox
                frontFacingName="Announce Is Bot"
                key="announceIsBot"
                checked={$appSettings.autoHost.announceIsBot}
                tooltipContent="Will announce if the local user is a bot. You can check the message below."
                on:change={onInputChange}
              />
              <SettingsCheckbox
                frontFacingName="Vote start"
                key="voteStart"
                checked={$appSettings.autoHost.voteStart}
                tooltipContent="Will allow users to vote to start the game."
                on:change={onInputChange}
              />
              {#if $appSettings.elo.type === 'off' || !$appSettings.elo.balanceTeams}
                <SettingsCheckbox
                  frontFacingName="Shuffle Players"
                  key="shufflePlayers"
                  checked={$appSettings.autoHost.shufflePlayers}
                  tooltipContent="Shuffles players randomly before starting."
                  on:change={onInputChange}
                />
              {/if}
              {#if $appSettings.autoHost.voteStart}
                <SettingsCheckbox
                  frontFacingName="Require All Teams for Votestart"
                  key="voteStartTeamFill"
                  checked={$appSettings.autoHost.voteStartTeamFill}
                  tooltipContent="Will require all teams to have at least 1 player before players can vote start."
                  on:change={onInputChange}
                />
              {/if}
              {#if $appSettings.autoHost.type === 'smartHost' && $appSettings.autoHost.moveToSpec && $appSettings.autoHost.observers}
                <SettingsCheckbox
                  frontFacingName="Intrusive check"
                  key="leaveAlternate"
                  checked={$appSettings.autoHost.leaveAlternate}
                  tooltipContent="Queries the chat menu periodically in game in order to attempt to see if there are any other players left in lobby. Note: this still will not guarantee that it games will be left successfully due to a minor WC3 bug."
                  on:change={onInputChange}
                />
              {/if}
            {/if}
            <SettingsCheckbox
              key="advancedMapOptions"
              frontFacingName="Advanced Map Options"
              checked={$appSettings.autoHost.advancedMapOptions}
              tooltipContent="Will show advanced map options."
              on:change={onInputChange}
            />
            <SettingsCheckbox
              key="whitelist"
              frontFacingName="Whitelist"
              checked={$appSettings.autoHost.whitelist}
              tooltipContent="Only allow certain players to join."
              on:change={onInputChange}
            />
          </div>
        </div>

        {#if $appSettings.autoHost.advancedMapOptions}
          <div class="col">
            <div class="grid grid-cols-2">
              <SettingsCheckbox
                key="flagLockTeams"
                frontFacingName="Lock Teams"
                checked={$appSettings.autoHost.flagLockTeams}
                on:change={onInputChange}
              />
              <SettingsCheckbox
                key="flagFullSharedUnitControl"
                frontFacingName="Full Shared Unit Control"
                checked={$appSettings.autoHost.flagFullSharedUnitControl}
                on:change={onInputChange}
              />
              <SettingsCheckbox
                key="flagPlaceTeamsTogether"
                frontFacingName="Place Teams Together"
                checked={$appSettings.autoHost.flagPlaceTeamsTogether}
                on:change={onInputChange}
              />
              <SettingsCheckbox
                key="flagRandomRaces"
                frontFacingName="Random Races"
                checked={$appSettings.autoHost.flagRandomRaces}
                on:change={onInputChange}
              />
              <label for="observers">Add observers:</label>
              <select
                class="form-control form-control-sm"
                id="observers"
                value={$appSettings.autoHost.observers}
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
              value={$appSettings.autoHost.settingVisibility}
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
            on:click={() => toMain({messageType: 'getMapPath'})}
            type="button"
            class="btn btn-primary"
            id="autoHostMapPath"
            >Current Map:
          </button>
          <span>{$appSettings.autoHost.mapPath}</span>
        </div>
      </div>
      <div class="row p-2">
        <div class="col">
          <SettingsTextInput
            type="text"
            key="gameName"
            frontFacingName="Game Name"
            value={$appSettings.autoHost.gameName}
            maxlength={27}
            minlength={3}
            on:keydown={e => {
              if (e.key === 'Enter') {
                onInputChange(e);
              }
            }}
            on:change={onInputChange}
          />
        </div>
      </div>

      <div class="row p-2">
        <div class="col">
          <SettingsTextInput
            type="number"
            key="delayStart"
            frontFacingName="Delay Start"
            minlength={0}
            maxlength={30}
            value={$appSettings.autoHost.delayStart}
            on:change={updateNumber}
          />
        </div>
        {#if ['rapidHost', 'smartHost'].includes($appSettings.autoHost.type)}
          <div class="col">
            <SettingsTextInput
              type="number"
              key="minPlayers"
              frontFacingName="Min Players to Autostart"
              minlength={0}
              maxlength={24}
              value={$appSettings.autoHost.minPlayers}
              on:change={updateNumber}
            />
          </div>
        {/if}
      </div>
      {#if $appSettings.autoHost.moveToSpec}
        <div class="row p-2">
          <div class="col">
            <SettingsTextInput
              type="text"
              key="moveToTeam"
              frontFacingName="Target Team Name (Blank for Auto)"
              minlength={0}
              maxlength={30}
              value={$appSettings.autoHost.moveToTeam}
              on:change={updateNumber}
              on:keydown={e => {
                if (e.key === 'Enter') {
                  onInputChange(e);
                }
              }}
            />
          </div>
        </div>
      {/if}
      <div class="row p-2">
        <div class="col">
          Close Slots:
          <div class="w-100 py-1 grid grid-cols-12">
            {#each Array.from(Array(12).keys()) as i}
              <CloseSlot
                checked={$appSettings.autoHost.closeSlots.includes(i) ?? false}
                on:change={e => {
                  updateSettingSingle(
                    'autoHost',
                    'closeSlots',
                    // @ts-expect-error This is an input current target
                    e.currentTarget.checked,
                    i,
                  );
                }}
                number={(i + 1).toString()}
              />
            {/each}
          </div>
          <div class="w-100 py-1 grid grid-cols-12">
            {#each Array.from(Array(12).keys()) as i}
              <CloseSlot
                checked={$appSettings.autoHost.closeSlots.includes(i + 12) ?? false}
                on:change={e => {
                  updateSettingSingle(
                    'autoHost',
                    'closeSlots',
                    // @ts-expect-error This is an input current target
                    e.target.checked,
                    i + 12,
                  );
                }}
                number={(i + 13).toString()}
              />
            {/each}
          </div>
        </div>
      </div>
      <div class="row p-2">
        {#if $appSettings.autoHost.voteStart && ['rapidHost', 'smartHost'].includes($appSettings.autoHost.type)}
          <div class="col">
            <SettingsTextInput
              type="number"
              key="voteStartPercent"
              frontFacingName="Vote Start Percentage"
              minlength={5}
              maxlength={100}
              value={$appSettings.autoHost.voteStartPercent}
              on:change={e =>
                updateSettingSingle(
                  'autoHost',
                  'voteStartPercent',
                  // @ts-expect-error This is an input current target
                  Math.min(Math.max(parseInt(e.currentTarget.value), 5), 100),
                )}
            />
          </div>
        {/if}
        {#if $appSettings.autoHost.type === 'rapidHost'}
          <div class="col">
            <label
              for="rapidHostTimer"
              class="form-label">Rapid Host Timer</label
            >
            <input
              type="number"
              id="rapidHostTimer"
              class="form-control"
              min="-1"
              max="360"
              value={$appSettings.autoHost.rapidHostTimer}
              on:change={onInputChange}
            />
          </div>
        {/if}
      </div>
      {#if ($appSettings.autoHost.announceIsBot && ['rapidHost', 'smartHost'].includes($appSettings.autoHost.type)) || $appSettings.autoHost.announceCustom}
        <div class="row p-2">
          <div class="col">
            <h4>Bot Announcement:</h4>
            {#if $appSettings.autoHost.announceIsBot && ['rapidHost', 'smartHost'].includes($appSettings.autoHost.type)}
              <span>{botAnnouncement}</span>
            {/if}
            {#if $appSettings.autoHost.announceCustom}
              <p>{$appSettings.autoHost.customAnnouncement}</p>
            {/if}
          </div>
        </div>
      {/if}
      {#if $appSettings.autoHost.announceCustom}
        <div class="row p-2">
          <div class="col">
            <label
              for="customAnnouncement"
              class="form-label">Custom Announcement</label
            >
            <input
              type="text"
              id="customAnnouncement"
              class="form-control"
              maxlength="120"
              placeholder="120 Character Max"
              value={$appSettings.autoHost.customAnnouncement}
              on:change={onInputChange}
            />
          </div>
        </div>
      {/if}
      {#if ($appSettings.autoHost.announceIsBot && ['rapidHost', 'smartHost'].includes($appSettings.autoHost.type)) || $appSettings.autoHost.announceCustom}
        <div class="row p-2">
          <div class="col">
            <label
              for="announceRestingInterval"
              class="form-label">Minimum seconds between announcements</label
            >
            <input
              type="number"
              id="announceRestingInterval"
              class="form-control"
              min="0"
              max="600"
              value={$appSettings.autoHost.announceRestingInterval}
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
            value={$appSettings.autoHost.regionChangeType}
            on:change={onInputChange}
          >
            <option
              value="off"
              selected>Off</option
            >
            <option
              disabled={$appSettings.client.alternateLaunch}
              value="realm">Bnet Realm</option
            >
            <option value="openVPN">OpenVPN</option>
            <option
              disabled={$appSettings.client.alternateLaunch}
              value="both">Both</option
            >
          </select>
        </div>
      </div>
      {#if $appSettings.autoHost.regionChangeType !== 'off'}
        <div class="row p-2">
          <div class="col flex text-center">
            Current UTC time is: {utcTime}
            Target: {region}
          </div>
        </div>
        {#if $appSettings.autoHost.regionChangeType === 'both' || $appSettings.autoHost.regionChangeType === 'openVPN'}
          <div class="row p-2">
            <div class="col">
              <button
                on:click={() => toMain({messageType: 'getOpenVPNPath'})}
                type="button"
                class="btn btn-sm {$appSettings.autoHost.openVPNPath
                  ? 'btn-primary'
                  : 'btn-danger'}"
                id="openVPNPath"
                >OpenVPN-GUI.exe Path:
              </button>
              <span class={$appSettings.autoHost.openVPNPath ? '' : 'alert-warning'}
                >{$appSettings.autoHost.openVPNPath || 'Please set a path.'}</span
              >
            </div>
          </div>
          <div class="row p-2">
            <div class="col">
              <label
                for="regionChangeOpenVPNConfigNA"
                class="form-label">NA OVPN File Name</label
              >
              <input
                type="text"
                id="regionChangeOpenVPNConfigNA"
                class="form-control"
                placeholder="With or without extension"
                value={$appSettings.autoHost.regionChangeOpenVPNConfigNA}
                on:change={onInputChange}
              />
            </div>
            <div class="col">
              <label
                for="regionChangeOpenVPNConfigEU"
                class="form-label">EU OVPN File Name</label
              >
              <input
                type="text"
                id="regionChangeOpenVPNConfigEU"
                class="form-control"
                placeholder="With or without extension"
                value={$appSettings.autoHost.regionChangeOpenVPNConfigEU}
                on:change={onInputChange}
              />
            </div>
          </div>
        {/if}
        <div class="row p-2">
          <div class="col">
            <label
              for="regionChangeTimeNA"
              class="form-label">UTC time to swap to NA</label
            >
            <input
              type="time"
              id="regionChangeTimeNA"
              class="form-control"
              value={$appSettings.autoHost.regionChangeTimeNA}
              on:change={onInputChange}
            />
          </div>
          <div class="col">
            <label
              for="regionChangeTimeEU"
              class="form-label">UTC time to swap to EU</label
            >
            <input
              type="time"
              id="regionChangeTimeEU"
              class="form-control"
              value={$appSettings.autoHost.regionChangeTimeEU}
              on:change={onInputChange}
            />
          </div>
        </div>
      {/if}
    </div>
  {/if}
</form>
