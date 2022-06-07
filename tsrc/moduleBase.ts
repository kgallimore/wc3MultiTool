import { Global } from "./globalBase";
import type { LobbyUpdates } from "wc3mt-lobby-container";
import type { WindowReceive } from "./utility";

import { gameState, GameState } from "./globals/gameState";
import { settings } from "./globals/settings";
import { identifier } from "./globals/identifier";
import { clientState } from "./globals/clientState";
import { warControl } from "./globals/warControl";
import { gameSocket, GameSocketEvents } from "./globals/gameSocket";
import { webUISocket, WebUIEvents } from "./globals/webUISocket";
import type { mmdResults } from "./modules/replayHandler";

import type { SEEventEvent } from "./modules/stream";
import type { lobbyControl } from "./modules/lobbyControl";

import type { SettingsUpdates } from "./globals/settings";

import { join } from "path";
import { app } from "electron";

export interface EmitEvents {
  lobbyUpdate?: LobbyUpdates;
  newProgress?: { step: string; progress: number };
  sendInGameChat?: string;
  newTip?: SEEventEvent | SEEventEvent[];
  notification?: { title: string; body: string };
  sendWindow?: { messageType: WindowReceive["messageType"]; data: WindowReceive["data"] };
  mmdResults?: mmdResults;
  playSound?: string;
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
  protected warControl = warControl;
  protected lobby: typeof lobbyControl | null = null;

  constructor(includeLobby: boolean = true) {
    super();
    this.settings.on("settingsUpdate", this.onSettingsUpdate.bind(this));
    this.gameState.on("gameStateUpdates", this.onGameStateUpdate.bind(this));
    this.webUISocket.on("event", this.onGameStateUpdate.bind(this));
    this.gameSocket.on("event", this.onGameStateUpdate.bind(this));
    if (includeLobby) {
      import("./modules/lobbyControl").then((exports) => {
        this.lobby = exports.lobbyControl;
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

  protected sendInGameChat(sendInGameChat: string) {
    this.emitEvent({ sendInGameChat });
  }

  protected emitProgress(newProgress?: { step: string; progress: number }) {
    this.emitEvent({ newProgress });
  }

  protected emitNewTip(newTip: SEEventEvent | SEEventEvent[]) {
    this.emitEvent({ newTip });
  }

  protected emitNotification(title: string, body: string) {
    this.emitEvent({ notification: { title, body } });
  }

  protected playSound(playSound: string) {
    this.emitEvent({ playSound });
  }
}
