import { Module } from "../moduleBase";

import { settings } from "./../globals/settings";

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

export class SEClient extends Module {
  socket: any;

  constructor() {
    super();
    this.socket = io("https://realtime.streamelements.com", {
      transports: ["websocket"],
    });
    this.socket.on("connect", this.onConnect.bind(this));
    this.socket.on("disconnect", this.onDisconnect.bind(this));
    this.socket.on("authenticated", this.onAuthenticated.bind(this));
    this.socket.on("unauthorized", console.error);
    this.socket.on("event:test", (data: SEEvent) => {
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
      this.emitNewTip(data.event);
    }
  }

  onConnect() {
    this.emitInfo("Successfully connected to StreamElements websocket");
    this.socket.emit("authenticate", {
      method: "jwt",
      token: settings.values.streaming.seToken,
    });
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
}
