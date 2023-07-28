import {ModuleBase} from './../moduleBase';

import {app} from 'electron';
import Store from 'electron-store';
const store = new Store();
import parser from 'w3gjs';
import {readFileSync, readdirSync, existsSync, statSync} from 'fs';
import type {GameState} from './../globals/gameState';
import {join} from 'path';

export interface mmdResults {
  list: {
    [key: string]: {pid: string; won: boolean; extra: {[key: string]: string}};
  };
  lookup: {[key: string]: string};
}

class ReplayHandler extends ModuleBase {
  replayFolders = join(app.getPath('documents'), 'Warcraft III\\BattleNet');

  constructor() {
    super('Replay Handler', {listeners: ['gameStateUpdates']});
  }

  protected onGameStateUpdate(updates: Partial<GameState>): void {
    if (updates.inGame === false && this.settings.values.elo.handleReplays) {
      const mostModified = {file: '', mtime: 0};
      readdirSync(this.replayFolders, {withFileTypes: true})
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name)
        .forEach(folder => {
          const targetFile = join(this.replayFolders, folder, 'Replays', 'LastReplay.w3g');
          if (existsSync(targetFile)) {
            const stats = statSync(targetFile);
            if (stats.mtimeMs > mostModified.mtime) {
              mostModified.mtime = stats.mtimeMs;
              mostModified.file = targetFile;
            }
          }
        });
      if (mostModified.file && mostModified.mtime > this.clientState.values.latestUploadedReplay) {
        console.log('Found new replay:', mostModified.file);
        this.analyzeGame(mostModified.file).then(mmdResults => {
          this.emitEvent({mmdResults});
        });

        if (this.settings.values.elo.type === 'wc3stats') {
          this.info('Uploading replay to wc3stats');
          const form = new FormData();
          form.append('replay', new Blob([readFileSync(mostModified.file)]));
          fetch(
            `https://api.wc3stats.com/upload${
              this.settings.values.elo.privateKey ? '/' + this.settings.values.elo.privateKey : ''
            }?auto=true`,
            {
              method: 'POST',
              body: form,
            },
          ).then(
            response => {
              if (!response.ok) {
                console.log(JSON.stringify(response));
                this.error(response.statusText);
                this.sendWindow({
                  legacy: {
                    messageType: 'error',
                    data: {error: response.statusText},
                  },
                });
              } else {
                this.info('Uploaded replay to wc3stats');
                this.clientState.updateClientState({
                  currentStep: 'Uploaded replay',
                  currentStepProgress: 0,
                });
                this.clientState.updateClientState({
                  latestUploadedReplay: mostModified.mtime,
                });
                store.set('latestUploadedReplay', this.clientState.values.latestUploadedReplay);
              }
            },
            error => {
              this.info(error.message);
              this.sendWindow({
                legacy: {messageType: 'error', data: {error: error.message}},
              });
            },
          );
        }
      }
    }
  }

  async analyzeGame(file: string) {
    const data = new Set();
    const dataTypes = new Set();
    const parse = new parser();
    const results: mmdResults = {list: {}, lookup: {}};
    parse.on('gamedatablock', block => {
      if (block.id === 0x1f) {
        block.commandBlocks.forEach(commandBlock => {
          if (
            commandBlock.actions.length > 0 &&
            // @ts-expect-error Does exist
            commandBlock.actions[0].filename === 'MMD.Dat'
          ) {
            commandBlock.actions.forEach(block => {
              // @ts-expect-error Key exists on action
              const key = block.key as string;
              if (key && !/^\d+$/.test(key)) {
                if (!/^DefVarP/i.test(key)) {
                  if (key.match(/^init pid/i)) {
                    results.list[key.split(' ')[3]] = {
                      pid: key.split(' ')[2],
                      won: false,
                      extra: {},
                    };
                    results.lookup[key.split(' ')[2]] = key.split(' ')[3];
                  } else if (key.match(/^FlagP/i)) {
                    results.list[results.lookup[key.split(' ')[1]]].won =
                      key.split(' ')[2] === 'winner';
                  } else if (key.match(/^VarP /i)) {
                    if (results.list[results.lookup[key.split(' ')[1]]]) {
                      results.list[results.lookup[key.split(' ')[1]]].extra[key.split(' ')[2]] = key
                        .split('=')[1]
                        .trim();
                    }
                  }
                  data.add(key);
                } else {
                  dataTypes.add(key);
                }
              }
            });
          }
        });
      }
    });
    await parse.parse(readFileSync(file));
    return results;
  }
}

export const replayHandler = new ReplayHandler();
