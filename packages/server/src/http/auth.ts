import type { AppState } from "@accreditation/shared";
import { auth, isAuthEnabled } from "../auth.ts";
import { config } from "../config.ts";

export const rateLimitByEmail = new Map<string, number>();

export async function requireSession(request: Request) {
  if (!isAuthEnabled() || !auth) return null;
  return auth.api.getSession({ headers: request.headers });
}

export async function isAuthed(request: Request): Promise<boolean> {
  return !!(await requireSession(request));
}

export async function authUser(request: Request): Promise<string> {
  const session = await requireSession(request);
  return session?.user.name || session?.user.email || "";
}

export function isAdminEmail(email: string | undefined): boolean {
  if (!email) return false;
  return email.toLowerCase() === config.adminEmail.toLowerCase();
}

export async function extensionBearerToken(request: Request): Promise<string | null> {
  const session = await requireSession(request);
  if (!session) return null;

  const ctx = await auth!.$context;
  const cookieName = ctx.authCookies.sessionToken.name;
  const cookieHeader = request.headers.get("cookie") ?? "";
  const escaped = cookieName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${escaped}=([^;]+)`));
  if (!match?.[1]) return null;
  return decodeURIComponent(match[1]);
}

export function extensionUserRole(email: string | undefined, db?: AppState): "admin" | "auditor" {
  if (!email) return "auditor";
  const entry = db?.users?.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (entry?.role === "admin") return "admin";
  if (entry?.role === "auditor") return "auditor";
  return isAdminEmail(email) ? "admin" : "auditor";
}
