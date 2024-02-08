import EventEmitter from 'events';
import log from 'electron-log';
import prisma from '../prismaClient';

class Logger extends EventEmitter {
  constructor() {
    super();
  }

  info(name: string, ...args: unknown[]) {
    log.info(name + ': ' + args);
    prisma.logs
      .create({
        data: {source: name, message: args.join(' | '), priority: 'info'},
      })
      .then(() => {});
    this.emit('info', name, args);
  }
  warn(name: string, ...args: unknown[]) {
    log.warn(name + ': ' + args);
    prisma.logs
      .create({
        data: {source: name, message: args.join(' | '), priority: 'warn'},
      })
      .then(() => {});
    this.emit('warn', name, args);
  }
  error(name: string, ...args: unknown[]) {
    log.error(name + ': ' + args);
    prisma.logs
      .create({
        data: {source: name, message: args.join(' | '), priority: 'error'},
      })
      .then(() => {});
    this.emit('error', name, args);
  }
  verbose(name: string, ...args: unknown[]) {
    log.verbose(name + ': ' + args);
    prisma.logs
      .create({
        data: {source: name, message: args.join(' | '), priority: 'verbose'},
      })
      .then(() => {});
    this.emit('verbose', name, args);
  }
}

export const logger = new Logger();
