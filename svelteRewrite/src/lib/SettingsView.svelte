<script lang="ts">
  import type { AppSettings, SettingsKeys } from "../../../tsrc/globals/settings";
  import type { WindowSend } from "../../../tsrc/utility";
  import { appSettings } from "./../stores/page";
  import AutoHostForm from "./Forms/AutoHostForm.svelte";
  import ClientForm from "./Forms/ClientForm.svelte";
  import DiscordForm from "./Forms/DiscordForm.svelte";
  import ELOForm from "./Forms/ELOForm.svelte";
  import OBSForm from "./Forms/OBSForm.svelte";
  import StreamingForm from "./Forms/StreamingForm.svelte";

  function onInputChange(
    e:
      | (Event & {
          currentTarget: EventTarget & HTMLSelectElement;
        })
      | (Event & {
          currentTarget: EventTarget & HTMLInputElement;
        })
  ) {
    console.log(e.currentTarget, e.currentTarget.id, e.currentTarget.value);
    let val: string | boolean;
    if (e.currentTarget.getAttribute("type") === "checkbox") {
      val = (e.currentTarget as EventTarget & HTMLInputElement).checked;
    } else {
      val = e.currentTarget.value;
    }
    let keyName: string;
    if (e.currentTarget.id.indexOf(e.currentTarget.form.name) === 0) {
      keyName =
        e.currentTarget.id.charAt(e.currentTarget.form.name.length).toLowerCase() +
        e.currentTarget.id.slice(e.currentTarget.form.name.length + 1);
    } else {
      keyName = e.currentTarget.id;
    }
    updateSettingSingle(
      e.currentTarget.form.name as keyof AppSettings,
      keyName as SettingsKeys,
      val
    );
  }

  function updateNumber(
    e:
      | (Event & {
          currentTarget: EventTarget & HTMLInputElement;
        })
      | (Event & {
          currentTarget: EventTarget & HTMLSelectElement;
        }),
    min: number = 0
  ) {
    let val = parseInt(e.currentTarget.value);
    if (isNaN(val)) {
      val = min;
      e.currentTarget.value = min.toString();
    }
    updateSettingSingle(
      e.currentTarget.form.name as keyof AppSettings,
      e.currentTarget.id as SettingsKeys,
      val
    );
  }

  function updateSettingSingle(
    setting: keyof AppSettings,
    key: SettingsKeys,
    value: boolean | string | number,
    slot: number | null = null
  ) {
    if (key === "closeSlots" && slot != null) {
      let slotNum = slot;
      if (value === true && !$appSettings.autoHost.closeSlots.includes(slotNum)) {
        $appSettings.autoHost.closeSlots.push(slotNum);
      } else if ($appSettings.autoHost.closeSlots.includes(slotNum)) {
        $appSettings.autoHost.closeSlots.splice(
          $appSettings.autoHost.closeSlots.indexOf(slotNum),
          1
        );
      }
      (value as any) = $appSettings.autoHost.closeSlots;
    }
    if ($appSettings[setting][key] !== value || key === "closeSlots") {
      toMain({
        messageType: "updateSettingSingle",
        update: { [setting]: { [key]: value } },
      });
    }
  }

  function toMain(args: WindowSend) {
    // @ts-ignore
    window.api.send("toMain", args);
  }
</script>

<h5>Settings</h5>
<div class="container">
  <AutoHostForm {onInputChange} {updateNumber} {toMain} {updateSettingSingle} />
  <ClientForm {onInputChange} {updateSettingSingle} />
  <DiscordForm {onInputChange} />
  <ELOForm {onInputChange} {updateNumber} />
  <OBSForm {onInputChange} {toMain} />
  <StreamingForm {onInputChange} {updateNumber} />
</div>
