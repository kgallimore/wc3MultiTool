import {Global} from '../globalBase';

import {shell, app} from 'electron';
import {settings} from './settings';
import {gameState} from './gameState';
import {gameSocket} from './gameSocket';

import type {Window, Region} from '@nut-tree/nut-js';
import {
  keyboard,
  Key,
  screen,
  getActiveWindow,
  mouse,
  centerOf,
  sleep,
  getWindows,
} from '@nut-tree/nut-js';

import {join} from 'path';
import {windowElementDescribedBy, elements} from '@nut-tree/element-inspector/win';
import {clipboard} from 'electron';
import {promisify} from 'util';
import * as child from 'child_process';
const exec = promisify(child.exec);

import type {Regions} from 'wc3mt-lobby-container';

class WarControl extends Global {
  inFocus: boolean = false;
  isOpen: boolean = false;
  windowRegion: Region | null = null;
  isPackaged: boolean = false;
  appPath: string;
  sendingInGameChat: {active: boolean; queue: string[]} = {active: false, queue: []};
  openingWarcraft = false;

  constructor() {
    super('War Control');
    screen.height().then(height => {
      this.setResourceDir(height);
    });
    this.appPath = app.getAppPath();
    this.isPackaged = app.isPackaged;
  }

  async openWarcraft(
    region: Regions | '' = '',
    callCount = 0,
    reopen: boolean = false,
  ): Promise<boolean> {
    if (this.openingWarcraft && callCount === 0) {
      return false;
    } else {
      this.openingWarcraft = true;
    }
    gameState.updateGameState({action: 'openingWarcraft'});
    try {
      if (callCount > 180) {
        this.error('Failed to open Warcraft. Giving up.');
        this.openingWarcraft = false;
        return false;
      }
      if (await this.isWarcraftOpen()) {
        this.info('Warcraft is now open');
        gameState.updateGameState({action: 'nothing'});
        this.openingWarcraft = false;
        return true;
      }
      if (settings.values.client.alternateLaunch) {
        //shell.openPath(warInstallLoc + "\\_retail_\\x86_64\\Warcraft III.exe -launch");
        if (callCount === 0 || callCount % 15 === 0) {
          exec(
            `"${settings.values.client.warInstallLoc}\\_retail_\\x86_64\\Warcraft III.exe" -launch -uid w3`,
          );
        }
        await sleep(1000);
        return await this.openWarcraft(region, callCount + 1, reopen);
      }
      const battleNetOpen = await this.checkProcess('Battle.net.exe');
      if (battleNetOpen !== true) {
        shell.openPath(
          settings.values.client.warInstallLoc + '\\_retail_\\x86_64\\Warcraft III.exe',
        );
        await sleep(1000);
        return await this.openWarcraft(region, callCount + 1, reopen);
      } else if (callCount > 60 && !reopen) {
        this.error('Failed to open Warcraft. Restarting Battle.net');
        await this.forceQuitProcess('Battle.net.exe');
        return await this.openWarcraft(region, callCount + 10, true);
      }
      let battleNetWindow: Window | null = null;
      const windows = await getWindows();
      for (const window of windows) {
        const title = await window.title;
        if (title === 'Battle.net Login') {
          await sleep(1000);
          return await this.openWarcraft(region, callCount + 1, reopen);
        }
        if (title === 'Blizzard Battle.net Login') {
          this.error('A login is required to open Warcraft');
          gameState.updateGameState({action: 'nothing'});
          return false;
        }
        if (title === 'Battle.net') {
          battleNetWindow = window;
        }
      }
      if (!battleNetWindow) {
        if (callCount % 2 == 0) {
          shell.openPath(
            settings.values.client.warInstallLoc + '\\_retail_\\x86_64\\Warcraft III.exe',
          );
        }
        await sleep(3000);
        return await this.openWarcraft(region, callCount + 3, reopen);
      }
      await battleNetWindow.focus();
      await battleNetWindow.move({x: 0, y: 0});
      await sleep(100);
      const targetRegion = {asia: 1, eu: 2, us: 3, usw: 3, kr: 1, '': 0}[region];
      try {
        if (targetRegion > 0 && gameState.values.selfRegion !== region) {
          this.info(`Changing region to ${region}`);
          const changeRegionButton = await battleNetWindow.find(elements.menuItem({title: 'Regions', role: 'widget'}));
          if(changeRegionButton.region){
            mouse.setPosition(await centerOf(changeRegionButton.region));
            await mouse.leftClick();
          }
          const targetRegionTitle = {asia: 'Asia', eu: 'Europe', us: 'Americas', usw: 'Americas', kr: 'Asia', '': 0}[region];
          const regionButtons = await battleNetWindow.find(elements.menuItem({id: new RegExp(/DropdownMenu_7_\d/,'g'),type: 'MenuItem', role: 'menuitem', title: targetRegionTitle}));
          if(regionButtons.region){
            mouse.setPosition(await centerOf(regionButtons.region));
            await mouse.leftClick();
          }
          this.info(`Changed region to ${region}`);
        }
        const playButtonElement = await battleNetWindow.find(windowElementDescribedBy({id: 'play-btn-main'}));
        if(!playButtonElement?.region) return false;
        const playRegionCenter = await centerOf(playButtonElement.region);
        await mouse.setPosition(playRegionCenter);
        await mouse.doubleClick(0);
        this.info('Found and clicked play');
        for (let i = 0; i < 20; i++) {
          if (await this.isWarcraftOpen()) {
            this.info('Warcraft is now open.');
            gameState.updateGameState({action: 'nothing'});
            this.openingWarcraft = false;
            return true;
          }
          await sleep(100);
        }
      } catch (e) {
        this.error('Failed image recognition: ' + e);
        // Add 5 to call count since OCR takes longer
        return await this.openWarcraft(region, callCount + 15);
      }
      this.error('Failed to open Warcraft.');
      gameState.updateGameState({action: 'nothing'});
      this.openingWarcraft = false;
      return false;
    } catch (e) {
      this.error(e);
      gameState.updateGameState({action: 'nothing'});
      this.openingWarcraft = false;
      return false;
    }
  }

