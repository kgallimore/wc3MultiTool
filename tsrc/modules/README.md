# Creating a new Module

Each module is a class that extends the `BaseModule` class. You initiate each module and listen to updates to the gameState or settings with this base:

```ts
import { Module } from "../moduleBase";
import type { GameState, AppSettings } from "../utility";
import { MicroLobbyData } from "wc3mt-lobby-container";

export class NewModule extends Module {
    // Declare any additional args

  constructor(baseModule: {
    settings: AppSettings;
    gameState: GameState;
    identifier: string;
    lobby?: MicroLobbyData;
  }  //, ...args[]
  ) {
    super(baseModule);
    // Initialize any other args
  }

  updateGameState(key: keyof GameState, value: string | boolean) {
        // Do something with the new game state. Super can be called before or after
        super()
    }

    updateSettings(key: {
        autoHost?: { [key in keyof AppSettings["autoHost"]]: any };
        obs?: { [key in keyof AppSettings["obs"]]: any };
        discord?: { [key in keyof AppSettings["discord"]]: any };
        elo?: { [key in keyof AppSettings["elo"]]: any };
        client?: { [key in keyof AppSettings["client"]]: any };
        streaming?: { [key in keyof AppSettings["streaming"]]: any };
    }) {
        // A list of all updated key value pairs for each section of the settings is available. You can choose to only listen to specific keys or sections.
        // Do something with the new settings. Super can be called before or after
        super()

    }

    updateLobby(update: LobbyUpdates) {
        // Do something with the new lobby data. Super can be called before or after
        super()
    }
}
```

The identifier is a unique code that is used to differentiate different instances of an app. Its main use is when connecting to the central hub or a comm server.
