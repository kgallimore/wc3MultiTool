import './security-restrictions';
import {restoreOrCreateWindow} from '/~/mainWindow';
import {platform} from 'node:process';
import {screen, keyboard} from '@nut-tree/nut-js';
require('@nut-tree/nl-matcher');
import {app, BrowserWindow, ipcMain, dialog, shell, Notification} from 'electron';
import {autoUpdater} from 'electron-updater';
import * as log from 'electron-log';
import {checkMigration} from './prismaClient';
//import {join} from 'path';
import Store from 'electron-store';
import {existsSync, readFileSync, rmSync, copyFileSync, mkdirSync, writeFileSync} from 'fs';
// ts-expect-error Missing types
// import audioLoader from 'audio-loader';
// import playAudio from 'audio-play';

import type {SettingsUpdates} from './globals/settings';
import {settings} from './globals/settings';
import type {GameState} from './globals/gameState';
import {gameState} from './globals/gameState';
import type {ClientState} from './globals/clientState';
import {clientState} from './globals/clientState';
import {warControl} from './globals/warControl';

import {administration} from './modules/administration';
import {autoHost} from './modules/autoHost';
import {chatHandler} from './modules/chatHandler';
import {commServer} from './modules/comm';
import {discordBot} from './modules/discordBot';
import {discordRPC} from './modules/discordRPC';
import {HubSingle} from './modules/hub';
import type {LobbyUpdatesExtended} from './modules/lobbyControl';
import {lobbyControl} from './modules/lobbyControl';
import {obsSocketSingle} from './modules/obs';
import {performanceMode} from './modules/performanceMode';
import {protocolHandler} from './modules/protocolHandler';
import {replayHandler} from './modules/replayHandler';
import {SEClientSingle} from './modules/stream';
import {monitor} from './modules/antiCrash';
const modules = [
  administration,
  autoHost,
  chatHandler,
  commServer,
  discordBot,
  discordRPC,
  HubSingle,
  lobbyControl,
  obsSocketSingle,
  performanceMode,
  protocolHandler,
  replayHandler,
  SEClientSingle,
  monitor,
];
import type {EmitEvents} from './moduleBasePre';
import type {BanWhiteSingle, WindowReceive, WindowSend} from './utility';
/**
 * Prevent electron from running multiple instances.
 */
const isSingleInstance = app.requestSingleInstanceLock();
if (!isSingleInstance) {
  app.quit();
  process.exit(0);
}
app.on('second-instance', (event, args) => {
  if (args[2] && args[2].substring(0, 5) === 'wc3mt') {
    log.info('Handling Protocol Now');
    protocolHandler.processURL(args[2]);
  } else {
    restoreOrCreateWindow();
  }
});

/**
 * Handle protocol url.
 */
app.on('open-url', function (event, url) {
  if (url.substring(0, 5) === 'wc3mt') {
    event.preventDefault();
    protocolHandler.processURL(url);
    log.info('Handling Protocol Once Ready');
  }
});
app.setAsDefaultProtocolClient('wc3mt');

/**
 * Disable Hardware Acceleration to save more system resources.
 */
app.disableHardwareAcceleration();

/**
 * Shut down background process if all windows were closed
 */
app.on('window-all-closed', () => {
  HubSingle.sendToHub({lobbyUpdates: {leftLobby: true}});
  discordBot.lobbyClosed();
  if (platform !== 'darwin') {
    app.quit();
  }
});
app.on('before-quit', () => {
  HubSingle.sendToHub({lobbyUpdates: {leftLobby: true}});
  discordBot.lobbyClosed();
});

/**
 * @see https://www.electronjs.org/docs/latest/api/app#event-activate-macos Event: 'activate'.
 */
app.on('activate', restoreOrCreateWindow);

/**
 * Create the application window when the background process is ready.
 */
