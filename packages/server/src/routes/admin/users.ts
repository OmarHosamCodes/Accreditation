import { auth, getAuthPool, isAuthEnabled } from "../../auth.ts";
import { config } from "../../config.ts";
import { parseJson } from "../../http/responses.ts";
import type { Store } from "../../store/types.ts";
import { cleanText } from "../../services/validation.ts";
import { adminErr, adminOk, requireAdmin } from "./helpers.ts";

type AuthUserRow = {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
};

function syncAppStateUser(
  db: import("@accreditation/shared").AppState,
  name: string,
  email: string,
  role: string,
) {
  if (!db.users) db.users = [];
  const normalized = email.toLowerCase();
  const existing = db.users.find((u) => u.email.toLowerCase() === normalized);
  if (existing) {
    existing.name = name;
    existing.role = role;
  } else {
    db.users.push({ name, email: normalized, role });
  }
}

function removeAppStateUser(db: import("@accreditation/shared").AppState, email: string) {
  if (!db.users) return;
  const normalized = email.toLowerCase();
  db.users = db.users.filter((u) => u.email.toLowerCase() !== normalized);
}

export async function listUsers(request: Request, store: Store) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  const state = await store.get();
  if (!isAuthEnabled()) {
    return adminOk(request, state, { users: state.users || [], auth_users: [] });
  }

  const pgPool = getAuthPool();
  const result = await pgPool.query<AuthUserRow>(
    'select id, name, email, "createdAt" from "user" order by "createdAt" asc',
  );

  const authUsers = result.rows.map((row) => {
    const meta = state.users?.find((u) => u.email.toLowerCase() === row.email.toLowerCase());
    return {
      id: row.id,
      name: row.name,
      email: row.email,
      role: meta?.role ?? (row.email.toLowerCase() === config.adminEmail.toLowerCase() ? "admin" : "auditor"),
      created_at: row.createdAt.getTime(),
    };
  });

  return adminOk(request, state, { users: authUsers });
}

export async function createUser(request: Request, store: Store) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  if (!isAuthEnabled()) {
    return adminErr(request, ["Auth is disabled without DATABASE_URL"], 503);
  }

  const body = await parseJson(request);
  const name = cleanText(body?.name);
  const email = cleanText(body?.email).toLowerCase();
  const password = cleanText(body?.password);
  const role = cleanText(body?.role) || "auditor";
  const errors: string[] = [];

  if (name.length < 2) errors.push("Name is required.");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) errors.push("Enter a valid email.");
  if (password.length < 8) errors.push("Password must be at least 8 characters.");
  if (!["admin", "auditor"].includes(role)) errors.push("Role must be admin or auditor.");
  if (errors.length) return adminErr(request, errors);

  const pgPool = getAuthPool();
  const existing = await pgPool.query('select id from "user" where email = $1', [email]);
  if (existing.rows.length > 0) return adminErr(request, ["A user with this email already exists"], 409);

  const ctx = await auth.$context;
  const hash = await ctx.password.hash(password);
  const createdUser = await ctx.internalAdapter.createUser({
    email,
    name,
    emailVerified: true,
  });
  if (!createdUser) return adminErr(request, ["Failed to create user"], 500);

  await ctx.internalAdapter.linkAccount({
    userId: createdUser.id,
    providerId: "credential",
    accountId: createdUser.id,
    password: hash,
  });

  const state = await store.mutate((db) => {
    syncAppStateUser(db, name, email, role);
  });

  return adminOk(request, state, {
    user: { id: createdUser.id, name, email, role },
  });
}

export async function deleteUser(request: Request, store: Store, userId: string) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  if (!isAuthEnabled()) {
    return adminErr(request, ["Auth is disabled without DATABASE_URL"], 503);
  }

  const pgPool = getAuthPool();
  const row = await pgPool.query<{ email: string }>('select email from "user" where id = $1', [userId]);
  const email = row.rows[0]?.email;
  if (!email) return adminErr(request, ["User not found"], 404);

  if (email.toLowerCase() === config.adminEmail.toLowerCase()) {
    return adminErr(request, ["Cannot delete the seeded admin account"], 403);
  }

  await pgPool.query('delete from "account" where "userId" = $1', [userId]);
  await pgPool.query('delete from "session" where "userId" = $1', [userId]);
  await pgPool.query('delete from "user" where id = $1', [userId]);

  const state = await store.mutate((db) => {
    removeAppStateUser(db, email);
  });

  return adminOk(request, state, { user_id: userId });
}
