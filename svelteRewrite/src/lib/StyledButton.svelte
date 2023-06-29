<script lang="ts">
  export let disabled: boolean = false;
  export let active: boolean = false;
  export let color: "blue" | "red" | "teal" | "green" = "blue";
</script>

<div
  class="generic-btn generic-btn-{color}{active ? '-active' : ''} {disabled
    ? 'generic-btn-disabled'
    : ''}"
>
  <div class="w-full h-full">
    <button on:click type="button" class="coture w-full h-full" {disabled}>
      <strong><slot /></strong>
    </button>
  </div>
</div>
