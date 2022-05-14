import { Module } from "../moduleBase";
import type { GameState, AppSettings, HubReceive } from "../utility";
import { MicroLobbyData } from "wc3mt-lobby-container";

export class HubControl extends Module {
  hubWebSocket: WebSocket | null = null;
  isPackaged: boolean;
  appVersion: string;
  constructor(
    baseModule: {
      settings: AppSettings;
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

  socketSetup() {
    if (!this.hubWebSocket) {
    }
    if (this.isPackaged) {
      this.hubWebSocket = new WebSocket("wss://ws.trenchguns.com/" + this.identifier);
    } else {
      this.hubWebSocket = new WebSocket("wss://wsdev.trenchguns.com/" + this.identifier);
    }
    this.hubWebSocket.onerror = (error) => {
      if (app.isPackaged) this.emitError("Failed hub connection: " + error);
    };
    this.hubWebSocket.onopen = (ev) => {
      if (this.hubWebSocket?.readyState !== WebSocket.OPEN) return;
      this.emitInfo("Connected to hub");
      if (
        this.lobby?.lobbyStatic &&
        (!this.settings.autoHost.private || !app.isPackaged)
      ) {
        this.sendToHub("lobbyUpdate", {
          lobbyUpdates: { newLobby: this.lobby.exportMin() },
        });
      }
      setTimeout(this.hubHeartbeat, 30000);
    };
    this.hubWebSocket.onmessage = (data) => {
      this.emitInfo("Received message from hub: " + data);
    };
    this.hubWebSocket.onclose = (ev) => {
      if (app.isPackaged) this.emitError("Disconnected from hub");
      setTimeout(this.socketSetup, Math.random() * 5000 + 3000);
      this.hubWebSocket = null;
    };
  }

  hubHeartbeat() {
    if (this.hubWebSocket?.OPEN) {
      this.sendToHub("heartbeat");
      setTimeout(this.hubHeartbeat, 30000);
    }
  }

  sendToHub(messageType: HubReceive["messageType"], data?: HubReceive["data"]) {
    let buildMessage: HubReceive = { messageType, data, appVersion: this.appVersion };
    if (this.hubWebSocket && this.hubWebSocket.readyState === WebSocket.OPEN) {
      this.hubWebSocket.send(JSON.stringify(buildMessage));
    }
  }
}
