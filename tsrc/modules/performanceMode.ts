import { SettingsUpdates } from "./../globals/settings";
import { Module } from "../moduleBase";

import { existsSync, renameSync } from "fs";
import Store from "electron-store";
import { GameSocketEvents } from "./../globals/gameSocket";
const store = new Store();

class PerformanceMode extends Module {
  warInstallLoc: string;

  constructor() {
    super();
    this.warInstallLoc = store.get("warInstallLoc") as string;
    this.togglePerformanceMode(this.settings.values.client.performanceMode);
  }

  protected onSettingsUpdate(updates: SettingsUpdates): void {
    if (updates.client?.performanceMode !== undefined) {
    }
  }

  protected onGameSocketEvent(events: GameSocketEvents): void {
    if (events.OnNetProviderInitialized && this.settings.values.client.performanceMode) {
      setTimeout(autoHostGame, 1000);
    }
  }

  togglePerformanceMode(enabled: boolean) {
    if (enabled) {
      if (existsSync(this.warInstallLoc + "\\_retail_\\webui\\GlueManagerAltered.js")) {
        renameSync(
          this.warInstallLoc + "\\_retail_\\webui\\GlueManagerAltered.js",
          this.warInstallLoc + "\\_retail_\\webui\\GlueManagerAltered.js.bak"
        );
      }
    } else {
      if (
        existsSync(this.warInstallLoc + "\\_retail_\\webui\\GlueManagerAltered.js.bak")
      ) {
        renameSync(
          this.warInstallLoc + "\\_retail_\\webui\\GlueManagerAltered.js.bak",
          this.warInstallLoc + "\\_retail_\\webui\\GlueManagerAltered.js"
        );
      }
    }
  }
}

export const performanceMode = new PerformanceMode();
