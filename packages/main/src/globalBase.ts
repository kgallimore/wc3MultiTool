import EventEmitter from 'events';

import {logger} from './globals/logger';

import {Notification} from 'electron';

export class Global extends EventEmitter {
  protected logger = logger;
  name: string;
  constructor(name: string) {
    super();
    this.name = name;
  }

  protected notification(title: string, body: string) {
    new Notification({title, body}).show();
  }

  protected info(...args: unknown[]) {
    this.logger.info(this.name, args);
  }
  protected warn(...args: unknown[]) {
    this.logger.warn(this.name, args);
  }
  protected error(...args: unknown[]) {
    this.logger.error(this.name, args);
  }
  protected verbose(...args: unknown[]) {
    this.logger.verbose(this.name, args);
  }
}
