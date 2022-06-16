<script type="ts">
  import type { BanWhiteList, WindowSend } from "../../../tsrc/utility";
  import type { FetchWhiteBanListSortOptions } from "../../../tsrc/modules/administration";
  export let type: "banList" | "whiteList";
  export let list: {
    data: Array<BanWhiteList>;
    page: number;
  };
  export let toMain: (args: WindowSend) => void;
  let sort: FetchWhiteBanListSortOptions = "id";
  let sortOrder: "ASC" | "DESC" = "ASC";
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

<div class="modal fade" id={type + "Modal"} tabindex="-1" aria-hidden="true">
  <div class="modal-dialog modal-lg">
    <div class="modal-content">
      <div class="modal-header">
        <h5 class="modal-title">{typeDisplay}</h5>
        <button
          type="button"
          class="btn-close"
          data-bs-dismiss="modal"
          aria-label="Close"
        />
      </div>
      <div class="modal-body">
        <div class="w-full text-center">
          <button
            class="btn btn-primary"
            on:click={() => {
              toMain({
                messageType: "exportWhitesBans",
                exportImport: { type },
              });
            }}
          >
            Export {typeDisplay} to Documents
          </button>
          <button
            class="btn btn-primary"
            on:click={() => {
              toMain({
                messageType: "importWhitesBans",
                exportImport: { type },
              });
            }}
          >
            Import {typeDisplay}
          </button>
        </div>
        <div class="w-full text-center">
          <button
            class="btn btn-primary"
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
          </button>
          Page: {list.page}
          <button
            class="btn btn-primary"
            disabled={list.data.length !== 10}
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
          </button>
        </div>
        <div class="w-full text-center">
          Sort:
          <div class="form-check form-check-inline">
            <input
              type="radio"
              bind:group={sort}
              on:change={reFetch}
              name={type + "Sort"}
              value="id"
              id={type + "SortID"}
            />
            <label class="form-check-label" for={type + "SortID"}> ID </label>
          </div>
          <div class="form-check form-check-inline">
            <input
              type="radio"
              bind:group={sort}
              on:change={reFetch}
              name={type + "Sort"}
              value="username"
              id={type + "SortUsername"}
            />
            <label class="form-check-label" for={type + "SortUsername"}> Username </label>
          </div>
          <div class="form-check form-check-inline">
            <input
              type="radio"
              bind:group={sort}
              on:change={reFetch}
              name={type + "Sort"}
              value="admin"
              id={type + "SortAdmin"}
            />
            <label class="form-check-label" for={type + "SortAdmin"}> Admin </label>
          </div>
          <div class="form-check form-check-inline">
            <input
              type="radio"
              bind:group={sort}
              on:change={reFetch}
              name={type + "Sort"}
              value="region"
              id={type + "SortRegion"}
            />
            <label class="form-check-label" for={type + "SortRegion"}> Region </label>
          </div>
          <br />
          <div class="form-check form-check-inline">
            <input
              type="radio"
              bind:group={sortOrder}
              on:change={reFetch}
              name={type + "SortOrder"}
              value="ASC"
              id={type + "SortOrderASC"}
            />
            <label class="form-check-label" for={type + "SortOrderASC"}> Asc </label>
          </div>
          <div class="form-check form-check-inline">
            <input
              type="radio"
              bind:group={sortOrder}
              on:change={reFetch}
              name={type + "SortOrder"}
              value="DESC"
              id={type + "SortOrderDESC"}
            />
            <label class="form-check-label" for={type + "SortOrderDESC"}> Desc </label>
          </div>
          <div class="form-check form-check-inline">
            <input
              type="checkbox"
              bind:checked={activeOnly}
              on:change={reFetch}
              name={type + "activeOnly"}
              id={type + "activeOnly"}
            />
            <label class="form-check-label" for={type + "activeOnly"}>
              Active Only
            </label>
          </div>
        </div>
        <table class="table table-sm table-striped table-hover">
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
      </div>
    </div>
  </div>
</div>
