import { ModuleBase } from "../moduleBase";

import { existsSync, rename } from "fs";
import Store from "electron-store";
import { SettingsUpdates } from "./../globals/settings";
import { GameState } from "./../globals/gameState";
const store = new Store();

class PerformanceMode extends ModuleBase {
  warInstallLoc: string;

  constructor() {
    super("Performance Mode", { listeners: ["settingsUpdate", "gameStateUpdates"] });
    this.warInstallLoc = store.get("warInstallLoc") as string;
    this.togglePerformanceMode(this.settings.values.client.performanceMode);
  }

  protected onGameStateUpdate(updates: Partial<GameState>): void {
    if (
      this.settings.values.client.performanceMode &&
      updates.menuState === "LOGIN_DOORS"
    ) {
      setTimeout(() => {
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
          this.info("Triggering performanceMode bypass.");
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
      if (existsSync(this.warInstallLoc + "\\_retail_\\webui\\GlueManagerAltered.js")) {
        rename(
          this.warInstallLoc + "\\_retail_\\webui\\GlueManagerAltered.js",
          this.warInstallLoc + "\\_retail_\\webui\\GlueManagerAltered.js.bak",
          (err) => {
            if (err) {
              this.error("Error enabling performance mode.", err);
            } else {
              this.info("Enabling performance mode");
            }
          }
        );
      }
    } else {
      if (
        existsSync(this.warInstallLoc + "\\_retail_\\webui\\GlueManagerAltered.js.bak")
      ) {
        rename(
          this.warInstallLoc + "\\_retail_\\webui\\GlueManagerAltered.js.bak",
          this.warInstallLoc + "\\_retail_\\webui\\GlueManagerAltered.js",
          (err) => {
            if (err) {
              this.error("Error disabling performance mode.", err);
            } else {
              this.info("Disabling performance mode");
            }
          }
        );
      }
    }
  }
}

export const performanceMode = new PerformanceMode();
