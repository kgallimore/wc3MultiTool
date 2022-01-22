import OBSWebSocket from "obs-websocket-js";
import EventEmitter from "events";

export class OBSSocket extends EventEmitter {
  socket: OBSWebSocket;

  constructor(options?: { address?: string; password?: string }) {
    super();
    this.socket = new OBSWebSocket();
    this.socket.connect(options);
    this.socket.on("ConnectionOpened", (data) => console.log(data));
    this.socket.on("ConnectionClosed", (data) => console.warn(data));
    this.socket.on("AuthenticationSuccess", (data) => console.log(data));
    this.socket.on("AuthenticationFailure", (data) => console.warn(data));
    this.socket.on("error", (err) => {
      console.error("socket error:", err);
    });
    this.socket.on("SwitchScenes", (data) => {
      console.log(`New Active Scene: ${data["scene-name"]}`);
    });
  }

  switchScene(scene: string) {
    this.socket.send("SetCurrentScene", {
      "scene-name": scene,
    });
  }
}
