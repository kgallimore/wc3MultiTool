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
      //console.log(JSON.stringify(data));
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
    this.emitInfo("Successfully connected to StreamElements websocket");
    this.socket.emit("authenticate", { method: "jwt", token: this.jwt });
  }

  onDisconnect() {
    this.emitError("Disconnected from websocket");
    // Reconnect
  }

  onAuthenticated(data: {
    clientId: string;
    channelId: string;
    project: string;
    message: string;
  }) {
    this.emitInfo(`Successfully connected to StreamElements channel ${data.channelId}`);
  }

  emitError(message: string) {
    this.emit("error", message);
  }

  emitInfo(message: string) {
    this.emit("info", message);
  }
}

/*
    _id: string;
    channel: string;
    type: "cheer" | "follow" | "host" | "raid" | "subscriber" | "tip";
    provider: "twitch" | "youtube" | "facebook";
    flagged: boolean;
    data: {
      tipId?: string;
      username: string;
      providerId?: string;
      displayName: string;
      amount: number;
      streak?: number;
      tier: "1000" | "2000" | "3000" | "prime";
      currency?: string;
      message: string;
      quantity?: number;
      items: Array<any>;
      avatar: string;
    };
    */