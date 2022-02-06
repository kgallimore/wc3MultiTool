<script type="ts">
  import type { AppSettings } from "./../../../tsrc/utility";
  import { onMount } from "svelte";
  export let setting: keyof AppSettings;
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

<input
  type="checkbox"
  class="btn-check"
  id={setting + key}
  data-key={key}
  data-setting={setting}
  bind:checked
  on:change
/>
<label
  bind:this={label}
  for={setting + key}
  class="btn btn-outline-primary"
  data-bs-toggle="tooltip"
  data-bs-placement="top"
  title={tooltip}>{frontFacingName}</label
>
