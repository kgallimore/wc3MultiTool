<script lang="ts">
  import WhiteBanList from "./WhiteBanList.svelte";
  import StyledButton from "./StyledButton.svelte";
  import {
    type BanWhiteList,
    type WindowSend,
    commandArray,
  } from "./../../../tsrc/utility";
  import { windowData } from "./../stores/page";

  export let lists: {
    whiteList: { data: BanWhiteList; page: number };
    banList: { data: BanWhiteList; page: number };
  };
  export let toMain: (data: WindowSend) => void;
</script>

<form class="border p-2">
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
    <div class="row justify-content-center p-2">
      <div class="col d-flex text-xs">
        <details>
          <summary>Permissions</summary><strong>Mod: </strong>
          {#each commandArray.filter(([command, details]) => details.minPermissions === "moderator") as [command, details]}
            ?{command}{details.arguments ? " " + details.arguments : ""}: {details.description}<br
            />
          {/each}
          <strong>Admin:</strong><br />
          {#each commandArray.filter(([command, details]) => details.minPermissions === "admin") as [command, details]}
            ?{command}{details.arguments ? " " + details.arguments : ""}: {details.description}<br
            />
          {/each}
        </details>
      </div>
    </div>
  </div>
</form>
<WhiteBanList type="whiteList" list={lists.whiteList} {toMain} />
<WhiteBanList type="banList" list={lists.banList} {toMain} />
