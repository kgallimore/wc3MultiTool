import { Global } from "../globalBase";

import { getTargetRegion } from "../utility";
import { shell, app } from "electron";
import { settings } from "./settings";
import { gameState } from "./gameState";
import { gameSocket } from "./gameSocket";

import Store from "electron-store";
const store = new Store();

import {
  Window,
  keyboard,
  Key,
  screen,
  getActiveWindow,
  mouse,
  getWindows,
  centerOf,
  imageResource,
  Point,
  left,
  right,
  up,
  Region,
  sleep,
} from "@nut-tree/nut-js";
import { join } from "path";
require("@nut-tree/nl-matcher");
import { clipboard } from "electron";
import { promisify } from "util";

const exec = promisify(require("child_process").exec);

import type { Regions } from "wc3mt-lobby-container";

class WarControl extends Global {
  inFocus: boolean = false;
  isOpen: boolean = false;
  windowRegion: Region | null = null;
  warInstallLoc: string;
  isPackaged: boolean = false;
  appPath: string;
  sendingInGameChat: { active: boolean; queue: string[] } = { active: false, queue: [] };

  constructor() {
    super("War Control");
    screen.height().then((height) => {
      this.setResourceDir(height);
    });
    this.warInstallLoc = store.get("warInstallLoc") as string;
    this.appPath = app.getAppPath();
    this.isPackaged = app.isPackaged;
  }

