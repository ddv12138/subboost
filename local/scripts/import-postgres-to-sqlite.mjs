import Database from "better-sqlite3";
import pg from "pg";

const { Client } = pg;
const sourceUrl = process.env.LEGACY_DATABASE_URL?.trim();
const targetPath = process.env.DATABASE_PATH?.trim() || "/data/subboost.db";

if (!sourceUrl?.startsWith("postgresql://") && !sourceUrl?.startsWith("postgres://")) {
  throw new Error("LEGACY_DATABASE_URL must be a PostgreSQL connection URL.");
}

const tables = [
  {
    name: "LocalAdmin",
    columns: ["id", "username", "passwordHash", "createdAt", "updatedAt", "lastLoginAt"],
  },
  {
    name: "Subscription",
    columns: [
      "id", "ownerId", "name", "token", "isPrimary", "encryptedUrls", "encryptedNodes", "encryptedConfig",
      "encryptedSubscriptionInfo", "autoUpdateInterval", "cacheExpiresAt", "lastAccessedAt", "lastUpdatedAt",
      "createdAt", "updatedAt",
    ],
  },
  {
    name: "SubscriptionAutoUpdateState",
    columns: [
      "subscriptionId", "externalFailureCount", "failureSourceState", "lastFailedAt", "lastAttemptedAt",
      "disabledAt", "disabledReason", "disabledPreviousInterval", "createdAt", "updatedAt",
    ],
  },
];

const client = new Client({ connectionString: sourceUrl, application_name: "subboost-pg-to-sqlite-migration" });
const sqlite = new Database(targetPath);

try {
  await client.connect();
  await client.query("BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
  sqlite.pragma("foreign_keys = ON");

  const existing = tables.reduce((total, table) => {
    const result = sqlite.prepare(`SELECT COUNT(*) AS count FROM "${table.name}"`).get();
    return total + Number(result.count);
  }, 0);
  if (existing !== 0) throw new Error("SQLite target already contains business records; refusing to overwrite it.");

  const importedCounts = {};
  const rowsByTable = new Map();
  for (const table of tables) {
    const columnList = table.columns.map((column) => `"${column}"`).join(", ");
    const result = await client.query(`SELECT ${columnList} FROM "${table.name}" ORDER BY 1`);
    rowsByTable.set(table.name, result.rows);
    importedCounts[table.name] = result.rowCount;
  }

  sqlite.transaction(() => {
    for (const table of tables) {
      const columns = table.columns.map((column) => `"${column}"`).join(", ");
      const placeholders = table.columns.map(() => "?").join(", ");
      const insert = sqlite.prepare(`INSERT INTO "${table.name}" (${columns}) VALUES (${placeholders})`);
      for (const row of rowsByTable.get(table.name)) {
        insert.run(...table.columns.map((column) => {
          const value = row[column];
          if (value instanceof Date) return value.toISOString();
          if (typeof value === "boolean") return value ? 1 : 0;
          return value;
        }));
      }
    }
    const violations = sqlite.pragma("foreign_key_check");
    if (violations.length > 0) throw new Error(`SQLite foreign-key check failed with ${violations.length} violation(s).`);
    for (const table of tables) {
      const localCount = Number(sqlite.prepare(`SELECT COUNT(*) AS count FROM "${table.name}"`).get().count);
      if (localCount !== importedCounts[table.name]) throw new Error(`Record count mismatch for ${table.name}.`);
    }
  })();

  await client.query("COMMIT");

  console.log(`PostgreSQL import complete: ${Object.entries(importedCounts).map(([table, count]) => `${table}=${count}`).join(", ")}`);
} catch (error) {
  try { await client.query("ROLLBACK"); } catch {}
  throw error;
} finally {
  sqlite.close();
  await client.end();
}
