function env(key: string, fallback?: string): string | undefined {
  return process.env[key] ?? fallback;
}

const DEFAULT_LOCAL_DATABASE_URL = "postgres://postgres:postgres@localhost:5432/accreditation";

function resolveDatabaseUrl(): string | undefined {
  const localOverride = env("LOCAL_DATABASE_URL");
  if (localOverride) return localOverride;

  const configured = env("DATABASE_URL");
  if (!configured) {
    if (env("NODE_ENV") === "production") return undefined;
    return DEFAULT_LOCAL_DATABASE_URL;
  }

  if (configured.includes("railway.internal")) {
    if (env("NODE_ENV") === "production") return configured;
    console.warn(
      "DATABASE_URL uses railway.internal, which is not reachable from your machine.",
    );
    console.warn(
      "Using local Postgres instead. Run `docker compose up -d`, or set LOCAL_DATABASE_URL / a public Railway URL.",
    );
    return DEFAULT_LOCAL_DATABASE_URL;
  }

  return configured;
}

function trustedOrigins(): string[] {
  const origins = new Set<string>([
    "http://localhost:5173",
    "http://localhost:3000",
  ]);
  const baseUrl = env("BETTER_AUTH_URL");
  if (baseUrl) origins.add(new URL(baseUrl).origin);
  const extensionOrigin = env("EXTENSION_ORIGIN");
  if (extensionOrigin) origins.add(extensionOrigin);
  if (!env("NODE_ENV") || env("NODE_ENV") === "development") {
    origins.add("chrome-extension://*");
  }
  return [...origins];
}

const adminUsername = env("ADMIN_USERNAME") || "roaster";
const databaseUrl = resolveDatabaseUrl();

export const config = {
  port: Number(env("PORT") || 3000),
  adminUsername,
  adminPassword: env("ADMIN_PASSWORD") || "change-me",
  adminEmail: env("ADMIN_EMAIL") || `${adminUsername}@accreditation.io`,
  databaseUrl,
  isProduction: env("NODE_ENV") === "production",
  betterAuthSecret: env("BETTER_AUTH_SECRET") || "dev-only-change-me-use-32-chars-min!!",
  betterAuthUrl: env("BETTER_AUTH_URL") || "http://localhost:3000",
  trustedOrigins: trustedOrigins(),
};
