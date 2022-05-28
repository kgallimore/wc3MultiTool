import EventEmitter from "events";
import { LobbyUpdates, MicroLobby, MicroLobbyData } from "wc3mt-lobby-container";

import type { SEEventEvent } from "./modules/stream";

import type { GameState, SettingsUpdate, GameStateUpdate } from "./utility";

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
  protected gameState: GameState;
  protected identifier: string;
  protected lobby: MicroLobby | null = null;
  protected gameStateUpdater: GameState;

  constructor(baseModule: {
    gameState: GameState;
    identifier: string;
    lobby?: MicroLobbyData;
  }) {
    super();
    this.gameState = baseModule.gameState;
    this.identifier = baseModule.identifier;
    if (baseModule.lobby) {
      this.lobby = new MicroLobby({ fullData: baseModule.lobby });
    }
    this.gameStateUpdater = new Proxy<GameState>(this.gameState, {
      set: (target, key: keyof GameState, value) => {
        if (key in target && target[key] !== value) {
          this.emitUpdateGameState(key, value);
          // @ts-expect-error Not sure why this is 'never'
          target[key] = value;
        }
        return true;
      },
    });
  }

  updateGameState(update: GameStateUpdate): boolean {
    // Do validation at base module so that modules don't have to worry about it.
    if (update.key in this.gameState && this.gameState[update.key] !== update.value) {
      // @ts-expect-error Not sure why this is 'never'
      this.gameState[update.key] = update.value;
      return true;
    }
    return false;
  }

  updateSettings(updates: SettingsUpdate): boolean {
    return true;
  }

  updateLobby(update: LobbyUpdates): {
    isUpdated: boolean;
    events: LobbyUpdates[];
  } {
    if (update.newLobby) {
      this.lobby = new MicroLobby({ fullData: update.newLobby });
      return { isUpdated: true, events: [update] };
    }
    if (this.lobby) {
      return this.lobby.ingestUpdate(update);
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
