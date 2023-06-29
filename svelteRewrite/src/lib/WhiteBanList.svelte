<script lang="ts">
  import type { BanWhiteList, WindowSend } from "../../../tsrc/utility";
  import type { FetchWhiteBanListSortOptions } from "../../../tsrc/modules/administration";
  import Radio from "./Radio.svelte";
  import CheckBox from "./SettingsCheckbox.svelte";
  import StyledButton from "./StyledButton.svelte";
  export let type: "banList" | "whiteList";
  export let list: {
    data: BanWhiteList;
    page: number;
  };
  export let toMain: (args: WindowSend) => void;
  let sort: FetchWhiteBanListSortOptions = "id";
  let sortOrder: "ASC" | "DESC" = "ASC";
  $: ascSort = sortOrder === "ASC";
  let activeOnly: boolean = false;
  let typeDisplay = type
    .split(/(?=[A-Z])/)
    .map((str, index) => (index === 0 ? str.charAt(0).toUpperCase() + str.slice(1) : str))
    .join(" ");
  function reFetch() {
    toMain({
      messageType: "fetchWhiteBanList",
      fetch: {
        page: list.page,
        type,
        sort,
        sortOrder,
        activeOnly,
      },
    });
  }
</script>

<div class="w-full text-center py-4">
  <div class="text-3xl">{typeDisplay}</div>
  <div class="flex text-sm w-fit m-auto pt-2">
    <StyledButton
      on:click={() => {
        toMain({
          messageType: "exportWhitesBans",
          exportImport: { type },
        });
      }}
    >
      Export
    </StyledButton>
    <StyledButton
      on:click={() => {
        toMain({
          messageType: "importWhitesBans",
          exportImport: { type },
        });
      }}
    >
      Import
    </StyledButton>
  </div>
</div>

<div class="w-full p-2 text-center border border-gray-500">
  <div class="text-xl p-2">Sort By</div>
  <div class="grid grid-cols-6">
    <Radio
      groupValue={sort}
      group="sort"
      value="id"
      display="ID"
      on:change={() => {
        sort = "id";
        reFetch();
      }}
    />
    <Radio
      groupValue={sort}
      group="sort"
      value="username"
      on:change={() => {
        sort = "username";
        reFetch();
      }}
    />
    <Radio
      groupValue={sort}
      group="sort"
      value="admin"
      on:change={() => {
        sort = "admin";
        reFetch();
      }}
    />
    <Radio
      groupValue={sort}
      group="sort"
      value="region"
      on:change={() => {
        sort = "region";
        reFetch();
      }}
    />
    <CheckBox
      key={type + "ascOrder"}
      frontFacingName="Ascending"
      bind:checked={ascSort}
      on:change={() => {
        ascSort ? "DESC" : "ASC";
        reFetch();
      }}
    />
    <CheckBox
      key={type + "activeOnly"}
      frontFacingName="Active Only"
      bind:checked={activeOnly}
      on:change={reFetch}
    />
  </div>
</div>
<div class="flex w-fit text-center m-auto">
  <StyledButton
    disabled={list.page === 0}
    on:click={() => {
      toMain({
        messageType: "fetchWhiteBanList",
        fetch: {
          page: list.page - 1,
          type,
          sort,
          sortOrder,
          activeOnly,
        },
      });
    }}
  >
    Previous Page
  </StyledButton>
  <StyledButton
    disabled={list.data?.length !== 10}
    on:click={() => {
      toMain({
        messageType: "fetchWhiteBanList",
        fetch: {
          page: list.page + 1,
          type,
          sort,
          sortOrder,
          activeOnly,
        },
      });
    }}
  >
    Next Page
  </StyledButton>
</div>
<table class="table w-full">
  <tr>
    <th>Username</th>
    <th>Date Added</th>
    <th>Admin</th>
    <th>Reason</th>
    <th>Removal</th>
  </tr>
  <tbody>
    {#each list.data as player}
      <tr>
        <td>{player.username}</td>
        <td>{player.add_date}</td>
        <td>{player.admin}</td>
        <td>{player.reason}</td>
        <td>
          {#if !player.removal_date}
            <button
              class="btn btn-primary"
              on:click={() => {
                toMain({
                  messageType: "removeWhiteBan",
                  removeWhiteBan: { type, player: player.username },
                });
                reFetch();
              }}
            >
              Remove
            </button>
          {:else}
            {player.removal_date}
          {/if}</td
        >
      </tr>
    {/each}
  </tbody>
</table>
