import EventEmitter from "events";
import { info, error, warn, verbose } from "electron-log";
import prisma from "../prismaClient";

class Logger extends EventEmitter {
  constructor() {
    super();
  }

  info(name: string, ...args: any[]) {
    info(name + ": " + args);
    prisma.logs
      .create({
        data: { source: name, message: args.join(" | "), priority: "info" },
      })
      .then(() => {});
    this.emit("info", name, args);
  }
  warn(name: string, ...args: any[]) {
    warn(name + ": " + args);
    prisma.logs
      .create({
        data: { source: name, message: args.join(" | "), priority: "warn" },
      })
      .then(() => {});
    this.emit("warn", name, args);
  }
  error(name: string, ...args: any[]) {
    error(name + ": " + args);
    prisma.logs
      .create({
        data: { source: name, message: args.join(" | "), priority: "error" },
      })
      .then(() => {});
    this.emit("error", name, args);
  }
  verbose(name: string, ...args: any[]) {
    verbose(name + ": " + args);
    prisma.logs
      .create({
        data: { source: name, message: args.join(" | "), priority: "verbose" },
      })
      .then(() => {});
    this.emit("verbose", name, args);
  }
}

export const logger = new Logger();
