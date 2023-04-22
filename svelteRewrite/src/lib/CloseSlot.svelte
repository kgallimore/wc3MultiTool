<script lang="ts">
  export let number: string = "1";
  export let checked: boolean = false;
</script>

<span class="flex" class:text-active-text={checked}>
  <input
    on:change
    bind:checked
    type="checkbox"
    id="closeSlot{number}"
    data-key="closeSlots"
    data-slot={parseInt(number) - 1}
    data-setting="autoHost"
  />
  <label for="closeSlot{number}" />
  {number}
</span>
