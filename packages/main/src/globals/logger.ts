import EventEmitter from 'events';
import log from 'electron-log';
import {drizzleClient} from '../drizzle';
import { logs } from '../schema';
import { lt } from 'drizzle-orm';
class Logger extends EventEmitter {
  constructor() {
    super();
    // Clear out logs older than 14 days, and repeat every 14 days just in case the app is running for a long time
    this.clearOldLogs().then(() => setInterval(this.clearOldLogs, 2 * 604800 * 1000));
  }

  async clearOldLogs(){
    await drizzleClient.delete(logs).where(lt(logs.createdAt,new Date(Date.now() - 2 * 604800)));
    log.info('Deleted logs older than 14 days');
  }

  async info(name: string, ...args: unknown[]) {
    log.info(name + ': ' + args);
    await drizzleClient.insert(logs).values({source: name, message: args.join(' '), priority: 'info'});
    this.emit('info', name, args);
  }
  async warn(name: string, ...args: unknown[]) {
    log.warn(name + ': ' + args);
    await drizzleClient.insert(logs).values({source: name, message: args.join(' '), priority: 'warn'});
    this.emit('warn', name, args);
  }
  async error(name: string, ...args: unknown[]) {
    log.error(name + ': ' + args);
    await drizzleClient.insert(logs).values({source: name, message: args.join(' '), priority: 'error'});
    this.emit('error', name, args);
  }
  async verbose(name: string, ...args: unknown[]) {
    log.verbose(name + ': ' + args);
    await drizzleClient.insert(logs).values({source: name, message: args.join(' '), priority: 'verbose'});
    this.emit('verbose', name, args);
  }
}

export const logger = new Logger();
