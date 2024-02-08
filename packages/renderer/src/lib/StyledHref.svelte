<script lang="ts">
  export let label: string;
  export let href: string;
</script>

<div class="generic-btn generic-btn-blue content-center">
  <div class="w-full h-full flex justify-center items-center cursor-pointer select-none">
    <a class="coture" {href}>{label}</a>
  </div>
</div>
