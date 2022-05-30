import EventEmitter from "events";
import { LobbyUpdates } from "wc3mt-lobby-container";

import { gameState, GameState } from "./globals/gameState";
import { settings } from "./globals/settings";
import { identifier } from "./globals/identifier";

import type { SEEventEvent } from "./modules/stream";
import type { LobbyControl } from "./modules/lobbyControl";

import type { SettingsUpdates } from "./globals/settings";

export interface EmitEvents {
  lobbyUpdate?: LobbyUpdates;
  error?: string;
  info?: string;
  sendGameChat?: string;
  newProgress?: { step: string; progress: number };
  sendGameMessage?: { type: string; payload: any };
  newTip?: SEEventEvent | SEEventEvent[];
  notification?: { title: string; body: string };
  newGameState?: { key: keyof GameState; value: string | boolean };
}

/**
 *
 *
 * @export
 * @class Module
 * @extends {EventEmitter}
 */
export class Module extends EventEmitter {
  protected gameState = gameState;
  protected identifier = identifier;
  protected settings = settings;
  protected lobby: LobbyControl | null = null;

  constructor(includeLobby: boolean = true) {
    super();
    settings.on("settingsUpdate", this.onSettingsUpdate);
    gameState.on("gameStateUpdate", this.onGameStateUpdate);
    if (includeLobby) {
      this.lobby = require("./modules/lobbyControl");
    }
  }

  /**
   *
   *
   * @protected
   * @param {Partial<GameState>} updates
   * A list of all new gameState values
   * @memberof Module
   */
  protected onGameStateUpdate(updates: Partial<GameState>) {}

  /**
   *
   *
   * @protected
   * @param {SettingsUpdates} updates
   * A list of all new settings values
   * @memberof Module
   *
   */
  protected onSettingsUpdate(updates: SettingsUpdates) {}

  updateLobby(update: LobbyUpdates): {
    isUpdated: boolean;
    events: LobbyUpdates[];
  } {
    if (update.newLobby) {
      return { isUpdated: true, events: [update] };
    }
    return { isUpdated: false, events: [] };
  }

  protected emitEvent(data: EmitEvents) {
    this.emit("event", data);
  }

  protected emitError(error: string) {
    this.emitEvent({ error });
  }

  protected emitInfo(info: string) {
    this.emitEvent({ info });
  }

  protected emitUpdate(lobbyUpdate: LobbyUpdates) {
    this.emitEvent({ lobbyUpdate });
  }

  protected sendGameChat(sendGameChat: string) {
    this.emitEvent({ sendGameChat });
  }

  protected emitProgress(step: string, progress: number) {
    this.emitEvent({ newProgress: { step, progress } });
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

  protected emitUpdateGameState(key: keyof GameState, value: string | boolean) {
    this.emitEvent({ newGameState: { key, value } });
  }
}
