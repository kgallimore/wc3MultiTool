<script lang="ts">
  export let groupValue: string;
  export let value: string;
  export let group: string;
  export let display: string = value
    .toLowerCase()
    .split(' ')
    .map((s) => s.charAt(0).toUpperCase() + s.substring(1))
    .join(' ');
</script>

<div class="flex">
  <label class="cursor-pointer">
    <input
      type="checkbox"
      on:change
      name={group + value}
      {value}
      id={group + value}
      checked={groupValue === value}
      disabled={groupValue === value}
    />
    <label class="float-left cursor-pointer" for={group + value} />
    {display}
  </label>
</div>
