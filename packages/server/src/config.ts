export const config = {
  port: Number(Bun.env.PORT || 3000),
  adminUsername: Bun.env.ADMIN_USERNAME || "roaster",
  adminPassword: Bun.env.ADMIN_PASSWORD || "change-me",
  databaseUrl: Bun.env.DATABASE_URL,
  isProduction: Bun.env.NODE_ENV === "production",
};
