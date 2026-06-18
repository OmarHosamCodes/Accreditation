import { auth, getAuthPool, isAuthEnabled } from "../auth.ts";
import { config } from "../config.ts";

export async function seedAdminUser(): Promise<void> {
  if (!isAuthEnabled()) return;

  const pgPool = getAuthPool();
  const countResult = await pgPool.query<{ count: string }>('select count(*)::text as count from "user"');
  if (Number(countResult.rows[0]?.count || 0) > 0) return;

  const ctx = await auth.$context;
  const email = config.adminEmail.toLowerCase();
  const name = config.adminUsername.charAt(0).toUpperCase() + config.adminUsername.slice(1);
  const hash = await ctx.password.hash(config.adminPassword);

  const createdUser = await ctx.internalAdapter.createUser({
    email,
    name,
    emailVerified: true,
  });
  if (!createdUser) {
    throw new Error("Failed to seed admin user.");
  }

  await ctx.internalAdapter.linkAccount({
    userId: createdUser.id,
    providerId: "credential",
    accountId: createdUser.id,
    password: hash,
  });

  console.log(`Seeded admin user ${email}`);
}
