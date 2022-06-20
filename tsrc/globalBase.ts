import EventEmitter from "events";

import { info, error, warn, verbose } from "electron-log";

import { Notification } from "electron";

export class Global extends EventEmitter {
  name: string;
  constructor(name: string) {
    super();
    this.name = name;
  }

  protected notification(title: string, body: string) {
    new Notification({ title, body });
  }

  protected info(...args: any[]) {
    info(this.name + ": " + args);
  }
  protected warn(...args: any[]) {
    warn(this.name + ": " + args);
  }
  protected error(...args: any[]) {
    error(this.name + ": " + args);
  }
  protected verbose(...args: any[]) {
    verbose(this.name + ": " + args);
  }
}
