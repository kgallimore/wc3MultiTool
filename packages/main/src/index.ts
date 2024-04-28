import {BrowserWindow, app, dialog, ipcMain, Notification, shell} from 'electron';
import './security-restrictions';
import {restoreOrCreateWindow} from '/@/mainWindow';
import pkg from 'electron-updater';
const {autoUpdater} = pkg;
import log from 'electron-log/main';
import {screen, keyboard} from '@nut-tree/nut-js';
// require('@nut-tree/nl-matcher');
// @ts-expect-error Really old package
import audioLoader from 'audio-loader';
import playAudio from 'audio-play';

import { migrateDB } from './migrate';

/**
 * Prevent electron from running multiple instances.
 */
const isSingleInstance = app.requestSingleInstanceLock();
if (!isSingleInstance) {
  app.quit();
  process.exit(0);
}
migrateDB();

import type {SettingsUpdates} from './globals/settings';
import {settings} from './globals/settings';
import type {GameState} from './globals/gameState';
import {gameState} from './globals/gameState';
import type {ClientState} from './globals/clientState';
import {clientState} from './globals/clientState';
import {warControl} from './globals/warControl';
import {copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';

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

import type {EmitEvents} from './moduleBasePre';
import type {Regions} from 'wc3mt-lobby-container';
import type {WindowSend, WindowReceive} from './utility';
import type { banList, whiteList } from './schema';
import type { InferSelectModel } from 'drizzle-orm';

let browserWindow: BrowserWindow;


autoUpdater.channel = settings.values.client.releaseChannel;
autoUpdater.logger = log;
log.initialize();
log.errorHandler.startCatching();

screen.config.confidence = 0.8;
keyboard.config.autoDelayMs = 25;

if (!app.isPackaged) {
  screen.config.autoHighlight = true;
  screen.config.highlightDurationMs = 1500;
  screen.config.highlightOpacity = 0.75;
}

await settings.loadSettings();
if (app.getVersion().includes('beta')) {
  settings.updateSettings({client: {releaseChannel: 'beta'}});
} else if (app.getVersion().includes('alpha')) {
  settings.updateSettings({client: {releaseChannel: 'alpha'}});
}else{
  settings.updateSettings({client: {releaseChannel: 'latest'}});
}


const wc3mtTargetFile = `${app.getPath('documents')}\\Warcraft III\\CustomMapData\\wc3mt.txt`;
let warInstallLoc: string = settings.values.client.warInstallLoc;
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

ipcMain.on('toMain', (_event, args: WindowSend) => {
  console.log('toMain', args);
  commandClient(args);
});

app.setAsDefaultProtocolClient('wc3mt');

app.on('open-url', function (event, url) {
  if (url.substring(0, 5) === 'wc3mt') {
    event.preventDefault();
    protocolHandler.processURL(url);
    log.info('Handling Protocol Once Ready');
  }
});

/**
 * Either handle a protocol link or restore the window.
 */
app.on('second-instance', async (_event, args) => {
  if (args[2] && args[2].substring(0, 5) === 'wc3mt') {
    log.info('Handling Protocol Now');
    protocolHandler.processURL(args[2]);
  } else {
    browserWindow = await restoreOrCreateWindow();
  }
});

app.on('before-quit', () => {
  HubSingle.sendToHub({lobbyUpdates: {leftLobby: true}});
  discordBot.lobbyClosed();
});

/**
 * Disable Hardware Acceleration to save more system resources.
 */
app.disableHardwareAcceleration();

/**
 * Shout down background process if all windows was closed
 */
app.on('window-all-closed', () => {
  HubSingle.sendToHub({lobbyUpdates: {leftLobby: true}});
  discordBot.lobbyClosed();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

/**
 * @see https://www.electronjs.org/docs/latest/api/app#event-activate-macos Event: 'activate'.
 */
app.on('activate', async () => {
  browserWindow = await restoreOrCreateWindow();
});

/**
 * Create the application window when the background process is ready.
 */
app
  .whenReady()
  .then(async () => {
    if (!warInstallLoc || warInstallLoc.includes('.exe')) {
      if (!existsSync('warInstallLoc.txt')) {
        writeFileSync('warInstallLoc.txt', '');
      }
      const data = readFileSync('warInstallLoc.txt');
      {
        warInstallLoc = data.toString();
        if (existsSync(warInstallLoc + '\\_retail_\\x86_64\\Warcraft III.exe')) {
          await settings.updateSettings({client: {warInstallLoc}});
        } else {
          // TODO this needs to be checked to make sure it doesn't mess with WarSingle. Also creating a temp window seems like a bad idea
          const tempWindow = new BrowserWindow();
          try{
            const result = await dialog
            .showOpenDialog(tempWindow, {
              title: 'Please Choose Warcraft III Launcher.exe',
              defaultPath: 'C:\\Program Files (x86)',
              properties: ['openFile'],
              filters: [{name: 'Warcraft 3 Executable', extensions: ['exe']}],
            });
              tempWindow.close();
              if (!result.canceled) {
                if (result.filePaths[0].includes('Warcraft III')) {
                  warInstallLoc = result.filePaths[0].split(/(\\*|\/*)Warcraft III[^\\/]*\.exe/)[0];
                  log.info(`Change install location to ${warInstallLoc}`);
                  await settings.updateSettings({client: {warInstallLoc}});
                } else {
                  log.warn('Invalid Warcraft file?');
                }
              }
          }catch(err){
            //@ts-expect-error This can't be typed?
            log.warn(err.message, err.stack);
          }

        }
      }
    }
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
    browserWindow = await restoreOrCreateWindow();
  })
  .catch(e => console.error('Failed create window:', e));

/**
 * Install Vue.js or any other extension in development mode only.
 * Note: You must install `electron-devtools-installer` manually
 */
// if (import.meta.env.DEV) {
//   app
//     .whenReady()
//     .then(() => import('electron-devtools-installer'))
//     .then(module => {
//       const {default: installExtension, VUEJS3_DEVTOOLS} =
//         // @ts-expect-error Hotfix for https://github.com/cawa-93/vite-electron-builder/issues/915
//         typeof module.default === 'function' ? module : (module.default as typeof module);
//
//       return installExtension(VUEJS3_DEVTOOLS, {
//         loadExtensionOptions: {
//           allowFileAccess: true,
//         },
//       });
//     })
//     .catch(e => console.error('Failed install extension:', e));
// }

autoUpdater.on('update-available', _info => {
  log.info('Update available');
  log.info(_info.version, app.getVersion());

});
autoUpdater.on('update-not-available', _info => {});
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
autoUpdater.on('update-downloaded', _info => {
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
    .then(() => {
      autoUpdater.checkForUpdatesAndNotify();
      setInterval(() => {
        if (settings.values.client.checkForUpdates) {
          autoUpdater.checkForUpdatesAndNotify();
        }
      }, 30 * 60 * 1000);
    })
    .catch(e => console.error('Failed check and install updates:', e));
}

function playSound(file: string) {
  if (!app.isPackaged) {
    audioLoader(join(app.getAppPath(), 'sounds\\' + file)).then(playAudio);
    //play(join(app.getAppPath(), "sounds\\" + file));
  } else {
    audioLoader(join(app.getAppPath(), '\\src\\sounds\\' + file)).then(playAudio);
  }
}

function sendWindow(data: WindowReceive) {
  if (browserWindow?.webContents) {
    browserWindow.webContents.send('fromMain', data);
  }
}

async function commandClient(args: WindowSend) {
  switch (args.messageType) {
    case 'exit':
      app.quit();
      break;
    case 'minimize':
      browserWindow.minimize();
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
      console.log('Init!!!!!');
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
      dialog
        .showOpenDialog(browserWindow, {
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
      dialog
        .showOpenDialog(browserWindow, {
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
      if (args.update) {
        settings.updateSettings(args.update);
      }
      break;
    case 'autoHostLobby':
      log.info('Comm AutoHost lobby');
      autoHost.autoHostGame(true);
      break;
    case 'exportWhitesBans':
      if (args.exportImport) {
        const list = await administration.fetchList({
          type: args.exportImport.type,
          activeOnly: true,
        });
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
      if (args.exportImport) {
        dialog
          .showOpenDialog(browserWindow, {
            title: 'Choose List',
            defaultPath: `${app.getPath('downloads')}`,
            properties: ['multiSelections'],
            filters: [{name: 'Ban List', extensions: ['json']}],
          })
          .then(result => {
            result.filePaths.forEach(file => {
              const bans = JSON.parse(readFileSync(file).toString());
              bans.forEach(async (ban: InferSelectModel<typeof banList> | InferSelectModel<typeof whiteList>) => {
                if (args.exportImport?.type === 'banList') {
                  await administration.banPlayer(
                    ban.username,
                    'client',
                    (ban.region as Regions) || 'client',
                    ban.reason as string,
                  );
                } else if (args.exportImport?.type === 'whiteList') {
                  await administration.whitePlayer(
                    ban.username,
                    'client',
                    (ban.region as Regions) || 'client',
                    ban.reason as string,
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
