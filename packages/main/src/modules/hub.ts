import {ModuleBase} from '../moduleBase';

import type {SettingsUpdates} from './../globals/settings';
import type {GameState} from './../globals/gameState';

import {WebSocket} from 'ws';
import type {HubReceive} from '../utility';
import type {LobbyUpdatesExtended} from './lobbyControl';
import {app} from 'electron';

class HubControl extends ModuleBase {
  hubWebSocket: WebSocket | null = null;
  isPackaged: boolean;
  appVersion: string;
  #heartBeatTimer: NodeJS.Timeout | null = null;

  constructor() {
    super('Hub', {listeners: ['gameStateUpdates', 'settingsUpdate', 'lobbyUpdate']});
    this.isPackaged = app.isPackaged;
    this.appVersion = app.getVersion();
    this.socketSetup();
  }

  onGameStateUpdate(updates: Partial<GameState>): void {
    this.sendToHub({
      gameStateUpdates: updates,
    });
  }

  onSettingsUpdate(updates: SettingsUpdates): void {
    this.sendToHub({
      settingsUpdates: updates,
    });
  }

  onLobbyUpdate(updates: LobbyUpdatesExtended): void {
    this.sendToHub({
      lobbyUpdates: updates,
    });
  }

  private socketSetup() {
    if (this.#heartBeatTimer) {
      clearTimeout(this.#heartBeatTimer);
      this.#heartBeatTimer = null;
    }
    if (this.isPackaged) {
      this.hubWebSocket = new WebSocket('wss://ws.trenchguns.com/' + this.identifier);
    } else {
      this.hubWebSocket = new WebSocket('wss://wsdev.trenchguns.com/' + this.identifier);
    }
    this.hubWebSocket.onerror = error => {
      if (this.isPackaged) this.warn('Failed hub connection: ' + error);
    };
    this.hubWebSocket.onopen = _ => {
      if (this.hubWebSocket?.readyState !== WebSocket.OPEN) return;
      this.info('Connected to hub');
      if (
        this.lobby?.microLobby?.lobbyStatic &&
        (!this.settings.values.autoHost.private || !this.isPackaged)
      ) {
        this.sendToHub({
          lobbyUpdates: {newLobby: this.lobby.microLobby.exportMin()},
        });
      }
      this.#heartBeatTimer = setInterval(this.hubHeartbeat, 30000);
    };
    this.hubWebSocket.onmessage = data => {
      this.info('Received message from hub: ' + data);
    };
    this.hubWebSocket.onclose = _ => {
      if (this.isPackaged) this.info('Disconnected from hub');
      setTimeout(this.socketSetup.bind(this), Math.random() * 5000 + 3000);
      if (this.#heartBeatTimer) {
        clearTimeout(this.#heartBeatTimer);
        this.#heartBeatTimer = null;
      }
      this.hubWebSocket = null;
    };
  }

  private hubHeartbeat() {
    if (this.hubWebSocket?.OPEN) {
      this.sendToHub({heartbeat: true});
    }
  }

  sendToHub(data: HubReceive['data']) {
    const buildMessage: HubReceive = {data, appVersion: this.appVersion};
    if (this.hubWebSocket && this.hubWebSocket.readyState === WebSocket.OPEN) {
      this.hubWebSocket.send(JSON.stringify(buildMessage));
    }
  }
}

export const HubSingle = new HubControl();
