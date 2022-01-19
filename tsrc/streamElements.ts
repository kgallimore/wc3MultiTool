import EventEmitter from "events";
const io = require("socket.io-client");

export interface TipData {
  amount: number;
  message: string;
  name: string;
}

export interface SEEvent {
  listener:
    | "follower-latest"
    | "subscriber-latest"
    | "host-latest"
    | "cheer-latest"
    | "tip-latest"
    | "raid-latest"
    | "message"
    | "delete-message"
    | "delete-messages";
  event: Array<SEEventEvent> | SEEventEvent;
}
export interface SEEventEvent {
  type: string;
  name: string;
  amount: number;
  count: number;
  items?: Array<any>;
  tier?: string;
  month?: string;
  isTest: boolean;
  message?: string;
}

export class SEClient extends EventEmitter {
  jwt: string;
  socket: any;

  constructor(jwt: string) {
    super();
    this.jwt = jwt;
    this.socket = io("https://realtime.streamelements.com", {
      transports: ["websocket"],
    });
    this.socket.on("connect", this.onConnect.bind(this));
    this.socket.on("disconnect", this.onDisconnect.bind(this));
    this.socket.on("authenticated", this.onAuthenticated.bind(this));
    this.socket.on("unauthorized", console.error);
    this.socket.on("event:test", (data: SEEvent) => {
      console.log(data);
      this.handleEvent(data);
      // Structure as on https://github.com/StreamElements/widgets/blob/master/CustomCode.md#on-event
    });
    this.socket.on("event", (data: SEEvent) => {
      this.handleEvent(data);
    });
    this.socket.on("event:update", (data: any) => {
      console.log(data);
    });
    this.socket.on("event:reset", (data: any) => {
      console.log(data);
      // Structure as on https://github.com/StreamElements/widgets/blob/master/CustomCode.md#on-session-update
    });
  }

  handleEvent(data: SEEvent) {
    if (data.listener === "tip-latest") {
      this.emit("tip", data.event);
    }
  }

  onConnect() {
    console.log("Successfully connected to the websocket");
    this.socket.emit("authenticate", { method: "jwt", token: this.jwt });
  }

  onDisconnect() {
    console.log("Disconnected from websocket");
    // Reconnect
  }

  onAuthenticated(data: any) {
    const { channelId } = data;
    console.log(`Successfully connected to channel ${channelId}`);
  }

  emitError(message: string) {
    this.emit("error", message);
  }

  emitInfo(message: string) {
    this.emit("info", message);
  }
}
