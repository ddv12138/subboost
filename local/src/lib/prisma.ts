import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../generated/prisma";

const globalForPrisma = globalThis as unknown as {
  localPrisma?: PrismaClient;
};

function createPrismaAdapter() {
  const url = process.env.DATABASE_URL?.trim() || "file:./dev.db";
  if (!url.startsWith("file:") && url !== ":memory:" && process.env.NEXT_PHASE !== "phase-production-build") {
    throw new Error("SQLite is required. Set DATABASE_URL to a file: URL and migrate PostgreSQL data before switching.");
  }
  const filename = url.startsWith("file:") ? url.slice("file:".length) : url;
  return new PrismaBetterSqlite3({ url: filename });
}

export const prisma =
  globalForPrisma.localPrisma ??
  new PrismaClient({
    adapter: createPrismaAdapter(),
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.localPrisma = prisma;
}
