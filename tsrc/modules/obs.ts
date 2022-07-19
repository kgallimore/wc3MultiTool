import { ModuleBase } from "../moduleBase";

import type { SettingsUpdates } from "./../globals/settings";

import OBSWebSocket from "obs-websocket-js";
import type { GameState } from "./../globals/gameState";
import { Key, keyboard } from "@nut-tree/nut-js";
import { LobbyUpdatesExtended } from "./lobbyControl";
import { writeFileSync } from "fs";
import { join } from "path";
import { app } from "electron";

export interface ObsHotkeys {
  key: string;
  altKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
}

class OBSSocket extends ModuleBase {
  socket: OBSWebSocket | null = null;

  constructor() {
    super("OBS", { listeners: ["gameStateUpdates", "settingsUpdate", "lobbyUpdate"] });
    this.setup();
  }

  protected onLobbyUpdate(updates: LobbyUpdatesExtended): void {
    if (
      updates.playerPayload ||
      updates.playerData ||
      updates.newLobby ||
      updates.leftLobby
    ) {
      if (this.settings.values.obs.textSource) {
        writeFileSync(
          join(app.getPath("documents"), "wc3mt.txt"),
          this.lobby.exportTeamStructureString()
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
      this.settings.values.obs.sceneSwitchType !== "websockets"
    ) {
      return;
    }
    let address = this.settings.values.obs.address;
    let password = this.settings.values.obs.token;
    if (!address) {
      return;
    }
    this.socket = new OBSWebSocket();
    this.socket
      .connect({ address, password })
      .then(() => {
        console.log("OBS connection started");
      })
      .catch((e) => console.error(e));
    this.socket.on("ConnectionOpened", (data) => console.log("OBS connection opened"));
    this.socket.on("ConnectionClosed", (data) => console.warn("OBS connection closed"));
    this.socket.on("AuthenticationSuccess", (data) =>
      console.log("OBS authentication succeeded")
    );
    this.socket.on("AuthenticationFailure", (data) =>
      console.warn("OBS authentication failure")
    );
    this.socket.on("error", (err) => {
      console.error("socket error:", err);
    });
    this.socket.on("SwitchScenes", (data) => {
      console.log(`New Active Scene: ${data["scene-name"]}`);
    });
  }

  private buildKeys(keys: ObsHotkeys): Array<Key> {
    let modifiers: Array<Key> = [];
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
        this.settings.values.obs.sceneSwitchType === "websockets" &&
        this.socket &&
        this.settings.values.obs.outOfGameWSScene
      ) {
        this.info("Triggering OBS Websocket Out of Game");
        this.socket.send("SetCurrentScene", {
          "scene-name": this.settings.values.obs.outOfGameWSScene,
        });
      } else if (
        this.settings.values.obs.sceneSwitchType === "hotkeys" &&
        this.settings.values.obs.outOfGameHotkey
      ) {
        this.info("Triggering OBS Hotkey Out of Game");
        let modifiers = this.buildKeys(this.settings.values.obs.outOfGameHotkey);

        keyboard
          .type(
            ...modifiers,
            // @ts-expect-error This works
            Key[this.settings.values.obs.outOfGameHotkey.key.toUpperCase()]
          )
          .catch((e: any) => {
            this.error("Failed to trigger OBS Out of Game: " + e.toString());
          });
      }
    } else if (this.gameState.values.inGame) {
      if (
        this.settings.values.obs.sceneSwitchType === "websockets" &&
        this.socket &&
        this.settings.values.obs.inGameWSScene
      ) {
        this.info("Triggering OBS Websocket In Game");
        this.socket.send("SetCurrentScene", {
          "scene-name": this.settings.values.obs.inGameWSScene,
        });
      } else if (
        this.settings.values.obs.sceneSwitchType === "hotkeys" &&
        this.settings.values.obs.inGameHotkey
      ) {
        this.info("Triggering OBS Hotkey In Game");
        let modifiers = this.buildKeys(this.settings.values.obs.inGameHotkey);
        keyboard
          .type(
            ...modifiers,
            // @ts-expect-error This works
            Key[this.settings.values.obs.inGameHotkey.key.toUpperCase()]
          )
          .catch((e) => {
            this.error("Failed to trigger OBS In-Game" + e);
          });
      }
    }
  }
}

export const obsSocketSingle = new OBSSocket();
