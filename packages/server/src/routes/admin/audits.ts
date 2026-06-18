import type { AuditScore, AuditStatus } from "@accreditation/shared";
import { authUser } from "../../http/auth.ts";
import { parseJson } from "../../http/responses.ts";
import type { Store } from "../../store/types.ts";
import {
  createDraftAudit,
  deleteAuditCascade,
  deleteAuditScore,
  publishAudit,
  upsertAuditScore,
} from "../../services/admin-mutations.ts";
import { cleanText } from "../../services/validation.ts";
import { adminErr, adminOk, requireAdmin } from "./helpers.ts";

export async function listAudits(request: Request, store: Store) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  const url = new URL(request.url);
  const status = cleanText(url.searchParams.get("status")) as AuditStatus;
  const brandId = Number(url.searchParams.get("brand_id"));
  const state = await store.get();
  let audits = [...state.audits].sort((a, b) => b.created_at - a.created_at);
  if (status && ["draft", "published"].includes(status)) {
    audits = audits.filter((a) => a.status === status);
  }
  if (Number.isFinite(brandId) && brandId > 0) {
    audits = audits.filter((a) => a.brand_id === brandId);
  }
  return adminOk(request, state, { audits });
}

export async function getAudit(request: Request, store: Store, auditId: number) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  const state = await store.get();
  const audit = state.audits.find((a) => a.id === auditId);
  if (!audit) return adminErr(request, ["Audit not found"], 404);
  const brand = state.brands.find((b) => b.id === audit.brand_id);
  const scores = state.audit_scores[String(auditId)] || [];
  const evidence = state.evidence_pins.filter((p) => p.audit_id === auditId);
  return adminOk(request, state, { audit, brand, scores, evidence });
}

export async function createAudit(request: Request, store: Store) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  const body = await parseJson(request);
  const brandId = Number(body?.brand_id);
  const auditor = (await authUser(request)) || "Auditor";
  let audit;
  const state = await store.mutate((db) => {
    audit = createDraftAudit(db, brandId, auditor, {
      rubric_version_id: Number(body?.rubric_version_id) || undefined,
      weights_version_id: Number(body?.weights_version_id) || undefined,
      source: "admin",
    });
  });

  if (!audit) return adminErr(request, ["Brand not found"], 404);
  return adminOk(request, state, { audit });
}

export async function updateAudit(request: Request, store: Store, auditId: number) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  const body = await parseJson(request);
  let audit;
  const state = await store.mutate((db) => {
    const item = db.audits.find((a) => a.id === auditId);
    if (!item) return;
    if (body?.summary !== undefined) item.summary = cleanText(body.summary).slice(0, 1200);
    if (body?.status !== undefined && item.status === "published") {
      const st = cleanText(body.status);
      if (st === "draft") {
        item.status = "draft";
        item.published_at = undefined;
        item.submitted_at = undefined;
      }
    }
    audit = item;
  });

  if (!audit) return adminErr(request, ["Audit not found"], 404);
  return adminOk(request, state, { audit });
}

export async function publishAuditRoute(request: Request, store: Store, auditId: number) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  const body = await parseJson(request);
  const summary = cleanText(body?.summary);
  const applicationId = body?.application_id ? Number(body.application_id) : undefined;
  let audit;
  let errors: string[] = [];

  const state = await store.mutate((db) => {
    const result = publishAudit(db, auditId, summary, applicationId);
    errors = result.errors;
    audit = result.audit;
  });

  if (errors.length) return adminErr(request, errors);
  if (!audit) return adminErr(request, ["Draft audit not found"], 404);
  return adminOk(request, state, { audit });
}

export async function deleteAudit(request: Request, store: Store, auditId: number) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  const state = await store.mutate((db) => {
    deleteAuditCascade(db, auditId);
  });

  const stillExists = state.audits.some((a) => a.id === auditId);
  if (stillExists) return adminErr(request, ["Audit not found"], 404);
  return adminOk(request, state, { audit_id: auditId });
}

