# Creating a new Module

Each module is a class that extends the `BaseModule` class. You initiate each module and listen to updates to the gameState or settings with this base:

```ts
import { Module } from "../moduleBase";
import type { GameState, AppSettings } from "../utility";

// Only import the types you want to listen to
import type { SettingsUpdates } from "./../globals/settings";
import type { GameState } from "./../globals/gameState";
import { LobbyUpdates } from "wc3mt-lobby-container";

class NewModule extends Module {
    // Declare any additional args

  constructor() {
    super();
    // Initialize any other args
  }

  // This is optional. You only need to include it if you want to listen to GameState updates
  onGameStateUpdate(updates: Partial<GameState>) {
    // Do something with the new game state. Only new values will be fed.
  }

  // This is optional. You only need to include it if you want to listen to Settings updates
  onSettingsUpdate(updates: SettingsUpdates) {
    // Do something with the new game state. Only new values will be present.
  }

  // This is optional. You only need to include it if you want to listen to Lobby updates
  onLobbyUpdate(updates: LobbyUpdates) {
    // Do something with the new lobby data. Super can be called before or after
  }
}

export const NewMod = new NewModule();
```

The identifier is a unique code that is used to differentiate different instances of an app. Its main use is when connecting to the central hub or a comm server.
