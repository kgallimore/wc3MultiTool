import {ModuleBase} from '/~/moduleBase';

import type {SettingsUpdates} from '/~/globals/settings';

import OBSWebSocket from 'obs-websocket-js';
import type {GameState} from '/~/globals/gameState';
import {Key, keyboard} from '@nut-tree/nut-js';
import type {LobbyUpdatesExtended} from './lobbyControl';
import {writeFileSync} from 'fs';
import {join} from 'path';
import {app} from 'electron';

export interface ObsHotkeys {
  key: string;
  altKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
}

class OBSSocket extends ModuleBase {
  socket: OBSWebSocket | null = null;

  constructor() {
    super('OBS', {listeners: ['gameStateUpdates', 'settingsUpdate', 'lobbyUpdate']});
    this.setup();
  }

  protected onLobbyUpdate(updates: LobbyUpdatesExtended): void {
    if (updates.playerPayload || updates.playerData || updates.newLobby || updates.leftLobby) {
      if (this.settings.values.obs.enabled && this.settings.values.obs.textSource) {
        writeFileSync(
          join(app.getPath('documents'), 'wc3mt.txt'),
          this.lobby.exportTeamStructureString() || '',
        );
      }
    }
  }

  onSettingsUpdate(updates: SettingsUpdates) {
    if (updates.obs?.address !== undefined || updates.obs?.token !== undefined) {
      this.setup();
    }
  }

  protected onGameStateUpdate(updates: Partial<GameState>): void {
    if (updates.inGame !== undefined) {
      this.switchScene();
    }
  }

  private setup() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    if (
      !this.settings.values.obs.enabled ||
      this.settings.values.obs.sceneSwitchType !== 'websockets'
    ) {
      return;
    }
    const address = this.settings.values.obs.address;
    const password = this.settings.values.obs.token;
    if (!address) {
      return;
    }
    this.socket = new OBSWebSocket();
    this.socket
      .connect(address, password, undefined)
      .then(() => {
        console.log('OBS connection started');
      })
      .catch(e => console.error(e));
    this.socket.on('ConnectionOpened', () => console.log('OBS connection opened'));
    this.socket.on('ConnectionClosed', _ => console.warn('OBS connection closed'));
    this.socket.on('Identified', _ => console.log('OBS authentication succeeded'));
    this.socket.on('ConnectionError', err => {
      console.error('socket error:', err);
    });
    this.socket.on('CurrentProgramSceneChanged', data => {
      console.log(`New Active Scene: ${data.sceneName}`);
    });
  }

  private buildKeys(keys: ObsHotkeys): Array<Key> {
    const modifiers: Array<Key> = [];
    if (keys.altKey) {
      modifiers.push(Key.LeftAlt);
    }
    if (keys.ctrlKey) {
      modifiers.push(Key.LeftControl);
    }
    if (keys.shiftKey) {
      modifiers.push(Key.LeftShift);
    }
    return modifiers;
  }

  private switchScene() {
    if (!this.settings.values.obs.enabled) {
      return;
    }
    if (!this.gameState.values.inGame) {
      if (
        this.settings.values.obs.sceneSwitchType === 'websockets' &&
        this.socket &&
        this.settings.values.obs.outOfGameWSScene
      ) {
        this.info('Triggering OBS Websocket Out of Game');
        this.socket.call('SetCurrentProgramScene', {
          sceneName: this.settings.values.obs.outOfGameWSScene,
        });
      } else if (
        this.settings.values.obs.sceneSwitchType === 'hotkeys' &&
        this.settings.values.obs.outOfGameHotkey
      ) {
        this.info('Triggering OBS Hotkey Out of Game');
        const modifiers = this.buildKeys(this.settings.values.obs.outOfGameHotkey);
        const test = 'A';
        const _ = this.settings.values.obs.outOfGameHotkey.key;
        keyboard
          .type(
            ...modifiers,
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            Key[test.toUpperCase()],
          )
          .catch((e: string) => {
            this.error('Failed to trigger OBS Out of Game: ' + e.toString());
          });
      }
    } else if (this.gameState.values.inGame) {
      if (
        this.settings.values.obs.sceneSwitchType === 'websockets' &&
        this.socket &&
        this.settings.values.obs.inGameWSScene
      ) {
        this.info('Triggering OBS Websocket In Game');
        this.socket.call('SetCurrentProgramScene', {
          sceneName: this.settings.values.obs.inGameWSScene,
        });
      } else if (
        this.settings.values.obs.sceneSwitchType === 'hotkeys' &&
        this.settings.values.obs.inGameHotkey
      ) {
        this.info('Triggering OBS Hotkey In Game');
        const modifiers = this.buildKeys(this.settings.values.obs.inGameHotkey);
        keyboard
          .type(
            ...modifiers,
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            Key[this.settings.values.obs.inGameHotkey.key.toUpperCase()],
          )
          .catch(e => {
            this.error('Failed to trigger OBS In-Game' + e);
          });
      }
    }
  }
}

export const obsSocketSingle = new OBSSocket();
