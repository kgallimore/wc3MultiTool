import { Global } from "../globalBase";
import Store from "electron-store";

import type { PickByValue } from "./../utility";

export interface ClientState {
  tableVersion: number;
  latestUploadedReplay: number;
  currentStep: string;
  currentStepProgress: number;
}

class ClientStateSingle extends Global {
  private _store = new Store();
  private _values: ClientState;
  constructor() {
    super();
    // Get the tableVersion, if it's not set then we are going to create the most up to date table, so we set it to the most recent version.
    let tableVersion: number = this._store.get("tableVersion") as number;
    if (!tableVersion) {
      tableVersion = 2;
      this._store.set("tableVersion", 2);
    }
    this._values = {
      tableVersion,
      latestUploadedReplay: (this._store.get("latestUploadedReplay") as number) ?? 0,
      currentStep: "",
      currentStepProgress: 0,
    };
  }

  get values() {
    return this._values;
  }

  set values(value: ClientState) {
    throw new Error("Can not set values directly. Use updateClientState.");
  }

  updateClientState(values: Partial<ClientState>) {
    let updates: Partial<ClientState> = {};
    (
      Object.entries(values) as {
        [K in keyof ClientState]: [
          keyof PickByValue<ClientState, ClientState[K]>,
          ClientState[K]
        ];
      }[keyof ClientState][]
    ).forEach(([key, value]) => {
      if (
        key in this._values &&
        typeof this._values[key] === typeof value &&
        this._values[key] !== value
      ) {
        // @ts-expect-error This works
        updates[key] = value;
        // @ts-expect-error This works
        this._values[key] = value;
      }
    });
    if (Object.keys(updates).length > 0) {
      this.emit("clientStateUpdates", updates);
    }
  }
}

export const clientState = new ClientStateSingle();
