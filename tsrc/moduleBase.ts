import { Module } from "./moduleBasePre";
import { lobbyControl } from "./modules/lobbyControl";

import type { LobbyUpdates } from "wc3mt-lobby-container";
export type Listeners =
  | "settingsUpdate"
  | "gameStateUpdates"
  | "webUIEvent"
  | "gameSocketEvent"
  | "lobbyUpdate";
export class ModuleBase extends Module {
  protected lobby = lobbyControl;

  constructor(name: string, options?: { listeners?: Array<Listeners> }) {
    super(name, options);
    if (options?.listeners && "lobbyUpdate" in options.listeners) {
      this.lobby.on("lobbyUpdate", this.onLobbyUpdate.bind(this));
    }
  }

  protected onLobbyUpdate(updates: LobbyUpdates) {}
}