  async openWarcraft(
    region: Regions | "" = "",
    callCount = 0,
    focusAttempted = false
  ): Promise<boolean> {
    gameState.updateGameState({ action: "openingWarcraft" });
    try {
      if (callCount > 60) {
        this.error("Failed to open Warcraft after 60 attempts");
      }
      if (await this.isWarcraftOpen()) {
        this.info("Warcraft is now open");
        gameState.updateGameState({ action: "nothing" });
        return true;
      }
      if (settings.values.client.alternateLaunch) {
        //shell.openPath(warInstallLoc + "\\_retail_\\x86_64\\Warcraft III.exe -launch");
        if (callCount === 0 || callCount % 15 === 0) {
          exec(
            `"${this.warInstallLoc}\\_retail_\\x86_64\\Warcraft III.exe" -launch -uid w3`
          );
        }
        await sleep(1000);
        return await this.openWarcraft(region, callCount + 1);
      }
      let battleNetOpen = await this.checkProcess("Battle.net.exe");
      if (battleNetOpen !== true) {
        shell.openPath(this.warInstallLoc + "\\_retail_\\x86_64\\Warcraft III.exe");
        await sleep(1000);
        return await this.openWarcraft(region, callCount + 1);
      }
      let battleNetWindow;
      let windows = await getWindows();
      for (let window of windows) {
        let title = await window.title;
        if (title === "Battle.net Login") {
          await sleep(1000);
          return await this.openWarcraft(region, callCount + 1);
        }
        if (title === "Blizzard Battle.net Login") {
          this.error("A login is required to open Warcraft");
          gameState.updateGameState({ action: "nothing" });
          return false;
        }
        if (title === "Battle.net") {
          battleNetWindow = window;
        }
      }
      if (!battleNetWindow) {
        if (callCount % 2 == 0) {
          shell.openPath(this.warInstallLoc + "\\_retail_\\x86_64\\Warcraft III.exe");
        }
        await sleep(3000);
        return await this.openWarcraft(region, callCount + 3);
      }
      let activeWindow = await getActiveWindow();
      let activeWindowTitle = await activeWindow.title;
      let screenSize = { width: await screen.width(), height: await screen.height() };
      if (activeWindowTitle !== "Battle.net") {
        let bnetRegion = await battleNetWindow.region;
        if (bnetRegion.left < -bnetRegion.width || bnetRegion.top < -bnetRegion.height) {
          this.info("Battle.net window minimized. Attempting to open the window");
          shell.openPath(this.warInstallLoc + "\\_retail_\\x86_64\\Warcraft III.exe");
          await sleep(1000);
          return await this.openWarcraft(region, callCount + 1, false);
        }
        if (!focusAttempted) {
          this.info("Attempting to focus Battle.net");
          if (this.isPackaged) {
            shell.openPath(join(this.appPath, "../../focusWar.js"));
          } else {
            shell.openPath(join(__dirname, "../focusWar.js"));
          }
          await sleep(1000);
          return await this.openWarcraft(region, callCount + 1, true);
        } else {
          this.error("Failed to focus Battle.net");
          gameState.updateGameState({ action: "nothing" });
          return false;
        }
      }
      let searchRegion = await activeWindow.region;
      searchRegion.width = searchRegion.width * 0.4;
      if (searchRegion.left < 0) {
        //Battle.net window left of screen
        this.info("Move Battle.net window right");
        let targetPosition = new Point(
          searchRegion.left + searchRegion.width - searchRegion.width * 0.12,
          searchRegion.top + 10
        );
        await mouse.setPosition(targetPosition);
        await mouse.pressButton(0);
        await mouse.move(right(searchRegion.left * -1 + 10));
        await mouse.releaseButton(0);
        searchRegion = await activeWindow.region;
      }
      if (searchRegion.left + searchRegion.width > screenSize.width) {
        //Battle.net window right of screen
        this.info("Move Battle.net window left");
        let targetPosition = new Point(searchRegion.left + 10, searchRegion.top + 10);
        await mouse.setPosition(targetPosition);
        await mouse.pressButton(0);
        await mouse.move(
          left(searchRegion.left - (screenSize.width - searchRegion.width) + 10)
        );
        await mouse.releaseButton(0);
      }
      if (searchRegion.top + searchRegion.height > screenSize.height) {
        //Battle.net window bottom of screen
        this.info("Move Battle.net window up");
        let targetPosition = new Point(
          searchRegion.left + searchRegion.width / 2,
          searchRegion.top + 10
        );
        await mouse.setPosition(targetPosition);
        await mouse.pressButton(0);
        await mouse.move(
          up(searchRegion.top - (screenSize.height - searchRegion.height) + 10)
        );
        await mouse.releaseButton(0);
      }
      if (searchRegion.top < 0) {
        // Battle.net window top of screen
        this.error("Battle.net window in inaccessible region.");
        await this.forceQuitProcess("Battle.net.exe");
        return await this.openWarcraft(region, callCount + 1);
      }
      searchRegion = await activeWindow.region;
      searchRegion.height = searchRegion.height * 0.5;
      searchRegion.width = searchRegion.width * 0.4;
      searchRegion.top = searchRegion.top + searchRegion.height;
      if (!region && settings.values.autoHost.regionChange) {
        region = getTargetRegion(
          settings.values.autoHost.regionChangeTimeEU,
          settings.values.autoHost.regionChangeTimeNA
        );
      }
      let targetRegion = { asia: 1, eu: 2, us: 3, usw: 3, "": 0 }[region];
      try {
        if (targetRegion && targetRegion > 0 && gameState.values.selfRegion !== region) {
          this.info(`Changing region to ${region}`);
          let changeRegionPosition = await screen.waitFor(
            imageResource("changeRegion.png"),
            30000,
            100,
            {
              searchRegion,
              confidence: 0.85,
            }
          );
          let changeRegionPositionCenter = await centerOf(changeRegionPosition);
          await mouse.setPosition(changeRegionPositionCenter);
          await mouse.leftClick();
          let newRegionPosition = new Point(
            changeRegionPositionCenter.x,
            changeRegionPositionCenter.y -
              changeRegionPosition.height * targetRegion -
              changeRegionPosition.height / 2
          );
          await mouse.setPosition(newRegionPosition);
          await mouse.leftClick();
          this.info(`Changed region to ${region}`);
        }
        let playRegionCenter = await centerOf(
          screen.waitFor(imageResource("play.png"), 30000, 100, {
            searchRegion,
            confidence: 0.87,
          })
        );
        await mouse.setPosition(playRegionCenter);
        await mouse.leftClick();
        this.info("Found and clicked play");
        for (let i = 0; i < 10; i++) {
          if (await this.isWarcraftOpen()) {
            this.info("Warcraft is now open.");
            gameState.updateGameState({ action: "nothing" });
            return true;
          }
          await sleep(100);
        }
      } catch (e) {
        this.error("Failed image recognition: " + e);
        // Add 5 to call count since OCR takes longer
        return await this.openWarcraft(region, callCount + 15);
      }
      this.error("Failed to open Warcraft.");
      gameState.updateGameState({ action: "nothing" });
      return false;
    } catch (e) {
      this.error(e as string);
      gameState.updateGameState({ action: "nothing" });
      return false;
    }
  }

