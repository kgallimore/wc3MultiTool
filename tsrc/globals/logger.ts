import EventEmitter from "events";
import { info, error, warn, verbose } from "electron-log";

class Logger extends EventEmitter {
  constructor() {
    super();
  }

  info(name: string, ...args: any[]) {
    info(name + ": " + args);
    this.emit("info", name, args);
  }
  warn(name: string, ...args: any[]) {
    warn(name + ": " + args);
    this.emit("warn", name, args);
  }
  error(name: string, ...args: any[]) {
    error(name + ": " + args);
    this.emit("error", name, args);
  }
  verbose(name: string, ...args: any[]) {
    verbose(name + ": " + args);
    this.emit("verbose", name, args);
  }
}

export const logger = new Logger();