app
  .whenReady()
  .then(() => {
    checkMigration();
    if (app.getVersion().includes('beta')) {
      settings.updateSettings({client: {releaseChannel: 'beta'}});
    } else if (app.getVersion().includes('alpha')) {
      settings.updateSettings({client: {releaseChannel: 'alpha'}});
    }
    restoreOrCreateWindow();
    autoUpdater.channel = settings.values.client.releaseChannel;
    autoUpdater.logger = log;
    log.errorHandler.startCatching();
    screen.config.confidence = 0.8;
    keyboard.config.autoDelayMs = 25;
    if (import.meta.env.DEV) {
      screen.config.autoHighlight = true;
      screen.config.highlightDurationMs = 1500;
      screen.config.highlightOpacity = 0.75;
    }
    const store = new Store();

    const wc3mtTargetFile = `${app.getPath('documents')}\\Warcraft III\\CustomMapData\\wc3mt.txt`;

    let warInstallLoc: string = store.get('warInstallLoc') as string;
    if (!warInstallLoc || warInstallLoc.includes('.exe')) {
      const data = readFileSync('warInstallLoc.txt');
      {
        warInstallLoc = data.toString();
        if (existsSync(warInstallLoc + '\\_retail_\\x86_64\\Warcraft III.exe')) {
          store.set('warInstallLoc', warInstallLoc);
        } else {
          // TODO this needs to be checked to make sure it doesn't mess with WarSingle. Also creating a temp window seems like a bad idea
          const tempWindow = new BrowserWindow();
          dialog
            .showOpenDialog(tempWindow, {
              title: 'Please Choose Warcraft III Launcher.exe',
              defaultPath: 'C:\\Program Files (x86)',
              properties: ['openFile'],
              filters: [{name: 'Warcraft 3 Executable', extensions: ['exe']}],
            })
            .then(result => {
              tempWindow.close();
              if (!result.canceled) {
                if (result.filePaths[0].includes('Warcraft III')) {
                  warInstallLoc = result.filePaths[0].split(/(\\*|\/*)Warcraft III[^\\/]*\.exe/)[0];
                  log.info(`Change install location to ${warInstallLoc}`);
                  store.set('warInstallLoc', warInstallLoc);
                } else {
                  log.warn('Invalid Warcraft file?');
                }
              }
            })
            .catch(err => {
              log.warn(err.message, err.stack);
            });
        }
      }
    }

    settings.on('settingsUpdates', (newSettings: SettingsUpdates) => {
      sendWindow({globalUpdate: {settings: newSettings}});
      if (newSettings.client?.releaseChannel) {
        autoUpdater.channel = newSettings.client.releaseChannel;
        autoUpdater.checkForUpdatesAndNotify();
      }
    });
    gameState.on('gameStateUpdates', (gameState: Partial<GameState>) =>
      sendWindow({globalUpdate: {gameState}}),
    );
    clientState.on('clientStateUpdates', (clientState: Partial<ClientState>) =>
      sendWindow({globalUpdate: {clientState}}),
    );

    lobbyControl.on('lobbyUpdate', (lobbyUpdate: LobbyUpdatesExtended) =>
      sendWindow({
        legacy: {messageType: 'lobbyUpdate', data: {lobbyData: lobbyUpdate}},
      }),
    );
    ipcMain.on('toMain', (event, args: WindowSend) => {
      commandClient(args);
    });

    if (existsSync(wc3mtTargetFile)) {
      log.info('Removing leftover file');
      rmSync(wc3mtTargetFile);
    }

    initModules();

    if (process.argv[1] && process.argv[1] !== '.') {
      setTimeout(() => {
        protocolHandler.processURL(process.argv[1]);
      }, 3000);
    } else if (settings.values.client.openWarcraftOnStart) {
      setTimeout(warControl.openWarcraft, 3000);
    }
  })
  .catch(e => console.error('Failed create window:', e));

/**
 * Check for app updates, install it in background and notify user that new version was installed.
 * No reason run this in non-production build.
 * @see https://www.electron.build/auto-update.html#quick-setup-guide
 *
 * Note: It may throw "ENOENT: no such file app-update.yml"
 * if you compile production app without publishing it to distribution server.
 * Like `npm run compile` does. It's ok 😅
 */
if (import.meta.env.PROD) {
  app
    .whenReady()
    .then(() => /**
     * Here we forced to use `require` since electron doesn't fully support dynamic import in asar archives
     * @see https://github.com/electron/electron/issues/38829
     * Potentially it may be fixed by this https://github.com/electron/electron/pull/37535
     */ {
      log.info('App ready');
      require('electron-updater').autoUpdater.checkForUpdatesAndNotify();
      setInterval(() => {
        if (settings.values.client.checkForUpdates) {
          autoUpdater.checkForUpdatesAndNotify();
        }
      }, 30 * 60 * 1000);
      if (settings.values.client.checkForUpdates) {
        autoUpdater.checkForUpdatesAndNotify();
      }
    })
    .catch(e => console.error('Failed check and install updates:', e));

  autoUpdater.on('checking-for-update', () => {});
  autoUpdater.on('update-available', _ => {
    log.info('Update available');
  });
  autoUpdater.on('update-not-available', _ => {});
  autoUpdater.on('error', err => {
    new Notification({
      title: 'Update Error',
      body: 'There was an error with the auto updater!',
    }).show();
    log.warn(err);
    sendWindow({
      legacy: {messageType: 'updater', data: {value: 'Update error! Check logs.'}},
    });
  });
  autoUpdater.on('download-progress', progressObj => {
    let log_message = 'Download speed: ' + progressObj.bytesPerSecond;
    log_message = log_message + ' - Downloaded ' + progressObj.percent + '%';
    log_message = log_message + ' (' + progressObj.transferred + '/' + progressObj.total + ')';
    sendWindow({legacy: {messageType: 'updater', data: {value: log_message}}});
  });
  autoUpdater.on('update-downloaded', _ => {
    log.info('Update downloaded');

    if (settings.values.client.restartOnUpdate) {
      new Notification({
        title: 'Update Downloaded',
        body: 'The latest version has been downloaded and will now be installed.',
      }).show();
      autoUpdater.quitAndInstall(true, true);
    } else {
      new Notification({
        title: 'Update Downloaded',
        body: 'The latest version has been downloaded. Please restart the app',
      }).show();
      sendWindow({
        legacy: {
          messageType: 'updater',
          data: {value: 'Update downloaded. Please restart the app.'},
        },
      });
    }
  });
}

function playSound(_: string) {
  if (!app.isPackaged) {
    //audioLoader(join(__dirname, 'sounds\\' + file)).then(playAudio);
    //play(join(__dirname, "sounds\\" + file));
  } else {
    //audioLoader(join(app.getAppPath(), '\\src\\sounds\\' + file)).then(playAudio);
  }
}

function sendWindow(data: WindowReceive) {
  const win = BrowserWindow.getAllWindows().find(w => !w.isDestroyed());
  if (win?.webContents) {
    win.webContents.send('fromMain', data);
  }
}

async function commandClient(args: WindowSend) {
  const win = BrowserWindow.getAllWindows().find(w => !w.isDestroyed());
  switch (args.messageType) {
    case 'exit':
      app.quit();
      break;
    case 'minimize':
      win?.minimize();
      break;
    case 'changePerm':
      if (args.perm?.player) {
        if (args.perm.role === 'moderator' || args.perm.role === 'admin') {
          administration.addAdmin(args.perm.player, 'client', 'client', args.perm.role);
        } else if (!args.perm.role) {
          administration.removeAdmin(args.perm.player, 'client');
        }
      } else {
        log.info('No player in perm');
      }
      break;
    case 'addWhiteBan':
      if (args.addWhiteBan) {
        if (args.addWhiteBan.type === 'banList') {
          administration.banPlayer(
            args.addWhiteBan.player,
            'client',
            'client',
            args.addWhiteBan.reason,
          );
        } else if (args.addWhiteBan.type === 'whiteList') {
          administration.whitePlayer(
            args.addWhiteBan.player,
            'client',
            'client',
            args.addWhiteBan.reason,
          );
        }
      }
      break;
    case 'removeWhiteBan':
      if (args.removeWhiteBan) {
        if (args.removeWhiteBan.type === 'banList') {
          administration.unBanPlayer(args.removeWhiteBan.player, 'client');
        } else if (args.removeWhiteBan.type === 'whiteList') {
          administration.unWhitePlayer(args.removeWhiteBan.player, 'client');
        }
      }
      break;
    case 'init':
      sendWindow({
        init: {
          settings: settings.values,
          gameState: gameState.values,
          clientState: clientState.values,
          appVersion: app.getVersion(),
        },
      });
      if (lobbyControl.microLobby) {
        sendWindow({
          legacy: {
            messageType: 'lobbyUpdate',
            data: {
              lobbyData: {newLobby: lobbyControl.microLobby?.exportMin()},
            },
          },
        });
      }
      break;
    case 'openLogs':
      shell.openPath(log.transports.file.getFile().path);
      break;
    case 'openWar':
      warControl.openWarcraft();
      break;
    case 'fetchWhiteBanList':
      if (args.fetch) {
        const whiteBanList = await administration.fetchList(args.fetch);
        sendWindow({
          legacy: {
            messageType: 'fetchedWhiteBanList',
            data: {
              fetched: {
                type: args.fetch.type,
                list: whiteBanList,
                page: args.fetch.page ?? 0,
              },
            },
          },
        });
      }
      break;
    case 'getMapPath':
      if (!win) return;
      dialog
        .showOpenDialog(win, {
          title: 'Choose Map',
          defaultPath: `${app.getPath('home')}\\Documents\\Warcraft III\\Maps`,
          properties: ['openFile'],
          filters: [{name: 'Warcraft 3 Map', extensions: ['w3m', 'w3x']}],
        })
        .then(result => {
          if (!result.canceled) {
            let newMapPath = result.filePaths[0].replace(/\\/g, '/');
            const mapName = newMapPath.split('/').pop();
            if (!newMapPath.includes('/Maps/')) {
              log.info('Map path is potentially dangerous.');
              const copyDir = `${app
                .getPath('home')
                .replace(/\\/g, '/')}/Documents/Warcraft III/Maps/MultiTool/`;
              if (!existsSync(copyDir)) {
                mkdirSync(copyDir);
              }
              newMapPath = copyDir + mapName;
              try {
                if (!existsSync(newMapPath)) {
                  log.info('Copying map to safe path.');
                  copyFileSync(result.filePaths[0], newMapPath);
                } else {
                  log.info('Map already exists, not copying.');
                }
              } catch (e) {
                log.warn(e);
                return;
              }
            }
            settings.updateSettings({autoHost: {mapPath: newMapPath}});
          }
        })
        .catch(err => {
          log.warn(err.message, err.stack);
        });
      break;
    case 'getOpenVPNPath':
      if (!win) return;
      dialog
        .showOpenDialog(win, {
          title: 'Choose OpenVPN-GUI Executable',
          defaultPath: 'C:\\Program Files\\OpenVPN\\bin',
          properties: ['openFile'],
          filters: [{name: 'openvpn-gui', extensions: ['exe']}],
        })
        .then(result => {
          if (!result.canceled) {
            const pathChosen = result.filePaths[0].replace(/\\/g, '/');
            const executableName = pathChosen.split('/').pop();
            if (executableName !== 'openvpn-gui.exe') {
              log.warn('Possibly wrong OpenVpn executable chosen.');
            }
            settings.updateSettings({autoHost: {openVPNPath: pathChosen}});
          }
        })
        .catch(err => {
          log.warn(err.message, err.stack);
        });
      break;
    case 'updateSettingSingle':
      // TODO: Update this to new update system
      // eslint-disable-next-line no-case-declarations
      const update = args.update;
      if (update) {
        settings.updateSettings(update);
      }
      break;
    case 'autoHostLobby':
      log.info('Comm AutoHost lobby');
      autoHost.autoHostGame(true);
      break;
    case 'exportWhitesBans':
      if (args.exportImport) {
        const list = administration.fetchList({type: args.exportImport.type});
        if (args.exportImport.type === 'banList') {
          const path = app.getPath('documents') + '\\bans.json';
          writeFileSync(path, JSON.stringify(list));
          shell.showItemInFolder(path);
        } else if (args.exportImport.type === 'whiteList') {
          const path = app.getPath('documents') + '\\whiteList.json';
          writeFileSync(path, JSON.stringify(list));
          shell.showItemInFolder(path);
        }
      }
      break;
    case 'importWhitesBans':
      if (args.exportImport && win) {
        dialog
          .showOpenDialog(win, {
            title: 'Choose List',
            defaultPath: `${app.getPath('downloads')}`,
            properties: ['multiSelections'],
            filters: [{name: 'Ban List', extensions: ['json']}],
          })
          .then(result => {
            result.filePaths.forEach(file => {
              const bans = JSON.parse(readFileSync(file).toString());
              bans.forEach((ban: BanWhiteSingle) => {
                if (args.exportImport?.type === 'banList') {
                  administration.banPlayer(
                    ban.username,
                    'client',
                    ban.region || 'client',
                    ban.reason,
                  );
                } else if (args.exportImport?.type === 'whiteList') {
                  administration.whitePlayer(
                    ban.username,
                    'client',
                    ban.region || 'client',
                    ban.reason,
                  );
                }
              });
            });
          });
      }
      break;
    default:
      log.info('Unknown client command:', args);
      break;
  }
}

function initModules() {
  modules.forEach(module => {
    module.on('event', moduleHandler);
  });
}

function moduleHandler(command: EmitEvents) {
  if (command.notification) {
    new Notification(command.notification).show();
  }
  if (command.sendWindow) {
    sendWindow(command.sendWindow);
  }
  if (command.playSound) {
    playSound(command.playSound);
  }
  if (command.mmdResults) {
    discordBot.lobbyEnded(command.mmdResults);
  }
  if (command.lobbyUpdate) {
    // TODO Move the below code to the module system.
    const update = command.lobbyUpdate;
    if (lobbyControl.microLobby) {
      if (update.playerPayload || update.playerData || update.newLobby || update.leftLobby) {
        if (!update.leftLobby) {
          gameState.updateGameState({action: 'waitingInLobby'});
        }
      }
    }
  }
}
