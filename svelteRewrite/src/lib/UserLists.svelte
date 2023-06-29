<script lang="ts">
  import WhiteBanList from "./WhiteBanList.svelte";
  import StyledButton from "./StyledButton.svelte";
  import type { BanWhiteList, WindowSend } from "./../../../tsrc/utility";
  import { windowData } from "./../stores/page";

  export let lists: {
    whiteList: { data: BanWhiteList; page: number };
    banList: { data: BanWhiteList; page: number };
  };
  export let toMain: (data: WindowSend) => void;
</script>

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
      <div class="grid grid-cols-3">
        <div class="order-1">
          <StyledButton
            color="red"
            on:click={() =>
              toMain({
                messageType: "addWhiteBan",
                addWhiteBan: {
                  type: "banList",
                  player: $windowData.battleTag,
                  reason: $windowData.banReason,
                },
              })}>Ban</StyledButton
          >
        </div>
        <div class="order-4">
          <StyledButton
            on:click={() =>
              toMain({
                messageType: "removeWhiteBan",
                removeWhiteBan: { type: "banList", player: $windowData.battleTag },
              })}>Unban</StyledButton
          >
        </div>
        <div class="order-2">
          <StyledButton
            color="red"
            on:click={() =>
              toMain({
                messageType: "removeWhiteBan",
                removeWhiteBan: { type: "whiteList", player: $windowData.battleTag },
              })}
          >
            UnWhiteList
          </StyledButton>
        </div>
        <div class="order-5">
          <StyledButton
            color="green"
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
          </StyledButton>
        </div>

        <div class="order-3">
          <StyledButton
            on:click={() =>
              toMain({
                messageType: "changePerm",
                perm: { player: $windowData.battleTag, role: "moderator" },
              })}
          >
            Mod
          </StyledButton>
        </div>
        <div class="order-6">
          <StyledButton
            on:click={() =>
              toMain({
                messageType: "changePerm",
                perm: { player: $windowData.battleTag, role: "admin" },
              })}
          >
            Admin
          </StyledButton>
        </div>
        <div class="order-7 col-span-3">
          <div class="m-auto">
            <StyledButton
              color="red"
              on:click={() =>
                toMain({
                  messageType: "changePerm",
                  perm: { player: $windowData.battleTag, role: "" },
                })}
            >
              Remove Perms
            </StyledButton>
          </div>
        </div>
      </div>
    </div>
    <!-- <div class="row">
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
    </div> -->
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
  </div>
</form>
<WhiteBanList type="whiteList" list={lists.whiteList} {toMain} />
<WhiteBanList type="banList" list={lists.banList} {toMain} />
