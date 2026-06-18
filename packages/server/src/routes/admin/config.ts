import { freshDB } from "@accreditation/shared";
import type { AppState } from "@accreditation/shared";
import { json, parseJson } from "../../http/responses.ts";
import type { Store } from "../../store/types.ts";
import { validateState } from "../../services/validation.ts";
import { adminErr, requireAdmin } from "./helpers.ts";

export async function saveAdminState(request: Request, store: Store) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  const body = await parseJson(request);
  const state = body?.state as AppState | undefined;
  if (!state) return adminErr(request, ["Missing state"]);

  const errors = validateState(state);
  if (errors.length) return adminErr(request, errors);

  await store.set(state);
  return json({ ok: true, state }, request);
}

export async function resetAdminState(request: Request, store: Store) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  const state = freshDB();
  await store.set(state);
  return json({ ok: true, state }, request);
}
