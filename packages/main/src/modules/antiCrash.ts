import {ModuleBase} from './../moduleBase';

import type {GameSocketEvents} from './../globals/gameSocket';

class Monitor extends ModuleBase {
  constructor() {
    super('Monitor', {listeners: ['gameSocketEvent']});
  }

  protected onGameSocketEvent(events: GameSocketEvents): void {
    if (events.LoggedOut) {
      this.warn('Logged out of Bnet. Relaunching');
      this.warControl.forceQuitWar().then(() => {
        this.warControl.openWarcraft();
      });
    }
    if (events.disconnected && this.settings.values.client.antiCrash) {
      this.checkCrash();
    }
  }

  checkCrash() {
    setTimeout(async () => {
      if (await this.warControl.checkProcess('BlizzardError.exe')) {
        this.error('Crash detected: BlizzardError.exe is running, restarting.');
        await this.warControl.forceQuitProcess('BlizzardError.exe');
        this.warControl.openWarcraft();
      }
    }, 1000);
  }
}

export const monitor = new Monitor();
