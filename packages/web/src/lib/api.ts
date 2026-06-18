import type { AppState } from "@accreditation/shared";
import { setDB } from "./state.ts";

type ApiError = { ok?: boolean; errors?: string[] };

export async function apiJSON(path: string, opts: RequestInit = {}) {
  const res = await fetch(path, {
    credentials: "include",
    headers: { "content-type": "application/json", ...(opts.headers || {}) },
    ...opts,
  });
  const data = (await res.json().catch(() => ({ ok: false, errors: ["Unexpected server response"] }))) as ApiError;
  if (!res.ok) throw data;
  return data as Record<string, unknown> & ApiError;
}

export async function loadState(): Promise<AppState> {
  return (await apiJSON("/api/state")) as unknown as AppState;
}

export async function saveState(db: AppState | null, onError: (message: string) => void) {
  if (db) setDB(db);
  try {
    const res = await apiJSON("/api/admin/state", {
      method: "POST",
      body: JSON.stringify({ state: db }),
    });
    if (res.state) setDB(res.state as AppState);
  } catch (e) {
    const err = e as ApiError;
    onError((err.errors && err.errors.join(" ")) || "Could not save changes");
    throw e;
  }
}

export async function mintExtensionToken() {
  return apiJSON("/api/extension/token", { method: "POST", body: "{}" });
}
