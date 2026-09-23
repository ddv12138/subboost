import { createHash, randomUUID } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";

const here = path.dirname(fileURLToPath(import.meta.url));
const migrationsDirectory = path.join(here, "../prisma/migrations");
const databasePath = process.env.DATABASE_PATH?.trim() || "/data/subboost.db";
const database = new Database(databasePath);

try {
  database.pragma("foreign_keys = ON");
  database.exec(`
    CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
      "id" VARCHAR(36) NOT NULL PRIMARY KEY,
      "checksum" VARCHAR(64) NOT NULL,
      "finished_at" DATETIME,
      "migration_name" VARCHAR(255) NOT NULL,
      "logs" TEXT,
      "rolled_back_at" DATETIME,
      "started_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "applied_steps_count" INTEGER UNSIGNED NOT NULL DEFAULT 0
    )
  `);

  const names = (await readdir(migrationsDirectory, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  for (const migrationName of names) {
    const migrationPath = path.join(migrationsDirectory, migrationName, "migration.sql");
    const sql = await readFile(migrationPath, "utf8");
    const checksum = createHash("sha256").update(sql).digest("hex");
    const existing = database.prepare(
      'SELECT "checksum", "finished_at", "rolled_back_at" FROM "_prisma_migrations" WHERE "migration_name" = ?',
    ).get(migrationName);

    if (existing) {
      if (existing.checksum !== checksum) throw new Error(`Migration checksum changed: ${migrationName}`);
      if (!existing.finished_at || existing.rolled_back_at) throw new Error(`Migration is not complete: ${migrationName}`);
      continue;
    }

    database.transaction(() => {
      database.exec(sql);
      database.prepare(`
        INSERT INTO "_prisma_migrations"
          ("id", "checksum", "finished_at", "migration_name", "started_at", "applied_steps_count")
        VALUES (?, ?, CURRENT_TIMESTAMP, ?, CURRENT_TIMESTAMP, 1)
      `).run(randomUUID(), checksum, migrationName);
    })();
    console.log(`Applied SQLite migration ${migrationName}`);
  }

  const integrity = database.pragma("integrity_check");
  if (integrity.length !== 1 || integrity[0].integrity_check !== "ok") {
    throw new Error("SQLite integrity check failed.");
  }
} finally {
  database.close();
}
