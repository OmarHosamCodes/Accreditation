import { betterAuth } from "better-auth";
import { bearer } from "better-auth/plugins";
import { Pool } from "pg";
import { config } from "./config.ts";

let pool: Pool | null = null;

function getPool(): Pool {
  if (!config.databaseUrl) {
    throw new Error("DATABASE_URL is required for Better Auth.");
  }
  if (!pool) {
    pool = new Pool({ connectionString: config.databaseUrl, max: 4 });
  }
  return pool;
}

export const auth = betterAuth({
  database: config.databaseUrl ? getPool() : undefined,
  secret: config.betterAuthSecret,
  baseURL: config.betterAuthUrl,
  trustedOrigins: config.trustedOrigins,
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
  },
  plugins: [bearer()],
});

export function getAuthPool(): Pool {
  return getPool();
}

export function isAuthEnabled(): boolean {
  return Boolean(config.databaseUrl);
}
