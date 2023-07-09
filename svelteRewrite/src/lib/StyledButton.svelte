<script lang="ts">
  export let disabled: boolean = false;
  export let active: boolean = false;
  export let size: "sm" | "md" | "" = "";
  export let color: "blue" | "red" | "teal" | "green" = "blue";
</script>

<div
  class="my-auto generic-btn generic-btn-{color}{active ? '-active' : ''} {size} {disabled
    ? 'generic-btn-disabled'
    : ''}"
>
  <button on:click type="button" class="coture w-full h-full select-none" {disabled}>
    <strong><slot /></strong>
  </button>
</div>
