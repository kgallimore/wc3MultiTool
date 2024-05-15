<script lang="ts">
  import { tooltip } from '@svelte-plugins/tooltips';
  export let key: string;
  export let checked: boolean = false;
  export let frontFacingName: string = key;
  export let tooltipContent: string = '';
</script>

{#if tooltipContent}
  <span
    class="flex"
    class:text-inactive-text={!checked}
    use:tooltip={checked}
    title={tooltipContent}
  >
    <label class="cursor-pointer flex">
      <input type="checkbox" id={key} bind:checked on:change />
      <label class="cursor-pointer" for={key} />
      {frontFacingName}
    </label>
  </span>
{:else}
  <span class="flex" class:text-inactive-text={!checked}>
    <label class="cursor-pointer flex">
      <input type="checkbox" id={key} bind:checked on:change />
      <label class="cursor-pointer" for={key} />
      {frontFacingName}
    </label>
  </span>
{/if}
