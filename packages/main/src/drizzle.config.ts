import { defineConfig } from 'drizzle-kit';
export default defineConfig({
  out: './../../../drizzle',
 schema: './schema.ts',
  driver: 'better-sqlite',
  dbCredentials: {
    url: 'wc3mtv4.db',
  },
  verbose: true,
  strict: true,
});