import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { drizzleClient } from './drizzle';
import { app } from 'electron';
import { join } from 'path';
export function migrateDB() {
    console.log('Migration started...');
    try{
        migrate(drizzleClient, { migrationsFolder: join( app.getPath('documents'), 'drizzle') });
    }catch(e){
        console.error('Error migrating database:', e);
    }
    console.log('Migration finished...');
}