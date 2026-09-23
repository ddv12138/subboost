import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  PrismaClient: vi.fn(),
  PrismaBetterSqlite3: vi.fn(),
}));

async function loadPrismaModule(env: { DATABASE_URL?: string; NODE_ENV?: string }, existing?: unknown) {
  vi.resetModules();
  vi.doMock("@prisma/adapter-better-sqlite3", () => ({ PrismaBetterSqlite3: mocks.PrismaBetterSqlite3 }));
  vi.doMock("../generated/prisma", () => ({ PrismaClient: mocks.PrismaClient }));

  vi.stubEnv("DATABASE_URL", env.DATABASE_URL);
  vi.stubEnv("NODE_ENV", env.NODE_ENV);
  if (existing === undefined) {
    delete (globalThis as { localPrisma?: unknown }).localPrisma;
  } else {
    (globalThis as { localPrisma?: unknown }).localPrisma = existing;
  }

  return import("./prisma");
}

describe("local prisma singleton", () => {
  const originalDatabaseUrl = process.env.DATABASE_URL;
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.PrismaBetterSqlite3.mockImplementation(function PrismaBetterSqlite3(this: { adapterOptions: unknown }, options: unknown) {
      this.adapterOptions = options;
    });
    mocks.PrismaClient.mockImplementation(function PrismaClient(this: { clientOptions: unknown }, options: unknown) {
      this.clientOptions = options;
    });
  });

  afterEach(() => {
    vi.stubEnv("DATABASE_URL", originalDatabaseUrl);
    vi.stubEnv("NODE_ENV", originalNodeEnv);
    vi.unstubAllEnvs();
    delete (globalThis as { localPrisma?: unknown }).localPrisma;
    vi.doUnmock("@prisma/adapter-better-sqlite3");
    vi.doUnmock("../generated/prisma");
  });

  it("creates a development client with a trimmed SQLite file URL", async () => {
    const mod = await loadPrismaModule({
      DATABASE_URL: " file:/tmp/local.db ",
      NODE_ENV: "development",
    });

    expect(mocks.PrismaBetterSqlite3).toHaveBeenCalledWith({ url: "/tmp/local.db" });
    expect(mocks.PrismaClient).toHaveBeenCalledWith({
      adapter: expect.objectContaining({ adapterOptions: { url: "/tmp/local.db" } }),
      log: ["warn", "error"],
    });
    expect((globalThis as { localPrisma?: unknown }).localPrisma).toBe(mod.prisma);
  });

  it("reuses an existing global client in non-production mode", async () => {
    const existing = { reused: true };
    const mod = await loadPrismaModule({ DATABASE_URL: "file:ignored.db", NODE_ENV: "test" }, existing);

    expect(mod.prisma).toBe(existing);
    expect(mocks.PrismaClient).not.toHaveBeenCalled();
    expect((globalThis as { localPrisma?: unknown }).localPrisma).toBe(existing);
  });

  it("uses the default URL and avoids global caching in production", async () => {
    const mod = await loadPrismaModule({ DATABASE_URL: "   ", NODE_ENV: "production" });

    expect(mocks.PrismaBetterSqlite3).toHaveBeenCalledWith({ url: "./dev.db" });
    expect(mocks.PrismaClient).toHaveBeenCalledWith({
      adapter: expect.objectContaining({ adapterOptions: { url: "./dev.db" } }),
      log: ["error"],
    });
    expect((globalThis as { localPrisma?: unknown }).localPrisma).toBeUndefined();
    expect(mod.prisma).toEqual(expect.objectContaining({ clientOptions: expect.any(Object) }));
  });
});
