import { Module } from "../moduleBase";
import type { GameState } from "../utility";
import type { MicroLobbyData } from "wc3mt-lobby-container";

import { settings } from "./../globals/settings";

import OBSWebSocket from "obs-websocket-js";

export class OBSSocket extends Module {
  socket: OBSWebSocket;

  constructor(
    baseModule: {
      gameState: GameState;
      identifier: string;
      lobby?: MicroLobbyData;
    },
    options?: { address?: string; password?: string }
  ) {
    super(baseModule);
    this.socket = new OBSWebSocket();
    this.socket
      .connect(options)
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

  switchScene(scene: string) {
    try {
      this.socket?.send("SetCurrentScene", {
        "scene-name": scene,
      });
    } catch (e) {
      console.error(e);
    }
  }
}
