<script lang="ts">
  export let number: string = "1";
  export let checked: boolean = false;
</script>

<input
  on:change
  bind:checked
  type="checkbox"
  class="btn-check"
  id="closeSlot{number}"
  data-key="closeSlots"
  data-slot={parseInt(number) - 1}
  data-setting="autoHost"
/>
<label for="closeSlot{number}" class="btn btn-outline-primary">{number}</label>
