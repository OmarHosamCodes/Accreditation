import {
  activeRubricVersion,
  activeWeightsVersion,
  computeOverall,
  tierFor,
} from "@accreditation/shared";
import type { AppState, Audit, AuditScore, Brand, EvidencePin, Platform } from "@accreditation/shared";
import { cleanText, normalizeHandle } from "./validation.ts";

export function brandAuditCount(db: AppState, brandId: number): number {
  return db.audits.filter((a) => a.brand_id === brandId).length;
}

export function brandApplicationCount(db: AppState, brandId: number): number {
  return db.applications.filter((a) => a.brand_id === brandId).length;
}

export function deleteAuditCascade(db: AppState, auditId: number): boolean {
  const index = db.audits.findIndex((a) => a.id === auditId);
  if (index < 0) return false;
  db.audits.splice(index, 1);
  delete db.audit_scores[String(auditId)];
  db.evidence_pins = db.evidence_pins.filter((p) => p.audit_id !== auditId);
  return true;
}

export function upsertAuditScore(
  db: AppState,
  auditId: number,
  dimId: number,
  score: number,
  note: string,
  confidence?: AuditScore["confidence"],
): AuditScore | null {
  const audit = db.audits.find((a) => a.id === auditId && a.status === "draft");
  const dimension = db.dimensions.find((d) => d.id === dimId);
  if (!audit || !dimension) return null;

  const scores = (db.audit_scores[String(auditId)] ||= []);
  const existing = scores.find((s) => s.dim_id === dimId);
  const evidenceCount = db.evidence_pins.filter((p) => p.audit_id === auditId && p.dim_id === dimId).length;
  const saved: AuditScore = {
    dim_id: dimId,
    score,
    note,
    confidence: confidence || "medium",
    evidence_count: evidenceCount,
    updated_at: Date.now(),
  };

  if (existing) Object.assign(existing, saved);
  else scores.push(saved);

  audit.overall_score = computeOverall(scores, db, audit.weights_version_id);
  audit.tier = tierFor(audit.overall_score).key;
  return saved;
}

export function deleteAuditScore(db: AppState, auditId: number, dimId: number): boolean {
  const audit = db.audits.find((a) => a.id === auditId && a.status === "draft");
  if (!audit) return false;
  const scores = db.audit_scores[String(auditId)] || [];
  const index = scores.findIndex((s) => s.dim_id === dimId);
  if (index < 0) return false;
  scores.splice(index, 1);
  audit.overall_score = computeOverall(scores, db, audit.weights_version_id);
  audit.tier = tierFor(audit.overall_score).key;
  return true;
}

export function publishAudit(
  db: AppState,
  auditId: number,
  summary: string,
  applicationId?: number,
): { audit?: Audit; errors: string[] } {
  const errors: string[] = [];
  const audit = db.audits.find((a) => a.id === auditId && a.status === "draft");
  if (!audit) {
    errors.push("Draft audit not found.");
    return { errors };
  }

  const scores = db.audit_scores[String(auditId)] || [];
  if (summary.length > 1200) errors.push("Summary is too long.");
  if (errors.length) return { errors };

  const overall = computeOverall(scores, db, audit.weights_version_id);
  audit.status = "published";
  audit.overall_score = overall;
  audit.tier = tierFor(overall).key;
  audit.summary = summary || "Audited across all 16 dimensions.";
  audit.submitted_at = Date.now();
  audit.published_at = Date.now();

  if (applicationId) {
    const ap = db.applications.find((a) => a.id === applicationId);
    if (ap) ap.status = "completed";
  } else {
    const inProgress = db.applications.find(
      (a) => a.brand_id === audit.brand_id && (a.status === "in_progress" || a.status === "pending"),
    );
    if (inProgress) inProgress.status = "completed";
  }

  return { audit, errors: [] };
}

export function createBrandInDb(
  db: AppState,
  input: {
    name: string;
    platform: Platform;
    url: string;
    handle?: string;
    contact_email: string;
    niche: string;
  },
): Brand {
  const handle = normalizeHandle(input.handle, input.platform, input.url);
  const brand: Brand = {
    id: db.nextId++,
    name: input.name,
    platform: input.platform,
    handle,
    url: input.url,
    contact_email: input.contact_email.toLowerCase(),
    niche: input.niche,
    created_at: Date.now(),
  };
  db.brands.push(brand);
  return brand;
}

export function createDraftAudit(
  db: AppState,
  brandId: number,
  auditor: string,
  opts?: { rubric_version_id?: number; weights_version_id?: number; source?: Audit["source"] },
): Audit | null {
  const brand = db.brands.find((b) => b.id === brandId);
  if (!brand) return null;

  const audit: Audit = {
    id: db.nextId++,
    brand_id: brandId,
    auditor,
    rubric_version_id: opts?.rubric_version_id ?? activeRubricVersion(db),
    weights_version_id: opts?.weights_version_id ?? activeWeightsVersion(db),
    status: "draft",
    overall_score: 0,
    tier: "roast",
    summary: "",
    created_at: Date.now(),
    source: opts?.source ?? "admin",
  };
  db.audits.push(audit);
  db.audit_scores[String(audit.id)] = [];
  return audit;
}

export function createEvidencePin(
  db: AppState,
  auditId: number,
  body: Record<string, unknown>,
  author: string,
): EvidencePin | null {
  const dimId = Number(body.dim_id);
  const visibility = cleanText(body.visibility) as EvidencePin["visibility"];
  const platform = cleanText(body.platform) as Platform;
  const audit = db.audits.find((a) => a.id === auditId);
  const dimension = db.dimensions.find((d) => d.id === dimId);
  if (!audit || !dimension) return null;

  const pin: EvidencePin = {
    id: db.nextId++,
    audit_id: auditId,
    dim_id: dimId,
    author,
    platform,
    page_url: cleanText(body.page_url).slice(0, 500),
    selector: cleanText(body.selector).slice(0, 500),
    dom_path: cleanText(body.dom_path).slice(0, 1000),
    x: Number(body.x) || 0,
    y: Number(body.y) || 0,
    offset_x_ratio: Number.isFinite(Number(body.offset_x_ratio)) ? Number(body.offset_x_ratio) : undefined,
    offset_y_ratio: Number.isFinite(Number(body.offset_y_ratio)) ? Number(body.offset_y_ratio) : undefined,
    viewport_width: Number(body.viewport_width) || 0,
    viewport_height: Number(body.viewport_height) || 0,
    element_text: cleanText(body.element_text).slice(0, 500),
    note: cleanText(body.note).slice(0, 1200),
    visibility: visibility || "private",
    status: "open",
    created_at: Date.now(),
    updated_at: Date.now(),
  };

  db.evidence_pins.push(pin);
  const score = (db.audit_scores[String(auditId)] || []).find((s) => s.dim_id === dimId);
  if (score) {
    score.evidence_count = db.evidence_pins.filter((p) => p.audit_id === auditId && p.dim_id === dimId).length;
  }
  return pin;
}

export function deleteEvidencePin(db: AppState, evidenceId: number): EvidencePin | null {
  const index = db.evidence_pins.findIndex((p) => p.id === evidenceId);
  if (index < 0) return null;
  const deleted = db.evidence_pins[index]!;
  db.evidence_pins.splice(index, 1);
  const score = (db.audit_scores[String(deleted.audit_id)] || []).find((s) => s.dim_id === deleted.dim_id);
  if (score) {
    score.evidence_count = db.evidence_pins.filter(
      (p) => p.audit_id === deleted.audit_id && p.dim_id === deleted.dim_id,
    ).length;
  }
  return deleted;
}
