<script lang="ts">
  import type {SettingsKeys} from './../../../main/src/globals/settings';
  export let key: SettingsKeys;
  export let value: string | number;
  export let frontFacingName: string = key;
  export let placeholder: string = frontFacingName;
  export let maxlength: number = 255;
  export let minlength: number = 0;
  export let type: 'text' | 'password' | 'number' | 'url' | 'email' = 'text';
  if (key.toLowerCase().includes('password') || key.toLowerCase().includes('token')) {
    type = 'password';
  }
</script>

<table class="table w-100">
  <tr>
    <td>
      <label for={key}>{frontFacingName}</label>
    </td>
    <td>
      {#if type === 'number'}
        <input
          {type}
          id={key}
          {placeholder}
          {value}
          max={maxlength}
          min={minlength}
          on:change
          on:keydown
        />
      {:else}
        <input
          {type}
          id={key}
          {placeholder}
          {value}
          {maxlength}
          {minlength}
          on:change
          on:keydown
        />
      {/if}
    </td>
  </tr>
</table>
