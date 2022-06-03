import { Global } from "./globalBase";
import type { LobbyUpdates } from "wc3mt-lobby-container";
import type { WindowReceive } from "./utility";

import { gameState, GameState } from "./globals/gameState";
import { settings } from "./globals/settings";
import { identifier } from "./globals/identifier";
import { clientState } from "./globals/clientState";
import { gameSocket, GameSocketEvents } from "./globals/gameSocket";
import { webUISocket, WebUIEvents } from "./globals/webUISocket";

import type { SEEventEvent } from "./modules/stream";
import type { LobbyControl } from "./modules/lobbyControl";

import type { SettingsUpdates } from "./globals/settings";

export interface EmitEvents {
  lobbyUpdate?: LobbyUpdates;
  sendGameChat?: string;
  newProgress?: { step: string; progress: number };
  sendGameMessage?: { type: string; payload: any };
  newTip?: SEEventEvent | SEEventEvent[];
  notification?: { title: string; body: string };
  sendWindow?: { messageType: WindowReceive["messageType"]; data: WindowReceive["data"] };
}

/**
 *
 *
 * @export
 * @class Module
 * @extends {EventEmitter}
 */
export class Module extends Global {
  protected gameState = gameState;
  protected identifier = identifier;
  protected settings = settings;
  protected clientState = clientState;
  protected webUISocket = webUISocket;
  protected gameSocket = gameSocket;
  protected lobby: LobbyControl | null = null;

  constructor(includeLobby: boolean = true) {
    super();
    this.settings.on("settingsUpdate", this.onSettingsUpdate.bind(this));
    this.gameState.on("gameStateUpdates", this.onGameStateUpdate.bind(this));
    this.webUISocket.on("event", this.onGameStateUpdate.bind(this));
    this.gameSocket.on("event", this.onGameStateUpdate.bind(this));
    if (includeLobby) {
      import("./modules/lobbyControl").then((exports) => {
        this.lobby = exports.LobbySingle;
        this.lobby.on("lobbyUpdate", this.onLobbyUpdate.bind(this));
      });
    }
  }

  /**
   *
   *
   * @param {Partial<GameState>} updates
   * A list of all new gameState values
   * @memberof Module
   */
  protected onGameStateUpdate(updates: Partial<GameState>) {}

  /**
   *
   *
   * @param {SettingsUpdates} updates
   * A list of all new settings values
   * @memberof Module
   *
   */
  protected onSettingsUpdate(updates: SettingsUpdates) {}

  protected onLobbyUpdate(updates: LobbyUpdates) {}

  protected onGameSocketEvent(events: GameSocketEvents) {}

  protected onWebUISocketEvent(events: WebUIEvents) {}

  protected emitEvent(data: EmitEvents) {
    this.emit("event", data);
  }

  protected sendWindow(sendWindow: {
    messageType: WindowReceive["messageType"];
    data: WindowReceive["data"];
  }) {
    this.emitEvent({ sendWindow });
  }

  protected sendGameChat(sendGameChat: string) {
    this.emitEvent({ sendGameChat });
  }

  protected emitProgress(newProgress?: { step: string; progress: number }) {
    this.emitEvent({ newProgress });
  }

  protected emitMessage(type: string, payload: any) {
    this.emitEvent({
      sendGameMessage: {
        type,
        payload,
      },
    });
  }

  protected emitNewTip(newTip: SEEventEvent | SEEventEvent[]) {
    this.emitEvent({ newTip });
  }

  protected emitNotification(title: string, body: string) {
    this.emitEvent({ notification: { title, body } });
  }
}
