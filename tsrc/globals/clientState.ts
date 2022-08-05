import { Global } from "../globalBase";
import Store from "electron-store";

import type { PickByValue } from "./../utility";
import { v4 as publicIP } from "public-ip";
import { lookup } from "fast-geoip";

export interface ClientState {
  tableVersion: number;
  latestUploadedReplay: number;
  currentStep: string;
  currentStepProgress: number;
  vpnActive: "us" | "eu" | false;
  currentIP: string;
  ipCountry: string;
  ipIsEU: boolean;
}

class ClientStateSingle extends Global {
  private _store = new Store();
  private _values: ClientState;
  constructor() {
    super("Client State");
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
      vpnActive: false,
      currentIP: "",
      ipCountry: "",
      ipIsEU: false,
    };
    this.getPublicIP();
  }

  get values() {
    return this._values;
  }

  set values(value: ClientState) {
    throw new Error("Can not set values directly. Use updateClientState.");
  }

  async getPublicIP(): Promise<{
    current: string;
    country: string;
    isEU: boolean;
    old?: string;
  }> {
    let retVal: { current: string; country: string; isEU: boolean; old?: string };
    let ip = await publicIP();
    let oldVal: string = "";
    if (ip !== this._values.currentIP) {
      oldVal = this._values.currentIP;
      this.updateClientState({ currentIP: ip });
      let ipLookup = await lookup(ip);
      if (ipLookup) {
        this.updateClientState({
          ipIsEU: ipLookup.eu === "1",
          ipCountry: ipLookup.country,
        });
      } else {
        this.error("IP lookup failed.");
      }
    }
    retVal = {
      current: ip,
      country: this._values.ipCountry,
      isEU: this._values.ipIsEU,
      old: oldVal,
    };
    return retVal;
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
