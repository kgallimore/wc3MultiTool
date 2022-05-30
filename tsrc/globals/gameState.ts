import EventEmitter from "events";

import { BattleTagRegex, Regions } from "wc3mt-lobby-container";

import { PickByValue } from "./../utility";

export type MenuStates =
  | "OUT_OF_MENUS"
  | "MAIN_MENU"
  | "CUSTOM_LOBBIES"
  | "GAME_LOBBY"
  | "LOADING_SCREEN"
  | "SCORE_SCREEN"
  | "LOGIN_DOORS"
  | "CUSTOM_GAME_LOBBY"
  | "null";

export type GameStateActions =
  | "openingWarcraft"
  | "creatingLobby"
  | "waitingToLeaveGame"
  | "waitingInLobby"
  | "nothing"
  | "joiningLobby"
  | "leavingLobby"
  | "closingWarcraft";

export interface GameState {
  selfRegion: Regions | "";
  menuState: MenuStates;
  screenState: string;
  selfBattleTag: string;
  inGame: boolean;
  action: GameStateActions;
}

class GameStateContainer extends EventEmitter {
  private _values: GameState = {
    menuState: "OUT_OF_MENUS",
    screenState: "",
    selfBattleTag: "",
    selfRegion: "",
    inGame: false,
    action: "nothing",
  };

  constructor() {
    super();
  }

  get values(): GameState {
    return this._values;
  }

  updateGameState(values: Partial<GameState>) {
    let updates: Partial<GameState> = {};
    (
      Object.entries(values) as {
        [K in keyof GameState]: [
          keyof PickByValue<GameState, GameState[K]>,
          GameState[K]
        ];
      }[keyof GameState][]
    ).forEach(([key, value]) => {
      if (key in this._values && this._values[key] != value) {
        if (key === "inGame" && typeof value === "boolean") {
          this._values[key] = value == true;
        } else if (
          key === "selfBattleTag" &&
          typeof value === "string" &&
          BattleTagRegex.test(value)
        ) {
          this._values[key] = value;
        } else if (
          key === "selfRegion" &&
          typeof value === "string" &&
          ["us", "eu", "usw"].includes(value)
        ) {
          this._values[key] = value as Regions;
        } else if (key === "menuState" && typeof value === "string") {
          this._values[key] = value as GameState["menuState"];
        } else if (key === "screenState" && typeof value === "string") {
          this._values[key] = value;
        } else if (
          key === "action" &&
          typeof value === "string" &&
          [
            "openingWarcraft",
            "creatingLobby",
            "waitingToLeaveGame",
            "waitingInLobby",
            "nothing",
          ].includes(value)
        ) {
          this._values[key] = value as GameStateActions;
        } else {
          this.emit("info", `Invalid value for ${key}`);
          return;
        }
        // @ts-expect-error This is unexpected behavior
        updates[key] = value;
      }
    });
    if (Object.keys(updates).length > 0) {
      this.emit("gameStateUpdates", updates);
    }
  }
}
export const gameState = new GameStateContainer();