  async handleBnetLogin() {
    if (settings.values.client.bnetUsername && settings.values.client.bnetPassword) {
      this.info("Attempting to login to Battle.net.");
      clipboard.writeText(settings.values.client.bnetUsername);
      await keyboard.type(Key.Tab);
      await keyboard.type(Key.LeftControl, Key.V);
      await keyboard.type(Key.Tab);
      clipboard.writeText(settings.values.client.bnetPassword);
      await keyboard.type(Key.LeftControl, Key.V);
      await keyboard.type(Key.Enter);
    }
  }

  async sendInGameChat(chat: string) {
    let newChatSplit = chat.match(/.{1,125}/g);
    if (newChatSplit) {
      this.sendingInGameChat.queue = this.sendingInGameChat.queue.concat(newChatSplit);
      this.info("Queued chat: " + chat);
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
            this.info("Sending chat: " + nextMessage);
            clipboard.writeText(nextMessage);
            await mouse.leftClick();
            await keyboard.type(Key.LeftShift, Key.Enter);
            await keyboard.type(Key.LeftControl, Key.V);
            await keyboard.type(Key.Enter);
            nextMessage = this.sendingInGameChat.queue.shift();
          } else {
            this.info(
              "Forced to stop sending messages. In Game: " +
                gameState.values.inGame +
                " Warcraft in focus: " +
                warControl.inFocus
            );
            this.sendingInGameChat.queue.unshift(nextMessage);
            nextMessage = undefined;
          }
        }
      }
      if (this.sendingInGameChat.queue.length === 0) {
        this.info("Chat queue now empty.");
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
    return await this.checkProcess("Warcraft III.exe");
  }

  async checkProcess(processName: string) {
    let { stdout, stderr } = await exec(
      `tasklist /NH /FI "STATUS eq RUNNING" /FI "USERNAME ne N/A" /FI "IMAGENAME eq ${processName}"`
    );
    if (stderr) {
      this.error(stderr);
      return false;
    } else {
      if (stdout.includes(processName)) {
        console.log(`${processName} is running`);
        return true;
      } else {
        console.log(`${processName} is not running`);
        return false;
      }
    }
  }

  async exitGame(callCount: number = 0): Promise<boolean> {
    if (await this.isWarcraftOpen()) {
      if (callCount < 5) {
        return await this.forceQuitWar();
      } else if (gameState.values.menuState === "LOADING_SCREEN") {
        this.info("Warcraft is loading game, forcing quit");
        return await this.forceQuitWar();
      } else {
        this.info("Sending Exit Game");
        gameSocket.sendMessage({ ExitGame: {} });
        await sleep(200);
        return this.exitGame(callCount + 1);
      }
    } else {
      this.info("Warcraft is no longer open.");
      return true;
    }
  }

  async forceQuitWar(): Promise<boolean> {
    return await this.forceQuitProcess("Warcraft III.exe");
  }

  async forceQuitProcess(processName: string): Promise<boolean> {
    if (await this.checkProcess(processName)) {
      this.info(processName + " is still running, forcing quit");
      try {
        let { stdout, stderr } = await exec(`taskkill /F /IM "${processName}"`);
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
      this.info(processName + " force quit.");
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
        "Warcraft is not open",
        "An action was attempted but Warcraft was not open"
      );
      height = await screen.height();
    } else {
      this.isOpen = warcraftOpenCheck;
      activeWindow = await getActiveWindow();
      let title = await activeWindow.title;
      const focused = title === "Warcraft III";
      // Ensure that a notification is only sent the first time, if warcraft was focused before, but is no longer
      if (!focused && this.inFocus) {
        this.notification(
          "Warcraft is not in focus",
          "An action was attempted but Warcraft was not inf focus"
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
    let targetRes = "1080/";
    if (height > 1440) {
      targetRes = "2160/";
    } else if (height < 900) {
      targetRes = "720/";
    }
    mouse.config.mouseSpeed = parseInt(targetRes) * 2;
    if (this.isPackaged) {
      screen.config.resourceDirectory = join(__dirname, "..\\images", targetRes);
    } else {
      screen.config.resourceDirectory = join(this.appPath, "\\src\\images", targetRes);
    }
  }
}

export const warControl = new WarControl();
