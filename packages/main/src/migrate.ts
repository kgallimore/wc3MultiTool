import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { drizzleClient } from './drizzle';
import { app } from 'electron';
import { join } from 'path';
import {writeFileSync, rmSync} from 'node:fs';
export function migrateDB() {
    console.log('Migration started...');
    const migrationsPath = join( app.getAppPath(), 'drizzle');
    writeFileSync(join(app.getPath('documents'), 'migration.log'), 'Migration started. Using migrations from ' + migrationsPath + '\n', {flag: 'a'});
    try{
        migrate(drizzleClient, { migrationsFolder: migrationsPath });
        rmSync(join(app.getPath('documents'), 'migration.log'));
    }catch(e){
        //log to documents folder file
        writeFileSync(join(app.getPath('documents'), 'migration.log'), (e as string).toString() + '\n', {flag: 'a'});
        console.error('Error migrating database:', e);
    }
    console.log('Migration finished...');
}