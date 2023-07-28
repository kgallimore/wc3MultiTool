import {PrismaClient} from './../prisma/generated/client';
import {app} from 'electron';
import {fork} from 'child_process';
import path from 'path';
import {logger} from './globals/logger';
export interface Migration {
  id: string;
  checksum: string;
  finished_at: string;
  migration_name: string;
  logs: string;
  rolled_back_at: string;
  started_at: string;
  applied_steps_count: string;
}
declare global {
  let prisma: PrismaClient;
}

const extraResourcesPath = app.isPackaged
  ? app.getAppPath().replace('app.asar', '')
  : path.join(__dirname, '..');
export const qePath = path.join(
  extraResourcesPath,
  'node_modules/@prisma/engines/query_engine-windows.dll.node',
);
export const mePath = path.join(
  extraResourcesPath,
  'node_modules/@prisma/engines/schema-engine-windows.exe',
);
export const dbPath = path.join(app.getPath('userData'), 'wc3mtv2.db');

export async function runPrismaCommand({
  command,
  dbUrl,
}: {
  command: string[];
  dbUrl: string;
}): Promise<number> {
  try {
    const exitCode = await new Promise((resolve, _) => {
      const prismaPath = path.resolve(__dirname, '..', 'node_modules/prisma/build/index.js');
      const child = fork(prismaPath, command, {
        env: {
          ...process.env,
          DATABASE_URL: dbUrl,
          PRISMA_SCHEMA_ENGINE_BINARY: mePath,
          PRISMA_QUERY_ENGINE_LIBRARY: qePath,
          PRISMA_FMT_BINARY: qePath,
          PRISMA_INTROSPECTION_ENGINE_BINARY: qePath,
        },
        stdio: 'pipe',
      });

      child.on('message', msg => {
        logger.info(msg.toString());
      });

      child.on('error', err => {
        logger.error('Child process got error:', err);
      });

      child.on('close', (code, _) => {
        resolve(code);
      });

      child.stdout?.on('data', function (data) {
        logger.info('prisma: ', data.toString());
      });

      child.stderr?.on('data', function (data) {
        logger.error('prisma: ', data.toString());
      });
    });

    if (exitCode !== 0) throw Error(`command ${command} failed with exit code ${exitCode}`);

    return exitCode;
  } catch (e) {
    logger.error(e as string);
    throw e;
  }
}
export async function checkMigration() {
  let needsMigration = false;
  try {
    const latest: Migration[] =
      await prisma.$queryRaw`select * from _prisma_migrations order by finished_at`;
    needsMigration = latest[latest.length - 1]?.migration_name !== '20230709165606_init';
  } catch (e) {
    needsMigration = true;
  }

  if (needsMigration) {
    try {
      const schemaPath = app.isPackaged
        ? path.join(process.resourcesPath, '..', 'prisma', 'schema.prisma')
        : path.join(__dirname, '..', 'prisma', 'schema.prisma');
      logger.info(`Needs a migration. Running prisma migrate with schema path ${schemaPath}`);

      await runPrismaCommand({
        command: ['migrate', 'deploy', '--schema', schemaPath],
        dbUrl: 'file:' + dbPath,
      });
    } catch (e) {
      logger.error(e as string);
    }
  } else {
    logger.info('Does not need migration');
  }
}
//@ts-expect-error Global does exist
if (!global.prisma) {
  //@ts-expect-error Global does exist
  global.prisma = new PrismaClient({
    datasources: {
      db: {
        url: 'file:' + dbPath,
      },
    },
    //@ts-expect-error Internal does exist
    __internal: {
      engine: {
        binaryPath: qePath,
      },
    },
  });
}
//@ts-expect-error Global does exist
export default global.prisma;
