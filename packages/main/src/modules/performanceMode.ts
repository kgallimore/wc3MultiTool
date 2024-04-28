import { ModuleBase } from '../moduleBase';

import { existsSync, rename } from 'fs';
import type { SettingsUpdates } from './../globals/settings';
import type { GameState } from './../globals/gameState';
import { settings } from './../globals/settings';

class PerformanceMode extends ModuleBase {
  warInstallLoc: string;

  constructor() {
    super('Performance Mode', { listeners: ['settingsUpdate', 'gameStateUpdates'] });
    this.warInstallLoc = settings.values.client.warInstallLoc;
    this.togglePerformanceMode(this.settings.values.client.performanceMode);
  }

  protected onGameStateUpdate(updates: Partial<GameState>): void {
    if (
      this.settings.values.client.performanceMode &&
      updates.menuState === 'LOGIN_DOORS'
    ) {
      setTimeout(() => {
        [
          'GetLocalPlayerName',
          'FriendsGetInvitations',
          'FriendsGetFriends',
          'MultiplayerSendRecentPlayers',
          'ClanGetClanInfo',
          'ClanGetMembers',
          'StopOverworldMusic',
          'StopAmbientSound',
          'LoginDoorClose',
          'StopAmbientSound',
          'StopAmbientSound',
          'OnWebUILoad',
        ].forEach((message, index) => {
          this.info('Triggering performanceMode bypass: ' + message);
          setTimeout(() => {
            this.gameSocket.sendMessage({ [message]: {} });
          }, 50 * index);
        });
      }, 3000);
    }
  }

  onSettingsUpdate(updates: SettingsUpdates) {
    if (updates.client?.performanceMode !== undefined) {
      this.togglePerformanceMode(updates.client.performanceMode);
    }
  }

  private togglePerformanceMode(enabled: boolean) {
    if (enabled) {
      if (existsSync(this.warInstallLoc + '\\_retail_\\webui\\indexPerf.html')) {
        rename(
          this.warInstallLoc + '\\_retail_\\webui\\index.html',
          this.warInstallLoc + '\\_retail_\\webui\\index.html.bak',
          (err) => {
            if (err) {
              this.error('Error enabling performance mode.', err);
            } else {
              this.info('Enabling performance mode');
            }
          },
        );
        rename(
          this.warInstallLoc + '\\_retail_\\webui\\indexPerf.html',
          this.warInstallLoc + '\\_retail_\\webui\\index.html',
          (err) => {
            if (err) {
              this.error('Error enabling performance mode.', err);
            } else {
              this.info('Enabling performance mode');
            }
          },
        );
      }
    } else {
      if (existsSync(this.warInstallLoc + '\\_retail_\\webui\\index.html.bak')) {
        rename(
          this.warInstallLoc + '\\_retail_\\webui\\index.html',
          this.warInstallLoc + '\\_retail_\\webui\\indexPerf.html',
          (err) => {
            if (err) {
              this.error('Error enabling performance mode.', err);
            } else {
              this.info('Enabling performance mode');
            }
          },
        );
        rename(
          this.warInstallLoc + '\\_retail_\\webui\\index.html.bak',
          this.warInstallLoc + '\\_retail_\\webui\\index.html',
          (err) => {
            if (err) {
              this.error('Error disabling performance mode.', err);
            } else {
              this.info('Disabling performance mode');
            }
          },
        );
      }
    }
  }
}

export const performanceMode = new PerformanceMode();
