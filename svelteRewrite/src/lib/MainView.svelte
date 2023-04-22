<script lang="ts">
  import { gameState, clientState, windowData } from "./../stores/page";
  import type { WindowSend, BanWhiteList } from "../../../tsrc/utility";
  import type { MicroLobby, PlayerData } from "wc3mt-lobby-container";

  export let banList: {
    data: BanWhiteList;
    page: number;
  };
  export let whiteList: {
    data: BanWhiteList;
    page: number;
  };
  export let structuredTeamData: [
    string,
    {
      name: string;
      slotStatus: 0 | 2 | 1;
      slot: number;
      realPlayer: boolean;
      data: PlayerData;
    }[]
  ][];
  export let lobby: MicroLobby;

  function toMain(args: WindowSend) {
    // @ts-ignore
    window.api.send("toMain", args);
  }
</script>

<div class="container-lg h-100">
  <div class="d-flex justify-content-center p-2">
    <span class="badge bg-primary" id="mainStatus">
      {$windowData.updateStatus}
    </span>
  </div>
  <div class="d-flex justify-content-center pt-1">
    <button
      on:click={() => toMain({ messageType: "openLogs" })}
      type="button"
      class="btn btn-primary"
      id="logsButton"
    >
      Open Logs
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
      {#each Object.entries($gameState) as [key, value]}
        <div class="d-flex justify-content-center pt-1">
          {key}: {typeof value !== "object" ? value : JSON.stringify(value)}
        </div>
      {/each}
      {#each Object.entries($clientState) as [key, value]}
        <div class="d-flex justify-content-center pt-1">
          {key}: {typeof value !== "object" ? value : JSON.stringify(value)}
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
  <form class="border p-2">
    {#if $windowData.lastAction}
      <div class="alert alert-warning alert-dismissible fade show" role="alert">
        {$windowData.lastAction}<button
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
          bind:value={$windowData.battleTag}
        />
      </div>
      <div class="col-6">
        <input
          type="text"
          class="form-control"
          placeholder="Ban Reason"
          bind:value={$windowData.banReason}
        />
      </div>
    </div>
    <div class="row justify-content-center p-2">
      <div class="col d-flex justify-content-center">
        <div class="btn-group btn-group-sm">
          <!-- svelte-ignore a11y-click-events-have-key-events -->
          <submit
            class="btn btn-danger"
            type="submit"
            on:click={() =>
              toMain({
                messageType: "addWhiteBan",
                addWhiteBan: {
                  type: "banList",
                  player: $windowData.battleTag,
                  reason: $windowData.banReason,
                },
              })}
          >
            Ban
          </submit>
          <!-- svelte-ignore a11y-click-events-have-key-events -->

          <submit
            class="btn btn-success"
            type="submit"
            on:click={() =>
              toMain({
                messageType: "removeWhiteBan",
                removeWhiteBan: { type: "banList", player: $windowData.battleTag },
              })}
          >
            UnBan
          </submit>
        </div>
        <div class="btn-group btn-group-sm">
          <!-- svelte-ignore a11y-click-events-have-key-events -->

          <submit
            class="btn btn-success"
            type="submit"
            on:click={() =>
              toMain({
                messageType: "addWhiteBan",
                addWhiteBan: {
                  type: "whiteList",
                  player: $windowData.battleTag,
                  reason: $windowData.banReason,
                },
              })}
          >
            WhiteList
          </submit>
          <!-- svelte-ignore a11y-click-events-have-key-events -->

          <submit
            class="btn btn-danger"
            type="submit"
            on:click={() =>
              toMain({
                messageType: "removeWhiteBan",
                removeWhiteBan: { type: "whiteList", player: $windowData.battleTag },
              })}
          >
            UnWhiteList
          </submit>
        </div>
        <div class="btn-group btn-group-sm">
          <!-- svelte-ignore a11y-click-events-have-key-events -->

          <submit
            class="btn btn-primary"
            type="submit"
            on:click={() =>
              toMain({
                messageType: "changePerm",
                perm: { player: $windowData.battleTag, role: "moderator" },
              })}
          >
            Mod
          </submit>
          <!-- svelte-ignore a11y-click-events-have-key-events -->

          <submit
            class="btn btn-warning"
            type="submit"
            on:click={() =>
              toMain({
                messageType: "changePerm",
                perm: { player: $windowData.battleTag, role: "admin" },
              })}
          >
            Admin
          </submit>
          <!-- svelte-ignore a11y-click-events-have-key-events -->

          <submit
            class="btn btn-danger"
            type="submit"
            on:click={() =>
              toMain({
                messageType: "changePerm",
                perm: { player: $windowData.battleTag, role: "" },
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
                            reason: $windowData.banReason,
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
  </div>
</div>
