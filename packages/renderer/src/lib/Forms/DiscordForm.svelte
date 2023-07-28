<script lang="ts">
  import TitleDeco from '../../title-deco.png';

  import SettingsCheckbox from './../SettingsCheckbox.svelte';
  import SettingsTextInput from './../SettingsTextInput.svelte';
  import {appSettings} from './../../stores/page';
  export let onInputChange: (
    e:
      | (Event & {
          currentTarget: EventTarget & HTMLSelectElement;
        })
      | (Event & {
          currentTarget: EventTarget & HTMLInputElement;
        }),
  ) => void;
</script>

<form
  name="discord"
  class="p-2"
>
  <div class="d-flex justify-content-center text-4xl text-active-text">
    <!-- svelte-ignore a11y-missing-attribute -->
    <img
      class="float-left p-2"
      src={TitleDeco}
    />
    <span class="flex-1">Discord</span>
  </div>
  <div class="row">
    <div class="col">
      <div class="d-flex justify-content-center">
        <SettingsCheckbox
          key="discordEnabled"
          frontFacingName="Discord Integration"
          checked={$appSettings.discord.enabled}
          on:change={onInputChange}
        />
      </div>
    </div>
  </div>
  {#if $appSettings.discord.enabled}
    <div class="border m-2 p-2">
      <div class="row">
        <div class="col d-flex justify-content-center">Discord Settings</div>
        <div class="row">
          <div class="col d-flex justify-content-center">1 Discord bot per client</div>
        </div>
        <div class="row">
          <div class="col d-flex justify-content-center"> (If not, slash cmds will break.) </div>
        </div>

        <div class="row">
          <SettingsTextInput
            frontFacingName="Custom Name (For Multi. Clients, future use)"
            key="customName"
            value={$appSettings.discord.customName}
            on:change={onInputChange}
          />
        </div>
        <div class="row">
          <div class="col">
            <label for="discordToken">Token</label>
            <input
              type="password"
              class="form-control"
              id="discordToken"
              placeholder="Token"
              value={$appSettings.discord.token}
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
              value={$appSettings.discord.announceChannel}
              on:change={onInputChange}
            />
          </div>
        </div>
        <div class="row">
          {#if !$appSettings.discord.useThreads}
            <div class="col">
              <label for="discordChannel">Lobby Chat Channel</label>
              <input
                type="text"
                class="form-control"
                id="discordChatChannel"
                placeholder="Name or ID"
                value={$appSettings.discord.chatChannel}
                on:change={onInputChange}
              />
            </div>
          {/if}
          <div class="col-auto m-auto">
            <SettingsCheckbox
              key="useThreads"
              frontFacingName="Use Threads For Chat"
              checked={$appSettings.discord.useThreads}
              tooltipContent="Will use threads on each lobby announcement for chat instead of a separate channel"
              on:change={onInputChange}
            />
          </div>
        </div>
        <div class="row">
          <div class="col d-flex justify-content-center">
            Users within the channel or with the role will have admin permissions
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
              value={$appSettings.discord.adminChannel}
              on:change={onInputChange}
            />
          </div>
          {#if $appSettings.discord.adminChannel}
            <div class="col-auto">
              <label for="logLevel">Log Level</label>
              <select
                id="logLevel"
                class="form-select"
                value={$appSettings.discord.logLevel}
                on:change={onInputChange}
              >
                <option
                  value="off"
                  selected>Disabled</option
                >
                <option value="warn">Warnings</option>
                <option value="error">Errors</option>
              </select>
            </div>
          {/if}
        </div>
        <div class="row">
          <SettingsTextInput
            frontFacingName="Admin Role"
            key="adminRole"
            placeholder="Role name for admins"
            value={$appSettings.discord.adminRole}
            on:change={onInputChange}
          />
        </div>
      </div>
      <div class="row">
        <div class="col">
          <div class="d-flex justify-content-center">
            <div
              class="btn-group btn-group-sm w-100 py-1"
              role="group"
            >
              <SettingsCheckbox
                frontFacingName="Bidirectional Chat"
                key="bidirectionalChat"
                checked={$appSettings.discord.bidirectionalChat}
                tooltipContent="Users may send messages to the to the lobby from the Discord channel."
                on:change={onInputChange}
              />
              {#if $appSettings.discord.bidirectionalChat && ($appSettings.autoHost.type !== 'smartHost' || $appSettings.autoHost.leaveAlternate === false)}
                <SettingsCheckbox
                  frontFacingName="Send Chat in Game"
                  key="sendInGameChat"
                  checked={$appSettings.discord.sendInGameChat}
                  tooltipContent="Users may send messages during game from the Discord channel. Not recommended."
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
