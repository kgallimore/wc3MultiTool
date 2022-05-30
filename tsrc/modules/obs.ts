import { Module } from "../moduleBase";

import { SettingsUpdates } from "./../globals/settings";

import OBSWebSocket from "obs-websocket-js";

class OBSSocket extends Module {
  socket: OBSWebSocket | null = null;

  constructor() {
    super();
    this.setup();
  }

  private setup() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    let address = this.settings.values.obs.address;
    let password = this.settings.values.obs.token;
    if (!address) {
      return;
    }
    this.socket = new OBSWebSocket();
    this.socket
      .connect({ address, password })
      .then(() => {
        console.log("OBS connection started");
      })
      .catch((e) => console.error(e));
    this.socket.on("ConnectionOpened", (data) => console.log("OBS connection opened"));
    this.socket.on("ConnectionClosed", (data) => console.warn("OBS connection closed"));
    this.socket.on("AuthenticationSuccess", (data) =>
      console.log("OBS authentication succeeded")
    );
    this.socket.on("AuthenticationFailure", (data) =>
      console.warn("OBS authentication failure")
    );
    this.socket.on("error", (err) => {
      console.error("socket error:", err);
    });
    this.socket.on("SwitchScenes", (data) => {
      console.log(`New Active Scene: ${data["scene-name"]}`);
    });
  }

  onSettingsUpdate(updates: SettingsUpdates) {
    if (updates.obs?.address !== undefined || updates.obs?.token !== undefined) {
      this.setup();
    }
  }

  switchScene(scene: string) {
    if (!this.socket) {
      return;
    }
    this.socket.send("SetCurrentScene", {
      "scene-name": scene,
    });
  }
}

export const obsSocketSingle = new OBSSocket();
