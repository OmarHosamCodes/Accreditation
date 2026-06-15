import { freshDB } from "@accreditation/shared";
import type { AppState } from "@accreditation/shared";
import { isAuthed } from "../http/auth.ts";
import { json, parseJson } from "../http/responses.ts";
import type { Store } from "../store/types.ts";
import { validateState } from "../services/validation.ts";

export function adminLogin(request: Request) {
  if (!isAuthed(request)) return json({ ok: false, errors: ["Unauthorized"] }, { status: 401 });
  return json({ ok: true });
}

export async function saveAdminState(request: Request, store: Store) {
  if (!isAuthed(request)) return json({ ok: false, errors: ["Unauthorized"] }, { status: 401 });

  const body = await parseJson(request);
  const state = body?.state as AppState | undefined;
  if (!state) return json({ ok: false, errors: ["Missing state"] }, { status: 400 });

  const errors = validateState(state);
  if (errors.length) return json({ ok: false, errors }, { status: 400 });

  await store.set(state);
  return json({ ok: true, state });
}

export async function resetAdminState(request: Request, store: Store) {
  if (!isAuthed(request)) return json({ ok: false, errors: ["Unauthorized"] }, { status: 401 });
  const state = freshDB();
  await store.set(state);
  return json({ ok: true, state });
}
