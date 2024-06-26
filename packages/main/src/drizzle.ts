import {app} from 'electron';
import path from 'path';
import { type BetterSQLite3Database, drizzle } from 'drizzle-orm/better-sqlite3';
import type { Database as db } from 'better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema';


declare global {
  let drizzleClient: BetterSQLite3Database<typeof schema>;
  let wc3mtdb: db;
}

export const dbPath = path.join(app.getPath('documents'), 'wc3mtv4.db');

export const dbConnection = new Database(dbPath);

export const drizzleClient = drizzle(dbConnection, {schema});
