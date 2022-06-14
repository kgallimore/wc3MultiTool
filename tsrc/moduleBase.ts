import { Module } from "./moduleBasePre";
import { lobbyControl } from "./modules/lobbyControl";

import type { LobbyUpdates } from "wc3mt-lobby-container";

export class ModuleBase extends Module {
  protected lobby = lobbyControl;

  constructor() {
    super();
    this.settings.on("settingsUpdate", this.onSettingsUpdate.bind(this));
    this.gameState.on("gameStateUpdates", this.onGameStateUpdate.bind(this));
    this.webUISocket.on("event", this.onGameStateUpdate.bind(this));
    this.gameSocket.on("event", this.onGameStateUpdate.bind(this));
    this.lobby.on("lobbyUpdate", this.onLobbyUpdate.bind(this));
  }

  protected onLobbyUpdate(updates: LobbyUpdates) {}
}
