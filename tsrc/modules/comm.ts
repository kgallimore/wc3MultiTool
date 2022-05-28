import { Module } from "../moduleBase";
import type { GameState } from "../utility";
import type { MicroLobbyData } from "wc3mt-lobby-container";

import { WebSocket } from "ws";
import { HubReceive, isValidUrl, SettingsUpdate, GameStateUpdate } from "../utility";
import type { LobbyUpdates } from "wc3mt-lobby-container";

import { settings } from "./../globals/settings";

export class Comm extends Module {
  commSocket: WebSocket | null = null;
  retrySetup: NodeJS.Timeout | null = null;

  constructor(baseModule: {
    gameState: GameState;
    identifier: string;
    lobby?: MicroLobbyData;
  }) {
    super(baseModule);
    this.initialize(settings.client.commAddress);
  }

  updateGameState(updates: GameStateUpdate): boolean {
    let updated = super.updateGameState(updates);
    if (updated) {
      this.commSend({
        gameStateUpdate: updates,
      });
    }
    return updated;
  }

  updateSettings(updates: SettingsUpdate): boolean {
    let updated = super.updateSettings(updates);
    if (updated) {
      this.commSend({
        settingsUpdate: updates,
      });
    }
    return updated;
  }

  updateLobby(update: LobbyUpdates): { isUpdated: boolean; events: LobbyUpdates[] } {
    let updates = super.updateLobby(update);
    if (updates.isUpdated) {
      this.commSend({
        lobbyUpdates: update,
      });
    }
    return updates;
  }

  private initialize(address: string) {
    if (this.retrySetup) {
      clearTimeout(this.retrySetup);
      this.retrySetup = null;
    }
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
        this.commSend({ settings });
        this.commSend({ gameState: this.gameState });
      };
      this.commSocket.onclose = () => {
        this.emitInfo("Disconnected from comm");
        this.commSocket = null;
        this.retrySetup = setTimeout(() => {
          this.initialize(address);
        }, 1000);
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
    if (settings.client.commAddress) {
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