  async handleBnetLogin() {
    if (settings.values.client.bnetUsername && settings.values.client._bnetPassword) {
      this.info('Attempting to login to Battle.net.');
      clipboard.writeText(settings.values.client.bnetUsername);
      await keyboard.type(Key.Tab);
      await keyboard.type(Key.LeftControl, Key.V);
      await keyboard.type(Key.Tab);
      clipboard.writeText(settings.values.client._bnetPassword);
      await keyboard.type(Key.LeftControl, Key.V);
      await keyboard.type(Key.Enter);
    }
  }

  async sendInGameChat(chat: string) {
    const newChatSplit = chat.match(/.{1,125}/g);
    if (newChatSplit) {
      this.sendingInGameChat.queue = this.sendingInGameChat.queue.concat(newChatSplit);
      this.info('Queued chat: ' + chat);
    }
    if (this.sendingInGameChat.active) {
      return;
    }
    await warControl.activeWindowWar();
    try {
      if (gameState.values.inGame && warControl.inFocus) {
        this.sendingInGameChat.active = true;
        let nextMessage = this.sendingInGameChat.queue.shift();
        while (nextMessage) {
          if (gameState.values.inGame && warControl.inFocus) {
            this.info('Sending chat: ' + nextMessage);
            clipboard.writeText(nextMessage);
            await mouse.leftClick();
            await keyboard.type(Key.LeftShift, Key.Enter);
            await keyboard.type(Key.LeftControl, Key.V);
            await keyboard.type(Key.Enter);
            nextMessage = this.sendingInGameChat.queue.shift();
          } else {
            this.info(
              'Forced to stop sending messages. In Game: ' +
                gameState.values.inGame +
                ' Warcraft in focus: ' +
                warControl.inFocus,
            );
            this.sendingInGameChat.queue.unshift(nextMessage);
            nextMessage = undefined;
          }
        }
      }
      if (this.sendingInGameChat.queue.length === 0) {
        this.info('Chat queue now empty.');
      }
      this.sendingInGameChat.active = false;
      return true;
    } catch (e) {
      this.error(e);
      this.sendingInGameChat.active = false;
      return false;
    }
  }

