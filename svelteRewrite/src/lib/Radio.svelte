<script lang="ts">
  export let groupValue: string;
  export let value: string;
  export let group: string;
  export let display: string = value
    .toLowerCase()
    .split(" ")
    .map((s) => s.charAt(0).toUpperCase() + s.substring(1))
    .join(" ");
</script>

<div class="flex">
  <input
    type="checkbox"
    on:change
    name={group + value}
    {value}
    id={group + value}
    checked={groupValue === value}
  />
  <label class="float-left" for={group + value} />
  {display}
</div>
