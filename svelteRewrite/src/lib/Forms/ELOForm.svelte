<script lang="ts">
  import TitleDeco from "./../../assets/keepitmoving/title-deco.png";

  import SettingsCheckbox from "./../SettingsCheckbox.svelte";
  import SettingsTextInput from "./../SettingsTextInput.svelte";
  import { appSettings } from "./../../stores/page";
  export let onInputChange: (
    e:
      | (Event & {
          currentTarget: EventTarget & HTMLSelectElement;
        })
      | (Event & {
          currentTarget: EventTarget & HTMLInputElement;
        })
  ) => void;
  export let updateNumber: (
    e:
      | (Event & {
          currentTarget: EventTarget & HTMLInputElement;
        })
      | (Event & {
          currentTarget: EventTarget & HTMLSelectElement;
        }),
    min?: number
  ) => void;

  let wc3statsOptions = wc3EloModes($appSettings.elo.lookupName);
  async function wc3EloModes(lookupName: string): Promise<
    Array<{
      key: { mode: string; season: string; round: string; ladder: string };
    }>
  > {
    let stats = await fetch("https://api.wc3stats.com/maps/" + lookupName);
    let data = await stats.json();
    if (data.body.variants) {
      return data.body.variants[0].stats;
    }
    return [];
  }
</script>

