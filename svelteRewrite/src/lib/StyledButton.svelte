<script lang="ts">
  export let label: string;
  export let disabled: boolean = false;
  export let active: boolean = false;
</script>

<div class="generic-btn generic-btn-blue{active ? '-active' : ''} content-center">
  <div class="w-full h-full">
    <button on:click type="button" class="coture w-full h-full" {disabled}>
      <strong>{label}</strong>
    </button>
  </div>
</div>
