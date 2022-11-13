<script lang="ts">
  export let label: string;
</script>

<div class="generic-btn content-center">
  <div class="w-full h-full">
    <button on:click type="button" class="cursor-pointer coture w-full h-full">
      <strong>{label}</strong>
    </button>
  </div>
</div>
