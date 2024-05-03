<script lang="ts">
  import type {AppSettings, SettingsKeys} from '../../../main/src/globals/settings';
  import type {WindowSend} from '../../../main/src/utility';
  import {appSettings} from './../stores/page';
  import AutoHostForm from './Forms/AutoHostForm.svelte';
  import ClientForm from './Forms/ClientForm.svelte';
  import DiscordForm from './Forms/DiscordForm.svelte';
  import ELOForm from './Forms/ELOForm.svelte';
  import OBSForm from './Forms/OBSForm.svelte';
  import StreamingForm from './Forms/StreamingForm.svelte';

  function onInputChange(
    e:
      | (Event & {
          currentTarget: EventTarget & HTMLSelectElement;
        })
      | (Event & {
          currentTarget: EventTarget & HTMLInputElement;
        }),
  ) {
    let val: string | boolean;
    if (e.currentTarget.getAttribute('type') === 'checkbox') {
      val = (e.currentTarget as EventTarget & HTMLInputElement).checked;
    } else {
      val = e.currentTarget.value;
    }
    let keyName: string = e.currentTarget.id;
    if (e.currentTarget.id.indexOf(e.currentTarget.form!.name) === 0) {
      var shift = 0;
      if(keyName.charAt(e.currentTarget.form!.name.length) === "_"){
        shift++;
      }
      keyName =
      keyName.charAt(e.currentTarget.form!.name.length + shift).toLowerCase() +
      keyName.slice(e.currentTarget.form!.name.length + 1 + shift);
      if(shift == 1){
        keyName = "_" + keyName;
      }
    } else {
      keyName = e.currentTarget.id;
    }
    updateSettingSingle(
      e.currentTarget.form!.name as keyof AppSettings,
      keyName as SettingsKeys,
      val,
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
    min: number = 0,
  ) {
    let val = parseInt(e.currentTarget.value);
    if (isNaN(val)) {
      val = min;
      e.currentTarget.value = min.toString();
    }
    updateSettingSingle(
      e.currentTarget.form!.name as keyof AppSettings,
      e.currentTarget.id as SettingsKeys,
      val,
    );
  }

  function updateSettingSingle(
    setting: keyof AppSettings,
    key: SettingsKeys,
    value: boolean | string | number,
    slot: number | null = null,
  ) {
    if (key === 'closeSlots' && slot != null) {
      let slotNum = slot;
      if (value === true && !$appSettings.autoHost.closeSlots.includes(slotNum)) {
        $appSettings.autoHost.closeSlots.push(slotNum);
      } else if ($appSettings.autoHost.closeSlots.includes(slotNum)) {
        $appSettings.autoHost.closeSlots.splice(
          $appSettings.autoHost.closeSlots.indexOf(slotNum),
          1,
        );
      }
      (value as unknown) = $appSettings.autoHost.closeSlots;
    }
    if ($appSettings[setting][key] !== value || key === 'closeSlots') {
      toMain({
        messageType: 'updateSettingSingle',
        update: {[setting]: {[key]: value}},
      });
    }
  }

  function toMain(args: WindowSend) {
    window.api.send('toMain', args);
  }
</script>

<div class="container">
  <AutoHostForm
    {onInputChange}
    {updateNumber}
    {toMain}
    {updateSettingSingle}
  />
  <ClientForm
    {onInputChange}
    {updateSettingSingle}
  />
  <DiscordForm {onInputChange} />
  <ELOForm
    {onInputChange}
    {updateNumber}
  />
  <OBSForm
    {onInputChange}
    {toMain}
  />
  <StreamingForm
    {onInputChange}
    {updateNumber}
  />
</div>
