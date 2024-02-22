// import './globalTS';

// import {app} from 'electron';
// import {fork} from 'child_process';
// import path from 'path';
// import {logger} from './globals/logger';
// import fs from 'fs';
// import { fileURLToPath } from 'url';
// import type { PrismaClient as PClient } from '@prisma/client';
// // This works in DEV
// import * as Prisma from '@prisma/client';

// // This works in PROD
// import { default as ProdPrisma } from '@prisma/client';

// let { PrismaClient } = Prisma;
// if (!app.isPackaged) PrismaClient = ProdPrisma.PrismaClient;

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);
// export interface Migration {
//   id: string;
//   checksum: string;
//   finished_at: string;
//   migration_name: string;
//   logs: string;
//   rolled_back_at: string;
//   started_at: string;
//   applied_steps_count: string;
// }
// declare global {
//   let prismaClient: PClient;
// }
// const extraResourcesPath = '';
// export const qePath = path.join(
//   extraResourcesPath,
//   'node_modules/@prisma/engines/query_engine-windows.dll.node',
// );
// export const mePath = path.join(
//   extraResourcesPath,
//   'node_modules/@prisma/engines/schema-engine-windows.exe',
// );
// export const dbPath = path.join(app.getPath('userData'), 'wc3mtv3.db');
// export async function runPrismaCommand({
//   command,
//   dbUrl,
// }: {
//   command: string[];
//   dbUrl: string;
// }): Promise<number> {
//   try {
//     console.log(dbUrl, 'dbUrl');
//     const exitCode = await new Promise((resolve, _) => {
//       const prismaPath = 'node_modules/prisma/build/index.js';
//       const child = fork(prismaPath, command, {
//         env: {
//           ...process.env,
//           cwd: __dirname,
//           DATABASE_URL: dbUrl,
//           PRISMA_SCHEMA_ENGINE_BINARY: mePath,
//           PRISMA_QUERY_ENGINE_LIBRARY: qePath,
//           PRISMA_FMT_BINARY: qePath,
//           PRISMA_INTROSPECTION_ENGINE_BINARY: qePath,
//         },
//         stdio: 'pipe',
//       });

//       child.on('message', msg => {
//         logger.info(msg.toString());
//       });

//       child.on('error', err => {
//         logger.error('Child process got error:', err);
//       });

//       child.on('close', (code, _) => {
//         resolve(code);
//       });

//       child.stdout?.on('data', function (data) {
//         logger.info('prisma: ', data.toString());
//       });

//       child.stderr?.on('data', function (data) {
//         logger.error('prisma: ', data.toString());
//       });
//     });

//     if (exitCode !== 0) throw Error(`command ${command} failed with exit code ${exitCode}`);

//     return exitCode;
//   } catch (e) {
//     logger.error(e as string);
//     throw e;
//   }
// }
// export async function checkMigration() {
//   let needsMigration = false;
//   try {
//     const latest: Migration[] =
//       await prismaClient.$queryRaw`select * from _prisma_migrations order by finished_at`;
//     const latestMigration = fs
//       .readdirSync(path.join(__dirname, '..', 'prisma', 'migrations'), {
//         withFileTypes: true,
//       })
//       .filter(file => file.isDirectory())
//       .sort((a, b) => parseInt(b.name.split('_')[0]) - parseInt(a.name.split('_')[0]))[0].name;
//     needsMigration = latest[latest.length - 1]?.migration_name !== latestMigration;
//   } catch (e) {
//     needsMigration = true;
//   }

//   if (needsMigration) {
//     try {
//       const schemaPath = path.join('prisma', 'schema.prisma');

//       await runPrismaCommand({
//         command: ['migrate', 'deploy', '--schema',schemaPath],
//         dbUrl: 'file:' + dbPath,
//       });
//       logger.info(`Needed a migration. Ran prisma migrate with schema path ${schemaPath}`);
//     } catch (e) {

//       logger.error(e as string);
//     }
//   } else {
//     logger.info('Does not need migration');
//   }
// }
// // @ts-expect-error This does exist
// if (!global.prismaClient) {
//   if (!app.isPackaged) {
//     // @ts-expect-error This does exist
//     global.prismaClient = new PrismaClient({
//       datasources: {
//         db: {
//           url: 'file:' + dbPath,
//         },
//       },
//     });
//   } else {
//     // @ts-expect-error This does exist
//     global.prismaClient = new PrismaClient({
//       datasources: {
//         db: {
//           url: 'file:' + dbPath,
//         },
//       },
//       // @ts-expect-error This does exist
//       __internal: {
//         engine: {
//           binaryPath: qePath,
//         },
//       },
//     });
//   }
// }
// // @ts-expect-error This does exist
// export default global.prismaClient;
