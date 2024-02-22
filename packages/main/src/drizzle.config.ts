import { defineConfig } from 'drizzle-kit';
import {app} from 'electron';
import { join } from 'path';
export default defineConfig({
 schema: join( app.getAppPath(), 'drizzle', 'schema.ts'),
  driver: 'better-sqlite',
  dbCredentials: {
    url: 'wc3mtv3.db',
  },
  verbose: true,
  strict: true,
});