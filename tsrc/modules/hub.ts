import { Module } from "../moduleBase";

import { settings, SettingsUpdates } from "./../globals/settings";
import { GameState } from "./../globals/gameState";

import { WebSocket } from "ws";
import { HubReceive } from "../utility";
import type { LobbyUpdates } from "wc3mt-lobby-container";

export class HubControl extends Module {
  hubWebSocket: WebSocket | null = null;
  isPackaged: boolean;
  appVersion: string;
  #heartBeatTimer: NodeJS.Timeout | null = null;

  constructor(isPackaged: boolean, appVersion: string) {
    super();
    this.isPackaged = isPackaged;
    this.appVersion = appVersion;
    this.socketSetup();
  }

  onGameStateUpdate(updates: Partial<GameState>): void {
    this.sendToHub({
      gameStateUpdates: updates,
    });
  }

  onSettingsUpdate(updates: SettingsUpdates): void {
    this.sendToHub({
      settingsUpdates: updates,
    });
  }

  protected onLobbyUpdate(updates: LobbyUpdates): void {
    this.sendToHub({
      lobbyUpdates: updates,
    });
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
      if (
        this.lobby?.microLobby?.lobbyStatic &&
        (!settings.values.autoHost.private || !this.isPackaged)
      ) {
        this.sendToHub({
          lobbyUpdates: { newLobby: this.lobby.microLobby.exportMin() },
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
