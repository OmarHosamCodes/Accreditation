import { config } from "../config.ts";

export const rateLimitByEmail = new Map<string, number>();

export function isAuthed(request: Request): boolean {
  const auth = request.headers.get("authorization");
  if (!auth?.startsWith("Basic ")) return false;
  const decoded = atob(auth.slice("Basic ".length));
  const splitAt = decoded.indexOf(":");
  const user = decoded.slice(0, splitAt);
  const pass = decoded.slice(splitAt + 1);
  return user === config.adminUsername && pass === config.adminPassword;
}

export function authUser(request: Request): string {
  const auth = request.headers.get("authorization");
  if (!auth?.startsWith("Basic ")) return "";
  const decoded = atob(auth.slice("Basic ".length));
  const splitAt = decoded.indexOf(":");
  return decoded.slice(0, splitAt) || config.adminUsername;
}
