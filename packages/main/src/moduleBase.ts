import {Module} from './moduleBasePre';
import {lobbyControl} from './modules/lobbyControl';

import type {LobbyUpdatesExtended} from './modules/lobbyControl';
import type {Listeners} from './moduleBasePre';
export class ModuleBase extends Module {
  protected lobby = lobbyControl;

  constructor(name: string, options?: {listeners?: Array<Listeners>}) {
    super(name, options);
    if (options?.listeners && options.listeners.includes('lobbyUpdate')) {
      this.verbose('LobbyController Listener Attached.');
      this.lobby.on('lobbyUpdate', this.onLobbyUpdate.bind(this));
    }
  }

  protected onLobbyUpdate(_updates: LobbyUpdatesExtended) {}
}
