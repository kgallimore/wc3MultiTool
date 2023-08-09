import { PrismaClient } from "./../prisma/generated/client";
import { app } from "electron";
import { fork } from "child_process";
import path from "path";
import { logger } from "./globals/logger";
import fs from "fs";
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
  var prisma: PrismaClient;
}

const extraResourcesPath = app.isPackaged
  ? app.getAppPath().replace("app.asar", "")
  : path.join(__dirname, "..");
export const qePath = path.join(
  extraResourcesPath,
  "node_modules/@prisma/engines/query_engine-windows.dll.node"
);
export const mePath = path.join(
  extraResourcesPath,
  "node_modules/@prisma/engines/schema-engine-windows.exe"
);
export const dbPath = path.join(app.getPath("userData"), "wc3mtv3.db");
export async function runPrismaCommand({
  command,
  dbUrl,
}: {
  command: string[];
  dbUrl: string;
}): Promise<number> {
  try {
    const exitCode = await new Promise((resolve, _) => {
      const prismaPath = path.resolve(
        __dirname,
        "..",
        "node_modules/prisma/build/index.js"
      );
      const child = fork(prismaPath, command, {
        env: {
          ...process.env,
          DATABASE_URL: dbUrl,
          PRISMA_SCHEMA_ENGINE_BINARY: mePath,
          PRISMA_QUERY_ENGINE_LIBRARY: qePath,
          PRISMA_FMT_BINARY: qePath,
          PRISMA_INTROSPECTION_ENGINE_BINARY: qePath,
        },
        stdio: "pipe",
      });

      child.on("message", (msg) => {
        logger.info(msg.toString());
      });

      child.on("error", (err) => {
        logger.error("Child process got error:", err);
      });

      child.on("close", (code, signal) => {
        resolve(code);
      });

      child.stdout?.on("data", function (data) {
        logger.info("prisma: ", data.toString());
      });

      child.stderr?.on("data", function (data) {
        logger.error("prisma: ", data.toString());
      });
    });

    if (exitCode !== 0)
      throw Error(`command ${command} failed with exit code ${exitCode}`);

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
    const latestMigration = fs
      .readdirSync(path.join(__dirname, "..", "prisma", "migrations"), {
        withFileTypes: true,
      })
      .filter((file) => file.isDirectory())
      .sort(
        (a, b) => parseInt(b.name.split("_")[0]) - parseInt(a.name.split("_")[0])
      )[0].name;
    needsMigration = latest[latest.length - 1]?.migration_name !== latestMigration;
  } catch (e) {
    needsMigration = true;
  }

  if (needsMigration) {
    try {
      const schemaPath = app.isPackaged
        ? path.join(process.resourcesPath, "..", "prisma", "schema.prisma")
        : path.join(__dirname, "..", "prisma", "schema.prisma");
      logger.info(
        `Needs a migration. Running prisma migrate with schema path ${schemaPath}`
      );

      await runPrismaCommand({
        command: ["migrate", "deploy", "--schema", schemaPath],
        dbUrl: "file:" + dbPath,
      });
    } catch (e) {
      logger.error(e as string);
    }
  } else {
    logger.info("Does not need migration");
  }
}

if (!global.prisma) {
  global.prisma = new PrismaClient({
    datasources: {
      db: {
        url: "file:" + dbPath,
      },
    },
    //@ts-expect-error
    __internal: {
      engine: {
        binaryPath: qePath,
      },
    },
  });
}
export default global.prisma;
