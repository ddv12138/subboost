type RequiredEnvName = "DATABASE_URL" | "ENCRYPTION_KEY" | "JWT_SECRET" | "APP_URL";

const LOCAL_DEVELOPMENT_DEFAULTS: Record<RequiredEnvName, string> = {
  DATABASE_URL:
    "file:./dev.db",
  ENCRYPTION_KEY: "subboost-local-dev-encryption-key-0001",
  JWT_SECRET: "subboost-local-dev-jwt-secret-00000001",
  APP_URL: "http://127.0.0.1:3001",
};

export function requireEnv(name: RequiredEnvName): string {
  const value = process.env[name];
  if (typeof value !== "string" || value.trim().length === 0) {
    if (process.env.NODE_ENV === "development") return LOCAL_DEVELOPMENT_DEFAULTS[name];
    throw new Error(`${name} is required`);
  }
  return value.trim();
}

export function getAppUrl(): string {
  return requireEnv("APP_URL").replace(/\/+$/, "");
}

export function isHttpsAppUrl(): boolean {
  return getAppUrl().startsWith("https://");
}
