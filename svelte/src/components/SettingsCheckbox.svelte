<script type="ts">
  import type { AppSettings } from "./../../../tsrc/utility";
  export let setting: keyof AppSettings;
  export let key: string;
  export let checked: boolean = false;
  export let frontFacingName: string = key;
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
<label for={setting + key} class="btn btn-outline-primary">{frontFacingName}</label>
