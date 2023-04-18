<script lang="ts">
  import type { SettingsKeys } from "./../../../tsrc/globals/settings";
  export let key: SettingsKeys;
  export let value: string;
  export let frontFacingName: string = key;
  export let placeholder: string = frontFacingName;
  export let maxlength: number = 255;
  export let type: "text" | "password" = "text";
  if (key.toLowerCase().includes("password") || key.toLowerCase().includes("token")) {
    type = "password";
  }
</script>

<div class="col">
  <label for={key}>{frontFacingName}</label>
  <input
    {type}
    class="form-control"
    id={key}
    {placeholder}
    {value}
    {maxlength}
    on:change
  />
</div>
