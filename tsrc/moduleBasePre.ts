import { Global } from "./globalBase";
import type { LobbyUpdates } from "wc3mt-lobby-container";
import type { WindowReceive } from "./utility";

import { gameState, GameState } from "./globals/gameState";
import { settings } from "./globals/settings";
import { identifier } from "./globals/identifier";
import { clientState } from "./globals/clientState";
import { warControl } from "./globals/warControl";
import { gameSocket, GameSocketEvents, GameChatMessage } from "./globals/gameSocket";
import { webUISocket, WebUIEvents } from "./globals/webUISocket";
import type { mmdResults } from "./modules/replayHandler";

import type { SEEventEvent } from "./modules/stream";

import type { SettingsUpdates } from "./globals/settings";

export interface EmitEvents {
  lobbyUpdate?: LobbyUpdates;
  sendInGameChat?: string;
  newTip?: SEEventEvent | SEEventEvent[];
  notification?: { title: string; body: string };
  sendWindow?: WindowReceive;
  mmdResults?: mmdResults;
  playSound?: string;
  processedChat?: GameChatMessage["message"] & { translated?: string };
}

export type Listeners =
  | "settingsUpdate"
  | "gameStateUpdates"
  | "webUIEvent"
  | "gameSocketEvent"
  | "lobbyUpdate";

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

  constructor(options?: { listeners?: Array<Listeners> }) {
    super();
    if (options) {
      if (options.listeners) {
        if ("settingsUpdate" in options.listeners) {
          this.settings.on("settingsUpdates", this.onSettingsUpdate.bind(this));
        }
        if ("gameStateUpdates" in options.listeners) {
          this.gameState.on("gameStateUpdates", this.onGameStateUpdate.bind(this));
        }
        if ("webUIEvent" in options.listeners) {
          this.webUISocket.on("webUIEvent", this.onGameStateUpdate.bind(this));
        }
        if ("gameSocketEvent" in options.listeners) {
          this.gameSocket.on("gameSocketEvent", this.onGameStateUpdate.bind(this));
        }
      }
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

  protected onGameSocketEvent(events: GameSocketEvents) {}

  protected onWebUISocketEvent(events: WebUIEvents) {}

  protected emitEvent(data: EmitEvents) {
    this.emit("event", data);
  }

  protected sendWindow(sendWindow: WindowReceive) {
    this.emitEvent({ sendWindow });
  }

  protected sendInGameChat(sendInGameChat: string) {
    this.emitEvent({ sendInGameChat });
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

  protected emitProcessedChat(processedChat: EmitEvents["processedChat"]) {
    this.emitEvent({ processedChat });
  }
}
