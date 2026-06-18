import type { EvidencePin } from "@accreditation/shared";
import { authUser } from "../../http/auth.ts";
import { parseJson } from "../../http/responses.ts";
import type { Store } from "../../store/types.ts";
import { createEvidencePin, deleteEvidencePin } from "../../services/admin-mutations.ts";
import { cleanText } from "../../services/validation.ts";
import { adminErr, adminOk, requireAdmin } from "./helpers.ts";

export async function listEvidence(request: Request, store: Store) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  const url = new URL(request.url);
  const auditId = Number(url.searchParams.get("audit_id"));
  const brandId = Number(url.searchParams.get("brand_id"));
  const state = await store.get();
  let evidence = state.evidence_pins;

  if (Number.isFinite(auditId) && auditId > 0) {
    evidence = evidence.filter((p) => p.audit_id === auditId);
  } else if (Number.isFinite(brandId) && brandId > 0) {
    const auditIds = new Set(state.audits.filter((a) => a.brand_id === brandId).map((a) => a.id));
    evidence = evidence.filter((p) => auditIds.has(p.audit_id));
  }

  return adminOk(request, state, { evidence });
}

export async function createEvidence(request: Request, store: Store, auditId: number) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  const body = await parseJson(request);
  const author = (await authUser(request)) || "Auditor";
  const errors: string[] = [];

  if (!Number.isInteger(Number(body?.dim_id))) errors.push("Missing metric dimension.");
  if (cleanText(body?.note).length < 2) errors.push("Evidence note is required.");
  if (errors.length) return adminErr(request, errors);

  let pin;
  const state = await store.mutate((db) => {
    pin = createEvidencePin(db, auditId, body ?? {}, author);
  });

  if (!pin) return adminErr(request, ["Audit or dimension not found"], 404);
  return adminOk(request, state, { evidence: pin });
}

export async function updateEvidence(request: Request, store: Store, evidenceId: number) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  const body = await parseJson(request);
  let pin;
  const state = await store.mutate((db) => {
    const item = db.evidence_pins.find((p) => p.id === evidenceId);
    if (!item) return;
    if (body?.note !== undefined) item.note = cleanText(body.note).slice(0, 1200);
    if (body?.visibility !== undefined) {
      const v = cleanText(body.visibility) as EvidencePin["visibility"];
      if (["private", "brand-visible", "public"].includes(v)) item.visibility = v;
    }
    if (body?.status !== undefined) {
      const s = cleanText(body.status) as EvidencePin["status"];
      if (["open", "resolved", "detached"].includes(s)) item.status = s;
    }
    item.updated_at = Date.now();
    pin = item;
  });

  if (!pin) return adminErr(request, ["Evidence not found"], 404);
  return adminOk(request, state, { evidence: pin });
}

export async function deleteEvidence(request: Request, store: Store, evidenceId: number) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  let deleted;
  const state = await store.mutate((db) => {
    deleted = deleteEvidencePin(db, evidenceId);
  });

  if (!deleted) return adminErr(request, ["Evidence not found"], 404);
  return adminOk(request, state, { evidence_id: evidenceId });
}
