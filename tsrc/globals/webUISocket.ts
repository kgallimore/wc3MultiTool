import { Global } from "./../globalBase";

import WebSocket from "ws";
import { settings } from "./settings";
import { gameState, GameState } from "./gameState";
import { gameSocket } from "./gameSocket";

export interface WebUIMessage {
  messageType:
    | "sendMessage"
    | "state"
    | "clientWebSocket"
    | "error"
    | "echo"
    | "info"
    | "toggleAutoHost";
  data: GameState | string;
}

export interface WebUIEvents {
  connected?: true;
  disconnected?: true;
  newState?: GameState;
}

class WebUISocket extends Global {
  wss = new WebSocket.Server({ port: 8888 });
  webUISocket: WebSocket | null = null;

  constructor() {
    super("WebUI Sockets");
    this.wss.on("connection", (ws) => {
      this.info("Connection");
      this.webUISocket = ws;
      this.sendSocket("autoHost", settings.values.autoHost);
      gameState.updateGameState({ connected: true });
      ws.on("message", this.handleWebUIMessage.bind(this));
      ws.on("close", () => {
        this.warn("Socket closed");
        this.webUISocket = null;
        gameState.updateGameState({ connected: false });
      });
    });
    this.wss.on("error", (err) => {
      if (err.message.includes("EADDRINUSE")) {
        throw new Error(
          "The app may already be open. Check your taskbar or task manager for another instance, or clear port 8888"
        );
      } else {
        this.error(err.message);
        throw err;
      }
    });
  }

  sendSocket(messageType = "info", data: string | object = "none") {
    if (this.webUISocket) {
      if (this.webUISocket.readyState === 1) {
        this.webUISocket.send(JSON.stringify({ messageType: messageType, data: data }));
      } else if (this.webUISocket.readyState === 0) {
        setTimeout(() => {
          this.sendSocket(messageType, data);
        }, 100);
      }
    }
  }

  protected emitEvent(event: WebUIEvents) {
    this.emit("webUIEvent", event);
  }

  protected async handleWebUIMessage(message: string) {
    let data = JSON.parse(message) as WebUIMessage;
    if (data.messageType === "clientWebSocket") this.emit("webUIMessage", data);
    switch (data.messageType) {
      case "state":
        if (typeof data.data !== "string" && data.data.menuState) {
          let newState: GameState = data.data as GameState;
          if (newState.menuState) {
            setTimeout(() => {
              gameState.updateGameState(newState);
            }, 250);
          } else {
            gameState.updateGameState(newState);
          }
        } else {
          this.error("New state error: ", data.data);
        }
        break;
      case "clientWebSocket":
        gameSocket.connectGameSocket(data.data as string);
        break;
      case "toggleAutoHost":
        this.info("Toggling autoHost");
        settings.updateSettings({
          autoHost: {
            type: settings.values.autoHost.type === "off" ? "lobbyHost" : "off",
          },
        });
        this.sendSocket("autoHost", settings.values.autoHost);
      case "error":
        this.error(data);
        //this.sendWindow(data)
        break;
      case "echo":
        //log.verbose(data);
        break;
      case "info":
        this.info(JSON.stringify(data.data));
        break;
      default:
        this.info(data);
    }
  }
}

export const webUISocket = new WebUISocket();
