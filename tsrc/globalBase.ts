import EventEmitter from "events";

import { logger } from "./globals/logger";

import { Notification } from "electron";

export class Global extends EventEmitter {
  protected logger = logger;
  name: string;
  constructor(name: string) {
    super();
    this.name = name;
  }

  protected notification(title: string, body: string) {
    new Notification({ title, body });
  }

  protected info(...args: any[]) {
    this.logger.info(this.name, args);
  }
  protected warn(...args: any[]) {
    this.logger.warn(this.name, args);
  }
  protected error(...args: any[]) {
    this.logger.error(this.name, args);
  }
  protected verbose(...args: any[]) {
    this.logger.verbose(this.name, args);
  }
}
