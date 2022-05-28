import { Module } from "../moduleBase";
import type { GameState } from "../utility";
import type { MicroLobbyData } from "wc3mt-lobby-container";

import { WebSocket } from "ws";
import { HubReceive, GameStateUpdate, SettingsUpdate } from "../utility";
import type { LobbyUpdates } from "wc3mt-lobby-container";

import { settings } from "./../globals/settings";

export class HubControl extends Module {
  hubWebSocket: WebSocket | null = null;
  isPackaged: boolean;
  appVersion: string;
  #heartBeatTimer: NodeJS.Timeout | null = null;

  constructor(
    baseModule: {
      gameState: GameState;
      identifier: string;
      lobby?: MicroLobbyData;
    },
    isPackaged: boolean,
    appVersion: string
  ) {
    super(baseModule);
    this.isPackaged = isPackaged;
    this.appVersion = appVersion;
    this.socketSetup();
  }

  updateGameState(updates: GameStateUpdate): boolean {
    let updated = super.updateGameState(updates);
    if (updated) {
      this.sendToHub({
        gameStateUpdate: updates,
      });
    }
    return updated;
  }

  updateSettings(updates: SettingsUpdate): boolean {
    let updated = super.updateSettings(updates);
    if (updated) {
      this.sendToHub({
        settingsUpdate: updates,
      });
    }
    return updated;
  }

  updateLobby(update: LobbyUpdates): { isUpdated: boolean; events: LobbyUpdates[] } {
    let updates = super.updateLobby(update);
    if (updates.isUpdated) {
      this.sendToHub({
        lobbyUpdates: update,
      });
    }
    return updates;
  }

  private socketSetup() {
    if (this.#heartBeatTimer) {
      clearTimeout(this.#heartBeatTimer);
      this.#heartBeatTimer = null;
    }
    if (this.isPackaged) {
      this.hubWebSocket = new WebSocket("wss://ws.trenchguns.com/" + this.identifier);
    } else {
      this.hubWebSocket = new WebSocket("wss://wsdev.trenchguns.com/" + this.identifier);
    }
    this.hubWebSocket.onerror = (error) => {
      if (this.isPackaged) this.emitError("Failed hub connection: " + error);
    };
    this.hubWebSocket.onopen = (ev) => {
      if (this.hubWebSocket?.readyState !== WebSocket.OPEN) return;
      this.emitInfo("Connected to hub");
      if (this.lobby?.lobbyStatic && (!settings.autoHost.private || !this.isPackaged)) {
        this.sendToHub({
          lobbyUpdates: { newLobby: this.lobby.exportMin() },
        });
      }
      this.#heartBeatTimer = setInterval(this.hubHeartbeat, 30000);
    };
    this.hubWebSocket.onmessage = (data) => {
      this.emitInfo("Received message from hub: " + data);
    };
    this.hubWebSocket.onclose = (ev) => {
      if (this.isPackaged) this.emitError("Disconnected from hub");
      setTimeout(this.socketSetup, Math.random() * 5000 + 3000);
      if (this.#heartBeatTimer) {
        clearTimeout(this.#heartBeatTimer);
        this.#heartBeatTimer = null;
      }
      this.hubWebSocket = null;
    };
  }

  private hubHeartbeat() {
    if (this.hubWebSocket?.OPEN) {
      this.sendToHub({ heartbeat: true });
    }
  }

  sendToHub(data: HubReceive["data"]) {
    let buildMessage: HubReceive = { data, appVersion: this.appVersion };
    if (this.hubWebSocket && this.hubWebSocket.readyState === WebSocket.OPEN) {
      this.hubWebSocket.send(JSON.stringify(buildMessage));
    }
  }
}
