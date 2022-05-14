import EventEmitter from "events";
import { LobbyUpdates, MicroLobby, MicroLobbyData } from "wc3mt-lobby-container";

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
  identifier: string;
  lobby: MicroLobby | null = null;

  constructor(baseModule: {
    settings: AppSettings;
    gameState: GameState;
    identifier: string;
    lobby?: MicroLobbyData;
  }) {
    super();
    this.settings = baseModule.settings;
    this.gameState = baseModule.gameState;
    this.identifier = baseModule.identifier;
    if (baseModule.lobby) {
      this.lobby = new MicroLobby({ fullData: baseModule.lobby });
    }
  }

  updateGameState(key: keyof GameState, value: string | boolean) {
    (this.gameState[key] as any) = value;
  }

  updateSettings(key: {
    autoHost?: { [key in keyof AppSettings["autoHost"]]: any };
    obs?: { [key in keyof AppSettings["obs"]]: any };
    discord?: { [key in keyof AppSettings["discord"]]: any };
    elo?: { [key in keyof AppSettings["elo"]]: any };
    client?: { [key in keyof AppSettings["client"]]: any };
    streaming?: { [key in keyof AppSettings["streaming"]]: any };
  }) {
    if (key.autoHost) {
      (
        Object.entries(key.autoHost) as Array<[keyof AppSettings["autoHost"], any]>
      ).forEach(([key, newValue]) => {
        (this.settings.autoHost[key] as any) = newValue;
      });
    }
    if (key.obs) {
      (Object.entries(key.obs) as Array<[keyof AppSettings["obs"], any]>).forEach(
        ([key, newValue]) => {
          (this.settings.obs[key] as any) = newValue;
        }
      );
    }
    if (key.discord) {
      (Object.entries(key.discord) as Array<[keyof AppSettings["discord"], any]>).forEach(
        ([key, newValue]) => {
          (this.settings.discord[key] as any) = newValue;
        }
      );
    }
    if (key.elo) {
      (Object.entries(key.elo) as Array<[keyof AppSettings["elo"], any]>).forEach(
        ([key, newValue]) => {
          (this.settings.elo[key] as any) = newValue;
        }
      );
    }
    if (key.client) {
      (Object.entries(key.client) as Array<[keyof AppSettings["client"], any]>).forEach(
        ([key, newValue]) => {
          (this.settings.client[key] as any) = newValue;
        }
      );
    }
    if (key.streaming) {
      (
        Object.entries(key.streaming) as Array<[keyof AppSettings["streaming"], any]>
      ).forEach(([key, newValue]) => {
        (this.settings.streaming[key] as any) = newValue;
      });
    }
  }

  updateLobby(update: LobbyUpdates) {
    if (this.lobby) {
      this.lobby.ingestUpdate(update);
    } else if (update.newLobby) {
      this.lobby = new MicroLobby({ fullData: update.newLobby });
    }
  }

  emitEvent(data: EmitEvents) {
    this.emit("event", data);
  }

  emitError(error: string) {
    this.emitEvent({ error });
  }

  emitInfo(info: string) {
    this.emitEvent({ info });
  }

  emitUpdate(lobbyUpdate: LobbyUpdates) {
    this.emitEvent({ lobbyUpdate });
  }

  sendGameChat(sendGameChat: string) {
    this.emitEvent({ sendGameChat });
  }

  emitProgress(step: string, progress: number) {
    this.emitEvent({ newProgress: { step, progress } });
  }

  emitMessage(type: string, payload: any) {
    this.emitEvent({
      sendGameMessage: {
        type,
        payload,
      },
    });
  }

  emitNewTip(newTip: SEEventEvent | SEEventEvent[]) {
    this.emitEvent({ newTip });
  }

  emitNotification(title: string, body: string) {
    this.emitEvent({ notification: { title, body } });
  }

  emitUpdateGameState(key: keyof GameState, value: string | boolean) {
    this.emitEvent({ newGameState: { key, value } });
  }
}