  async isWarcraftOpen() {
    return await this.checkProcess('Warcraft III.exe');
  }

  async checkProcess(processName: string) {
    const {stdout, stderr} = await exec(
      `tasklist /NH /FI "STATUS eq RUNNING" /FI "USERNAME ne N/A" /FI "IMAGENAME eq ${processName}"`,
    );
    if (stderr) {
      this.error(stderr);
      return false;
    } else {
      if (stdout.includes(processName)) {
        //console.log(`${processName} is running`);
        return true;
      } else {
        //console.log(`${processName} is not running`);
        return false;
      }
    }
  }

  async exitGame(callCount: number = 0): Promise<boolean> {
    if (await this.isWarcraftOpen()) {
      if (callCount < 5) {
        return await this.forceQuitWar();
      } else if (gameState.values.menuState === 'LOADING_SCREEN') {
        this.info('Warcraft is loading game, forcing quit');
        return await this.forceQuitWar();
      } else {
        this.info('Sending Exit Game');
        gameSocket.sendMessage({ExitGame: {}});
        await sleep(200);
        return this.exitGame(callCount + 1);
      }
    } else {
      this.info('Warcraft is no longer open.');
      return true;
    }
  }

  async forceQuitWar(): Promise<boolean> {
    return await this.forceQuitProcess('Warcraft III.exe');
  }

  async forceQuitProcess(processName: string): Promise<boolean> {
    if (await this.checkProcess(processName)) {
      this.info(processName + ' is still running, forcing quit');
      try {
        const {stderr} = await exec(`taskkill /F /IM "${processName}"`);
        if (stderr) {
          this.error(stderr);
          return true;
        }
      } catch (e) {
        await sleep(200);
        return await this.forceQuitWar();
      }
      await sleep(200);
      return await this.forceQuitWar();
    } else {
      this.info(processName + ' force quit.');
      return true;
    }
  }

  async activeWindowWar(): Promise<Window | false> {
    const warcraftOpenCheck = await this.isWarcraftOpen();
    let height = 1080;
    let activeWindow: Window | false = false;
    if (this.isOpen && !warcraftOpenCheck) {
      this.isOpen = warcraftOpenCheck;
      this.notification(
        'Warcraft is not open',
        'An action was attempted but Warcraft was not open',
      );
      height = await screen.height();
    } else {
      this.isOpen = warcraftOpenCheck;
      activeWindow = await getActiveWindow();
      const title = await activeWindow.title;
      const focused = title === 'Warcraft III';
      // Ensure that a notification is only sent the first time, if warcraft was focused before, but is no longer
      if (!focused && this.inFocus) {
        this.notification(
          'Warcraft is not in focus',
          'An action was attempted but Warcraft was not in focus',
        );
      }
      this.inFocus = focused;
      if (this.inFocus) {
        this.windowRegion = await activeWindow.region;
        height = this.windowRegion.height;
      }
    }
    this.setResourceDir(height);
    return activeWindow;
  }

  setResourceDir(height: number) {
    let targetRes = '1080/';
    if (height > 1440) {
      targetRes = '2160/';
    } else if (height < 900) {
      targetRes = '720/';
    }
    mouse.config.mouseSpeed = parseInt(targetRes) * 2;
    if (this.isPackaged) {
      screen.config.resourceDirectory = join(app.getAppPath(), '..\\images', targetRes);
    } else {
      screen.config.resourceDirectory = join(this.appPath, '\\buildResources\\images', targetRes);
    }
  }
}

export const warControl = new WarControl();
