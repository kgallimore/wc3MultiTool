import {ModuleBase} from '../moduleBase';

import type {SettingsUpdates} from './../globals/settings';
import type {GameState} from './../globals/gameState';

import {WebSocket} from 'ws';
import type {HubReceive} from '../utility';
import {isValidUrl} from '../utility';
import type {LobbyUpdatesExtended} from './lobbyControl';

export class Comm extends ModuleBase {
  commSocket: WebSocket | null = null;
  retrySetup: NodeJS.Timeout | null = null;

  constructor() {
    super('Comm', {listeners: ['gameSocketEvent', 'settingsUpdate', 'lobbyUpdate']});
    this.initialize();
  }

  onGameStateUpdate(updates: Partial<GameState>): void {
    this.commSend({
      gameStateUpdates: updates,
    });
  }

  onSettingsUpdate(updates: SettingsUpdates): void {
    if (updates.client?.commAddress !== undefined) {
      this.initialize();
    }
    this.commSend({
      settingsUpdates: updates,
    });
  }

  onLobbyUpdate(updates: LobbyUpdatesExtended): void {
    this.commSend({
      lobbyUpdates: updates,
    });
  }

  private initialize() {
    if (this.retrySetup) {
      clearTimeout(this.retrySetup);
      this.retrySetup = null;
    }
    const address = this.settings.values.client.commAddress;
    if (address && isValidUrl(address)) {
      this.info('Connecting to comm socket: ' + address + '/' + this.identifier);

      if (this.commSocket) {
        this.info('Comm socket already connected. Disconnecting old socket.');
        this.commSocket.close();
        this.commSocket = null;
      }
      this.commSocket = new WebSocket(address + '/' + this.identifier);
      this.commSocket.onopen = () => {
        this.info('Connected to comm');
        this.commSend({settings: this.settings.values});
        // TODO Fix this
        //this.commSend({ gameState: this.gameState });
      };
      this.commSocket.onclose = () => {
        this.info('Disconnected from comm');
        this.commSocket = null;
        this.retrySetup = setTimeout(() => this.initialize, 1000);
      };
      this.commSocket.onerror = error => {
        this.error('Error in comm: ', error);
        this.commSocket = null;
      };
      this.commSocket.onmessage = _ => {
        //commandClient(JSON.parse(message.toString()));
      };
    } else {
      this.commSocket = null;
    }
  }

  commSend(data: HubReceive['data']) {
    if (this.settings.values.client.commAddress) {
      if (this.commSocket) {
        if (this.commSocket.readyState === this.commSocket.OPEN) {
          this.commSocket.send(JSON.stringify(data));
        } else if (this.commSocket.readyState === this.commSocket.CONNECTING) {
          setTimeout(() => {
            this.commSend(data);
          }, 250);
        }
      } else {
        //log.warn("Comm socket not connected.");
      }
    }
  }
}

export const commServer = new Comm();
