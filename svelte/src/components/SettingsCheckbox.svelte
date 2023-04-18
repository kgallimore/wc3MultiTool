<script lang="ts">
  import { onMount } from "svelte";
  export let key: string;
  export let checked: boolean = false;
  export let frontFacingName: string = key;
  export let tooltip: string = "";

  let label: HTMLElement;

  onMount(() => {
    // @ts-expect-error
    let test = new bootstrap.Tooltip(label);
  });
</script>

<input type="checkbox" class="btn-check" id={key} bind:checked on:change />
<label
  bind:this={label}
  for={key}
  class="btn btn-outline-primary"
  data-bs-toggle="tooltip"
  data-bs-placement="top"
  title={tooltip}>{frontFacingName}</label
>
