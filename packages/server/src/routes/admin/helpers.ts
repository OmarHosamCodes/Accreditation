import type { AppState } from "@accreditation/shared";
import { isAuthed } from "../../http/auth.ts";
import { json } from "../../http/responses.ts";

export async function requireAdmin(request: Request): Promise<Response | null> {
  if (!(await isAuthed(request))) {
    return json({ ok: false, errors: ["Unauthorized"] }, request, { status: 401 });
  }
  return null;
}

export function adminOk(
  request: Request,
  state: AppState,
  extra: Record<string, unknown> = {},
) {
  return json({ ok: true, state, ...extra }, request);
}

export function adminErr(request: Request, errors: string[], status = 400) {
  return json({ ok: false, errors }, request, { status });
}
