import EventEmitter from 'events';
import {info, error, warn, verbose} from 'electron-log';

class Logger extends EventEmitter {
  constructor() {
    super();
  }

  info(name: string, ...args: unknown[]) {
    info(name + ': ' + args);
    this.emit('info', name, args);
  }
  warn(name: string, ...args: unknown[]) {
    warn(name + ': ' + args);
    this.emit('warn', name, args);
  }
  error(name: string, ...args: unknown[]) {
    error(name + ': ' + args);
    this.emit('error', name, args);
  }
  verbose(name: string, ...args: unknown[]) {
    verbose(name + ': ' + args);
    this.emit('verbose', name, args);
  }
}

export const logger = new Logger();
