import { Module } from "../moduleBase";

import type { SettingsUpdates } from "./../globals/settings";
import { GameState } from "./../globals/gameState";

import { WebSocket } from "ws";
import { HubReceive, isValidUrl } from "../utility";
import type { LobbyUpdates } from "wc3mt-lobby-container";

export class Comm extends Module {
  commSocket: WebSocket | null = null;
  retrySetup: NodeJS.Timeout | null = null;

  constructor() {
    super();
    this.initialize();
  }

  onGameStateUpdate(updates: Partial<GameState>): void {
    this.commSend({
      gameStateUpdates: updates,
    });
  }

  onSettingsUpdate(updates: SettingsUpdates): void {
    this.initialize();
    this.commSend({
      settingsUpdates: updates,
    });
  }

  onLobbyUpdate(updates: LobbyUpdates): void {
    this.commSend({
      lobbyUpdates: updates,
    });
  }

  private initialize() {
    if (this.retrySetup) {
      clearTimeout(this.retrySetup);
      this.retrySetup = null;
    }
    let address = this.settings.values.client.commAddress;
    if (address && isValidUrl(address)) {
      this.emitInfo("Connecting to comm socket: " + address + "/" + this.identifier);

      if (this.commSocket) {
        this.emitInfo("Comm socket already connected. Disconnecting old socket.");
        this.commSocket.close();
        this.commSocket = null;
      }
      this.commSocket = new WebSocket(address + "/" + this.identifier);
      this.commSocket.onopen = () => {
        this.emitInfo("Connected to comm");
        this.commSend({ settings: this.settings.values });
        // TODO Fix this
        //this.commSend({ gameState: this.gameState });
      };
      this.commSocket.onclose = () => {
        this.emitInfo("Disconnected from comm");
        this.commSocket = null;
        this.retrySetup = setTimeout(() => this.initialize, 1000);
      };
      this.commSocket.onerror = (error) => {
        this.emitError("Error in comm: " + error);
        this.commSocket = null;
      };
      this.commSocket.onmessage = (message) => {
        //commandClient(JSON.parse(message.toString()));
      };
    } else {
      this.commSocket = null;
    }
  }

  commSend(data: HubReceive["data"]) {
    if (this.settings.values.client.commAddress) {
      if (this.commSocket) {
        if (this.commSocket.readyState === this.commSocket.OPEN) {
          this.commSocket.send(JSON.stringify(data));
        } else if (this.commSocket.readyState === this.commSocket.CONNECTING) {
          setTimeout(() => {
            this.commSend(data);
          }, 250);
        }
      } else {
        //log.warn("Comm socket not connected.");
      }
    }
  }
}

export const CommSingle = new Comm();