<form name="elo" class="p-2">
  <div class="d-flex justify-content-center text-4xl text-active-text">
    <!-- svelte-ignore a11y-missing-attribute -->
    <img class="float-left p-2" src={TitleDeco} />
    <span class="flex-1">ELO</span>
  </div>
  <div class="row">
    <div class="col">
      <label for="eloType" class="form-label"> ELO Lookup</label>
      <select
        id="eloType"
        class="form-select"
        value={$appSettings.elo.type}
        on:change={onInputChange}
      >
        <option value="off">Disabled</option>
        <option value="wc3stats">wc3stats.com</option>
        <option value="mariadb">MariaDB</option>
        <option value="mysql">MySQL</option>
        <option value="sqlite">Sqlite</option>
        <option value="random">Random (Test mode)</option>
      </select>
    </div>
  </div>
  {#if $appSettings.elo.type !== "off"}
    <div id="eloSettings" class="border p-2">
      <div class="row">
        <div class="col">
          {#if ["mysql", "mariadb"].includes($appSettings.elo.type)}
            <div class="row">
              <div class="col">
                <label for="dbIP">Database Address</label>
                <input
                  type="text"
                  class="form-control"
                  id="dbIP"
                  placeholder=""
                  value={$appSettings.elo.dbIP}
                  on:change={onInputChange}
                />
              </div>
              <div class="col">
                <label for="dbPort">Database Port</label>
                <input
                  type="number"
                  class="form-control"
                  id="dbPort"
                  min="20"
                  max="25565"
                  value={$appSettings.elo.dbPort}
                  on:change={(e) => updateNumber(e, 20)}
                />
              </div>
            </div>
            <div class="row">
              <SettingsTextInput
                frontFacingName="Database User"
                key="dbUser"
                value={$appSettings.elo.dbUser}
                on:change={onInputChange}
              />
              <SettingsTextInput
                frontFacingName="Database Pass"
                placeholder="Password"
                key="dbPassword"
                value={$appSettings.elo.dbPassword}
                on:change={onInputChange}
              />
            </div>
            <div class="row">
              <SettingsTextInput
                frontFacingName="Databse Name"
                key="dbName"
                value={$appSettings.elo.dbName}
                on:change={onInputChange}
              />
            </div>
          {:else if $appSettings.elo.type === "sqlite"}
            <div class="row">
              <SettingsTextInput
                frontFacingName="Sqlite Path"
                key="sqlitePath"
                placeholder="Absolute Path"
                value={$appSettings.elo.sqlitePath}
                on:change={onInputChange}
              />
            </div>
          {/if}
          {#if ["mysql", "mariadb", "sqlite"].includes($appSettings.elo.type)}
            <div class="row">
              <div class="col">
                <label for="dbDefaultElo">Default Elo</label>
                <input
                  type="number"
                  class="form-control"
                  id="dbDefaultElo"
                  placeholder="0 for none"
                  value={$appSettings.elo.dbDefaultElo}
                  on:change={updateNumber}
                />
              </div>
            </div>
            <div class="border m-2 p-2">
              <div class="text-center">Column Mappings</div>
              <div class="row">
                <div class="col">
                  <label for="dbTableName">User Table</label>
                  <input
                    type="text"
                    class="form-control"
                    id="dbTableName"
                    placeholder="User Table"
                    value={$appSettings.elo.dbTableName}
                    on:change={onInputChange}
                  />
                </div>
                <div class="col">
                  <label for="dbUserColumn">Username</label>
                  <input
                    type="text"
                    class="form-control"
                    id="dbUserColumn"
                    placeholder="Username Column"
                    value={$appSettings.elo.dbUserColumn}
                    on:change={onInputChange}
                  />
                </div>
                <div class="col">
                  <label for="dbELOColumn">ELO/Rating</label>
                  <input
                    type="text"
                    class="form-control"
                    id="dbELOColumn"
                    placeholder="ELO Column"
                    value={$appSettings.elo.dbELOColumn}
                    on:change={onInputChange}
                  />
                </div>
              </div>
              <div class="row pt-2">
                <div class="col text-center">Optional (Blank to disable)</div>
              </div>
              <div class="border m-1 p-1">
                <div class="text-center">Extra Column Mappings</div>
                <div class="row">
                  <SettingsTextInput
                    frontFacingName="Rank"
                    key="dbRankColumn"
                    value={$appSettings.elo.dbRankColumn}
                    on:change={onInputChange}
                  />
                  <SettingsTextInput
                    frontFacingName="Played"
                    key="dbPlayedColumn"
                    value={$appSettings.elo.dbPlayedColumn}
                    on:change={onInputChange}
                  />
                  <SettingsTextInput
                    frontFacingName="Wins"
                    key="dbWonColumn"
                    value={$appSettings.elo.dbWonColumn}
                    on:change={onInputChange}
                  />
                </div>
                <div class="text-center">Seasons</div>
                <div class="row">
                  <SettingsTextInput
                    frontFacingName="Season Column"
                    placeholder="Season Column"
                    key="dbSeasonColumn"
                    value={$appSettings.elo.dbSeasonColumn}
                    on:change={onInputChange}
                  />
                  <SettingsTextInput
                    frontFacingName="Use Season"
                    placeholder="Default: Desc Order"
                    key="dbCurrentSeason"
                    value={$appSettings.elo.dbCurrentSeason}
                    on:change={onInputChange}
                  />
                </div>
                <div class="row pt-2">
                  <div class="col text-center">Advanced</div>
                </div>
                <div class="row">
                  <SettingsTextInput
                    frontFacingName="Join Table (2)"
                    key="dbSecondaryTable"
                    placeholder="Secondary Table"
                    value={$appSettings.elo.dbSecondaryTable}
                    on:change={onInputChange}
                  />
                  <SettingsTextInput
                    frontFacingName="Table 1 Key"
                    key="dbPrimaryTableKey"
                    value={$appSettings.elo.dbPrimaryTableKey}
                    on:change={onInputChange}
                  />
                  <SettingsTextInput
                    frontFacingName="Table 2 Key"
                    key="dbSecondaryTableKey"
                    value={$appSettings.elo.dbSecondaryTableKey}
                    on:change={onInputChange}
                  />
                </div>
              </div>
            </div>
          {/if}
          {#if $appSettings.autoHost.type !== "off"}
            <div class="d-flex justify-content-center">
              {#if $appSettings.elo.available}
                <div class="badge bg-success">
                  {#if $appSettings.elo.type === "wc3stats"}
                    <a href="https://api.wc3stats.com/maps/{$appSettings.elo.lookupName}"
                      >ELO Available!</a
                    >
                  {:else}
                    ELO Available!
                  {/if}
                </div>
              {:else}
                <div class="badge bg-danger">
                  ELO not found! Reach out to me on discord
                </div>
              {/if}
            </div>
            {#if $appSettings.elo.type === "wc3stats" && $appSettings.elo.available}
              <div class="d-flex justify-content-center">
                <label for="wc3statsOptions">Wc3stats Variant</label>
                <select
                  class="form-select"
                  id="wc3statsOptions"
                  value={$appSettings.elo.wc3StatsVariant}
                  on:change={onInputChange}
                >
                  {#await wc3statsOptions}
                    <option>Fetching options...</option>
                  {:then value}
                    <option value="" selected={"" === $appSettings.elo.wc3StatsVariant}
                      >Select a value</option
                    >
                    {#each value as option}
                      <option
                        selected={JSON.stringify(option.key) ===
                          $appSettings.elo.wc3StatsVariant}
                        value={JSON.stringify(option.key)}
                        >{option.key.ladder}, {option.key.mode}, {option.key.round}, {option
                          .key.season}</option
                      >
                    {/each}
                  {/await}
                </select>
              </div>
              {#if $appSettings.elo.handleReplays}
                <div class="row">
                  <div class="col">
                    <label for="eloPrivateKey">Private Key</label>
                    <input
                      type="text"
                      class="form-control"
                      id="eloPrivateKey"
                      placeholder="Optional"
                      value={$appSettings.elo.privateKey}
                      on:change={onInputChange}
                    />
                  </div>
                </div>
              {/if}
            {/if}
          {/if}

          <div class="grid grid-cols-4" style="flex-wrap: wrap;" role="group">
            <SettingsCheckbox
              key="balanceTeams"
              frontFacingName="Balance teams"
              checked={$appSettings.elo.balanceTeams}
              tooltipContent="Balance teams based off ELO. Only tested with 2 teams."
              on:change={onInputChange}
            />
            <SettingsCheckbox
              key="excludeHostFromSwap"
              frontFacingName="Don't swap host"
              checked={$appSettings.elo.excludeHostFromSwap}
              tooltipContent="Will not swap the local user during auto balancing."
              on:change={onInputChange}
            />
            {#if $appSettings.elo.type === "wc3stats"}
              <SettingsCheckbox
                key="handleReplays"
                frontFacingName="Handle Replays"
                checked={$appSettings.elo.handleReplays}
                tooltipContent="Automatically handle upload to wc3stats.com at the end of each game."
                on:change={onInputChange}
              />
            {/if}
            <SettingsCheckbox
              key="announce"
              frontFacingName="Announce Stats"
              checked={$appSettings.elo.announce}
              tooltipContent="Announce stats to the lobby."
              on:change={onInputChange}
            />
            <SettingsCheckbox
              frontFacingName="Hide ELO"
              key="hideElo"
              tooltipContent="Will hide ELO from all channels."
              checked={$appSettings.elo.hideElo}
              on:change={onInputChange}
            />
            <SettingsCheckbox
              key="requireStats"
              frontFacingName="Require Stats"
              checked={$appSettings.elo.requireStats}
              tooltipContent="Will require minimum stats of games/wins/rank/rating in order to join the lobby."
              on:change={onInputChange}
            />
          </div>
        </div>
      </div>
      {#if $appSettings.elo.requireStats}
        <div class="row">
          <div class="col">
            <label for="minRank">Min Rank</label>
            <input
              type="number"
              class="form-control"
              id="minRank"
              placeholder="0 for none"
              value={$appSettings.elo.minRank}
              on:change={updateNumber}
            />
          </div>
          <div class="col">
            <label for="minGames">Min Games</label>
            <input
              type="number"
              class="form-control"
              id="minGames"
              placeholder="Minimum Games Played"
              value={$appSettings.elo.minGames}
              on:change={updateNumber}
            />
          </div>
          <div class="col">
            <label for="minWins">Min Wins</label>
            <input
              type="number"
              class="form-control"
              id="minWins"
              placeholder="Minimum Wins"
              value={$appSettings.elo.minWins}
              on:change={updateNumber}
            />
          </div>
          <div class="col">
            <label for="minRating">Min Rating</label>
            <input
              type="number"
              class="form-control"
              id="minRating"
              placeholder="Minimum Rating"
              value={$appSettings.elo.minRating}
              on:change={updateNumber}
            />
          </div>
        </div>
      {/if}
    </div>
  {/if}
</form>
