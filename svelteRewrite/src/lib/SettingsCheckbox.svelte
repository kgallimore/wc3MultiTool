<script lang="ts">
  import { tooltip } from "@svelte-plugins/tooltips";
  export let key: string;
  export let checked: boolean = false;
  export let frontFacingName: string = key;
  export let tooltipContent: string = "";
</script>

{#if tooltipContent}
  <span
    class="flex"
    class:text-inactive-text={!checked}
    use:tooltip={checked}
    title={tooltipContent}
  >
    <input type="checkbox" id={key} bind:checked on:change />
    <label for={key} />
    {frontFacingName}
  </span>
{:else}
  <span class="flex" class:text-inactive-text={!checked}>
    <input type="checkbox" id={key} bind:checked on:change />
    <label for={key} />
    {frontFacingName}
  </span>
{/if}
