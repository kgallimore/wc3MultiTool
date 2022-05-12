import EventEmitter from "events";
import type { LobbyUpdates } from "wc3mt-lobby-container";

import type { SEEventEvent } from "./modules/stream";

import type { GameState, AppSettings } from "./utility";

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

export class Module extends EventEmitter {
  settings: AppSettings;
  gameState: GameState;

  constructor(settings: AppSettings, gameState: GameState) {
    super();
    this.settings = settings;
    this.gameState = gameState;
  }

  updateGameState(key: keyof GameState, value: string | boolean) {
    // @ts-expect-error
    this.gameState[key] = value;
  }

  updateSettings(settings: AppSettings) {
    this.settings = settings;
  }

  event(data: EmitEvents) {
    this.emit("event", data);
  }

  emitError(error: string) {
    this.event({ error });
  }

  emitInfo(info: string) {
    this.event({ info });
  }

  emitUpdate(lobbyUpdate: LobbyUpdates) {
    this.event({ lobbyUpdate });
  }

  sendGameChat(sendGameChat: string) {
    this.event({ sendGameChat });
  }

  emitProgress(step: string, progress: number) {
    this.event({ newProgress: { step, progress } });
  }

  emitMessage(type: string, payload: any) {
    this.event({
      sendGameMessage: {
        type,
        payload,
      },
    });
  }

  emitNewTip(newTip: SEEventEvent | SEEventEvent[]) {
    this.event({ newTip });
  }

  emitNotification(title: string, body: string) {
    this.event({ notification: { title, body } });
  }

  emitUpdateGameState(key: keyof GameState, value: string | boolean) {
    this.event({ newGameState: { key, value } });
  }
}
