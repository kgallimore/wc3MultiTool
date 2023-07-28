<script lang="ts">
  import {tooltip} from '@svelte-plugins/tooltips';

  import StyledButton from './StyledButton.svelte';
  import {gameState, clientState, windowData} from './../stores/page';
  import type {WindowSend} from '../../../utility';
  import type {MicroLobby, PlayerData} from 'wc3mt-lobby-container';
  import StyledHref from './StyledHref.svelte';

  export let structuredTeamData: [
    string,
    {
      name: string;
      slotStatus: 0 | 2 | 1;
      slot: number;
      realPlayer: boolean;
      data: PlayerData;
    }[],
  ][];
  export let lobby: MicroLobby;

  function toMain(args: WindowSend) {
    // @ts-ignore
    window.api.send('toMain', args);
  }
</script>

<div class="container-lg h-100">
  <div class="d-flex justify-content-center p-2">
    <span
      class="badge bg-primary"
      id="mainStatus"
    >
      {$windowData.updateStatus}
    </span>
  </div>
  <div class="content-center">
    <div class="flex justify-center">
      <div class="my-auto">
        <StyledHref
          label="Visit The Hub"
          href={'https://war.trenchguns.com'}
        />
      </div>
      <div class="my-auto">
        <StyledHref
          label="Discord"
          href={'https://discord.gg/yNAyJyE9V8'}
        />
      </div>
    </div>
  </div>

  <div class="d-flex justify-content-center pt-1">
    <details class="bg-primary rounded-2 m-1">
      <summary class="bg-secondary rounded-2 p-2">Advanced Status </summary>
      {#each Object.entries($gameState) as [key, value]}
        <div class="d-flex justify-content-center pt-1">
          {key}: {typeof value !== 'object' ? value : JSON.stringify(value)}
        </div>
      {/each}
      {#each Object.entries($clientState) as [key, value]}
        <div class="d-flex justify-content-center pt-1">
          {#if key === 'latestUploadedReplay'}
            Last uploaded replay: {new Date(value).toLocaleString()}
          {:else}
            {key}: {typeof value !== 'object' ? value : JSON.stringify(value)}
          {/if}
        </div>
      {/each}
    </details>
  </div>

  <h4>Current Step: <span />{$clientState.currentStep}</h4>
  <div class="progress">
    <div
      id="progressBar"
      class="progress-bar progress-bar-striped progress-bar-animated"
      role="progressbar"
      aria-valuenow={$clientState.currentStepProgress}
      style="width: {$clientState.currentStepProgress.toString()}%"
    />
  </div>

  <table class="table w-full">
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

  <div
    class="p-2 pr-6"
    id="tablesDiv"
  >
    {#if structuredTeamData}
      {#each structuredTeamData as [teamName, teamData]}
        <table class="table w-full border-b rounded-full border-wc3-yellow m-6">
          <thead class="border-b border-wc3-yellow">
            <tr>
              <th class="w-1/6">Actions</th>
              <th>{teamName} Players</th>
              <th class="w-1/3">ELO/Rank/Games/Wins/Losses</th>
            </tr>
          </thead>
          <tbody class="">
            {#each teamData as player}
              <tr class="odd:bg-[rgba(255,255,255,0.05)]">
                <td>
                  {#if player.slotStatus === 2 && player.realPlayer}
                    <div class="flex justify-center">
                      <StyledButton
                        size="sm"
                        color="red"
                        on:click={() =>
                          toMain({
                            messageType: 'addWhiteBan',
                            addWhiteBan: {
                              type: 'banList',
                              player: player.name,
                              reason: $windowData.banReason,
                            },
                          })}>Ban</StyledButton
                      >
                      <StyledButton
                        size="sm"
                        color="red"
                        disabled
                        on:click={() =>
                          toMain({
                            messageType: 'addWhiteBan',
                            addWhiteBan: {
                              type: 'banList',
                              player: player.name,
                              reason: $windowData.banReason,
                            },
                          })}>Kick</StyledButton
                      >
                    </div>
                  {/if}</td
                >

                <td>
                  {#if player.slotStatus === 2 && player.realPlayer}
                    <span
                      use:tooltip
                      title={player.data.joinedAt
                        ? new Date(player.data.joinedAt).toLocaleString(undefined, {
                            timeZone: 'UTC',
                            minute: '2-digit',
                            hour: '2-digit',
                          })
                        : ''}
                    >
                      {player.name}
                    </span>
                  {:else}
                    {player.name}
                  {/if}</td
                >
                <td
                  >{player.data.extra && player.data.extra.rating > -1
                    ? [
                        player.data.extra.rating,
                        player.data.extra.rank,
                        player.data.extra.played,
                        player.data.extra.wins,
                        player.data.extra.losses,
                      ].join(' / ')
                    : 'N/A'}</td
                >
              </tr>
            {/each}
          </tbody>
        </table>
      {/each}
    {/if}
  </div>
</div>
