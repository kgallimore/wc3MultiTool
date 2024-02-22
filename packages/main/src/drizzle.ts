import './globalTS';

import {app} from 'electron';
import path from 'path';
import { type BetterSQLite3Database, drizzle } from 'drizzle-orm/better-sqlite3';
import type { Database as db } from 'better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from '../../../drizzle/schema';


declare global {
  let drizzleClient: BetterSQLite3Database<typeof schema>;
  let wc3mtdb: db;
}

export const dbPath = path.join(app.getPath('userData'), 'wc3mtv3.db');

export const dbConnection = new Database(dbPath);

export const drizzleClient = drizzle(dbConnection, {schema});