export async function upsertScore(request: Request, store: Store, auditId: number, dimId: number) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  const body = await parseJson(request);
  const score = Number(body?.score);
  const note = cleanText(body?.note);
  const confidence = cleanText(body?.confidence) as AuditScore["confidence"];
  const errors: string[] = [];

  if (!Number.isInteger(score) || score < 1 || score > 10) errors.push("Score must be an integer from 1 to 10.");
  if (note.length > 1200) errors.push("Note is too long.");
  if (confidence && !["low", "medium", "high"].includes(confidence)) errors.push("Invalid confidence.");
  if (errors.length) return adminErr(request, errors);

  let saved;
  const state = await store.mutate((db) => {
    saved = upsertAuditScore(db, auditId, dimId, score, note, confidence);
  });

  if (!saved) return adminErr(request, ["Draft audit or dimension not found"], 404);
  const audit = state.audits.find((a) => a.id === auditId);
  return adminOk(request, state, { score: saved, audit });
}

export async function removeScore(request: Request, store: Store, auditId: number, dimId: number) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  const state = await store.mutate((db) => {
    deleteAuditScore(db, auditId, dimId);
  });

  const audit = state.audits.find((a) => a.id === auditId);
  if (!audit) return adminErr(request, ["Audit not found"], 404);
  return adminOk(request, state, { audit_id: auditId, dim_id: dimId });
}

/** Bulk save scores for admin editor publish/draft flow */
export async function bulkSaveScores(request: Request, store: Store, auditId: number) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  const body = await parseJson(request);
  const scores = Array.isArray(body?.scores) ? body.scores : [];
  const summary = cleanText(body?.summary);
  const status = cleanText(body?.status) as "draft" | "published";
  const applicationId = body?.application_id ? Number(body.application_id) : undefined;

  let audit;
  let errors: string[] = [];

  const state = await store.mutate((db) => {
    const item = db.audits.find((a) => a.id === auditId);
    if (!item) return;

    for (const raw of scores) {
      const dimId = Number((raw as Record<string, unknown>).dim_id);
      const score = Number((raw as Record<string, unknown>).score);
      const note = cleanText((raw as Record<string, unknown>).note);
      if (!Number.isInteger(dimId) || !Number.isInteger(score)) continue;
      upsertAuditScore(db, auditId, dimId, score, note);
    }

    if (summary) item.summary = summary.slice(0, 1200);

    if (status === "published") {
      const result = publishAudit(db, auditId, summary || item.summary, applicationId);
      errors = result.errors;
      audit = result.audit;
    } else {
      audit = item;
    }
  });

  if (errors.length) return adminErr(request, errors);
  if (!audit) return adminErr(request, ["Audit not found"], 404);
  return adminOk(request, state, { audit });
}

/** Create or update audit with all scores in one request (editor flow) */
export async function saveAuditDraft(request: Request, store: Store) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  const body = await parseJson(request);
  const brandId = Number(body?.brand_id);
  const applicationId = body?.application_id ? Number(body.application_id) : undefined;
  const auditId = body?.audit_id ? Number(body.audit_id) : undefined;
  const scores = Array.isArray(body?.scores) ? body.scores : [];
  const summary = cleanText(body?.summary);
  const auditor = (await authUser(request)) || "Auditor";

  let audit;
  const state = await store.mutate((db) => {
    let item = auditId ? db.audits.find((a) => a.id === auditId) : undefined;
    if (!item) {
      item = createDraftAudit(db, brandId, auditor, { source: "admin" }) ?? undefined;
    }
    if (!item) return;
    audit = item;

    for (const raw of scores) {
      const dimId = Number((raw as Record<string, unknown>).dim_id);
      const score = Number((raw as Record<string, unknown>).score);
      const note = cleanText((raw as Record<string, unknown>).note);
      if (!Number.isInteger(dimId) || !Number.isInteger(score)) continue;
      upsertAuditScore(db, item.id, dimId, score, note);
    }

    if (summary) item.summary = summary.slice(0, 1200);
  });

  if (!audit) return adminErr(request, ["Brand not found"], 404);
  return adminOk(request, state, { audit, application_id: applicationId });
}
