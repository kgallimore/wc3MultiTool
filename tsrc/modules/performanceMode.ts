import { ModuleBase } from "../moduleBase";

import { existsSync, renameSync } from "fs";
import Store from "electron-store";
import { SettingsUpdates } from "./../globals/settings";
import { GameSocketEvents } from "./../globals/gameSocket";
const store = new Store();

class PerformanceMode extends ModuleBase {
  warInstallLoc: string;

  constructor() {
    super({ listeners: ["settingsUpdate"] });
    this.warInstallLoc = store.get("warInstallLoc") as string;
    this.togglePerformanceMode(this.settings.values.client.performanceMode);
  }

  protected onGameSocketEvent(events: GameSocketEvents): void {
    if (
      this.settings.values.client.performanceMode &&
      events.SetGlueScreen?.screen === "LOGIN_DOORS"
    ) {
      [
        "GetLocalPlayerName",
        "FriendsGetInvitations",
        "FriendsGetFriends",
        "MultiplayerSendRecentPlayers",
        "ClanGetClanInfo",
        "ClanGetMembers",
        "StopOverworldMusic",
        "StopAmbientSound",
        "LoginDoorClose",
        "StopAmbientSound",
        "StopAmbientSound",
        "OnWebUILoad",
      ].forEach((message, index) => {
        setTimeout(() => {
          this.gameSocket.sendMessage({ [message]: {} });
        }, 50 * index);
      });
    }
  }

  onSettingsUpdate(updates: SettingsUpdates) {
    if (updates.client?.performanceMode !== undefined) {
      this.togglePerformanceMode(updates.client.performanceMode);
    }
  }

  private togglePerformanceMode(enabled: boolean) {
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
