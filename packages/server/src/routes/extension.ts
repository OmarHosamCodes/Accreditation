import {
  TIERS,
  activeRubricVersion,
  activeWeights,
  activeWeightsVersion,
  computeOverall,
  tierFor,
} from "@accreditation/shared";
import type { AppState, Audit, AuditScore, EvidencePin, Platform } from "@accreditation/shared";
import { config } from "../config.ts";
import { authUser, isAuthed } from "../http/auth.ts";
import { json, parseJson } from "../http/responses.ts";
import type { Store } from "../store/types.ts";
import { cleanText, normalizeHandle } from "../services/validation.ts";

function extensionBootstrap(db: AppState) {
  const rubricVersionId = activeRubricVersion(db);
  const weightsVersionId = activeWeightsVersion(db);
  return {
    categories: db.categories,
    dimensions: db.dimensions,
    rubric_version_id: rubricVersionId,
    rubric_anchors: db.rubric_anchors[String(rubricVersionId)] || {},
    weights_version_id: weightsVersionId,
    weights: activeWeights(db, weightsVersionId),
    tiers: TIERS,
  };
}

export async function extensionLogin(request: Request, store: Store) {
  if (!isAuthed(request)) return json({ ok: false, errors: ["Unauthorized"] }, { status: 401 });
  const user = authUser(request);
  return json({
    ok: true,
    user: { name: user || "Roaster", role: user === config.adminUsername ? "admin" : "auditor" },
    bootstrap: extensionBootstrap(await store.get()),
  });
}

export async function extensionBootstrapRoute(request: Request, store: Store) {
  if (!isAuthed(request)) return json({ ok: false, errors: ["Unauthorized"] }, { status: 401 });
  return json({ ok: true, bootstrap: extensionBootstrap(await store.get()) });
}

export async function extensionResolveBrand(request: Request, store: Store) {
  if (!isAuthed(request)) return json({ ok: false, errors: ["Unauthorized"] }, { status: 401 });
  const body = await parseJson(request);
  const platform = cleanText(body?.platform) as Platform;
  const url = cleanText(body?.url);
  const detectedName = cleanText(body?.detected_name) || cleanText(body?.name);
  const niche = cleanText(body?.niche) || "Uncategorized";
  const contactEmail = cleanText(body?.contact_email).toLowerCase() || "extension@accreditation.local";
  const errors: string[] = [];

  if (!["ig", "fb"].includes(platform)) errors.push("Platform must be ig or fb.");
  if (!/^https?:\/\/(www\.)?(facebook|instagram)\.com\//i.test(url)) errors.push("URL must be an Instagram or Facebook page.");
  if (errors.length) return json({ ok: false, errors }, { status: 400 });

  const handle = normalizeHandle(body?.handle, platform, url);
  let brandId = 0;
  let created = false;
  const state = await store.mutate((db) => {
    const existing = db.brands.find((brand) => brand.platform === platform && (brand.handle.toLowerCase() === handle.toLowerCase() || brand.url === url));
    if (existing) {
      existing.url = url || existing.url;
      if (detectedName && existing.name === existing.handle) existing.name = detectedName;
      brandId = existing.id;
      return;
    }

    brandId = db.nextId++;
    created = true;
    db.brands.push({
      id: brandId,
      name: detectedName || handle,
      platform,
      handle,
      url,
      contact_email: contactEmail,
      niche,
      created_at: Date.now(),
    });
  });

  return json({ ok: true, brand_id: brandId, created, brand: state.brands.find((brand) => brand.id === brandId) });
}

export async function extensionCreateAudit(request: Request, store: Store) {
  if (!isAuthed(request)) return json({ ok: false, errors: ["Unauthorized"] }, { status: 401 });
  const body = await parseJson(request);
  const brandId = Number(body?.brand_id);
  const auditor = authUser(request) || "Roaster";
  let auditId = 0;

  const state = await store.mutate((db) => {
    const brand = db.brands.find((item) => item.id === brandId);
    if (!brand) return;

    const existing = db.audits.find((audit) => audit.brand_id === brandId && audit.status === "draft" && audit.source === "extension");
    if (existing) {
      auditId = existing.id;
      return;
    }

    auditId = db.nextId++;
    db.audits.push({
      id: auditId,
      brand_id: brandId,
      auditor,
      rubric_version_id: Number(body?.rubric_version_id) || activeRubricVersion(db),
      weights_version_id: Number(body?.weights_version_id) || activeWeightsVersion(db),
      status: "draft",
      overall_score: 0,
      tier: "roast",
      summary: "",
      created_at: Date.now(),
      source: "extension",
    });
    db.audit_scores[String(auditId)] = [];
  });

  if (!auditId) return json({ ok: false, errors: ["Brand not found"] }, { status: 404 });
  const audit = state.audits.find((item) => item.id === auditId);
  return json({
    ok: true,
    audit,
    scores: state.audit_scores[String(auditId)] || [],
    evidence: state.evidence_pins.filter((pin) => pin.audit_id === auditId),
    bootstrap: extensionBootstrap(state),
  });
}

export async function extensionGetAudit(request: Request, store: Store, auditId: number) {
  if (!isAuthed(request)) return json({ ok: false, errors: ["Unauthorized"] }, { status: 401 });
  const state = await store.get();
  const audit = state.audits.find((item) => item.id === auditId);
  if (!audit) return json({ ok: false, errors: ["Audit not found"] }, { status: 404 });
  return json({
    ok: true,
    audit,
    brand: state.brands.find((brand) => brand.id === audit.brand_id),
    scores: state.audit_scores[String(auditId)] || [],
    evidence: state.evidence_pins.filter((pin) => pin.audit_id === auditId),
    bootstrap: extensionBootstrap(state),
  });
}

export async function extensionSaveScore(request: Request, store: Store, auditId: number, dimId: number) {
  if (!isAuthed(request)) return json({ ok: false, errors: ["Unauthorized"] }, { status: 401 });
  const body = await parseJson(request);
  const score = Number(body?.score);
  const note = cleanText(body?.note);
  const confidence = cleanText(body?.confidence) as AuditScore["confidence"];
  const errors: string[] = [];

  if (!Number.isInteger(score) || score < 1 || score > 10) errors.push("Score must be an integer from 1 to 10.");
  if (note.length > 1200) errors.push("Note is too long.");
  if (confidence && !["low", "medium", "high"].includes(confidence)) errors.push("Invalid confidence.");
  if (errors.length) return json({ ok: false, errors }, { status: 400 });

  let saved: AuditScore | undefined;
  const state = await store.mutate((db) => {
    const audit = db.audits.find((item) => item.id === auditId && item.status === "draft");
    const dimension = db.dimensions.find((item) => item.id === dimId);
    if (!audit || !dimension) return;

    const scores = (db.audit_scores[String(auditId)] ||= []);
    const existing = scores.find((item) => item.dim_id === dimId);
    const evidenceCount = db.evidence_pins.filter((pin) => pin.audit_id === auditId && pin.dim_id === dimId).length;
    saved = {
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
  });

  if (!saved) return json({ ok: false, errors: ["Draft audit or dimension not found"] }, { status: 404 });
  return json({ ok: true, score: saved, audit: state.audits.find((item) => item.id === auditId) });
}

export async function extensionCreateEvidence(request: Request, store: Store, auditId: number) {
  if (!isAuthed(request)) return json({ ok: false, errors: ["Unauthorized"] }, { status: 401 });
  const body = await parseJson(request);
  const dimId = Number(body?.dim_id);
  const visibility = cleanText(body?.visibility) as EvidencePin["visibility"];
  const platform = cleanText(body?.platform) as Platform;
  const errors: string[] = [];

  if (!Number.isInteger(dimId)) errors.push("Missing metric dimension.");
  if (!["ig", "fb"].includes(platform)) errors.push("Platform must be ig or fb.");
  if (visibility && !["private", "brand-visible", "public"].includes(visibility)) errors.push("Invalid visibility.");
  if (cleanText(body?.note).length < 2) errors.push("Evidence note is required.");
  if (errors.length) return json({ ok: false, errors }, { status: 400 });

  let pin: EvidencePin | undefined;
  const state = await store.mutate((db) => {
    const audit = db.audits.find((item) => item.id === auditId && item.status === "draft");
    const dimension = db.dimensions.find((item) => item.id === dimId);
    if (!audit || !dimension) return;

    pin = {
      id: db.nextId++,
      audit_id: auditId,
      dim_id: dimId,
      author: authUser(request) || "Roaster",
      platform,
      page_url: cleanText(body?.page_url).slice(0, 500),
      selector: cleanText(body?.selector).slice(0, 500),
      dom_path: cleanText(body?.dom_path).slice(0, 1000),
      x: Number(body?.x) || 0,
      y: Number(body?.y) || 0,
      offset_x_ratio: Number.isFinite(Number(body?.offset_x_ratio)) ? Number(body?.offset_x_ratio) : undefined,
      offset_y_ratio: Number.isFinite(Number(body?.offset_y_ratio)) ? Number(body?.offset_y_ratio) : undefined,
      viewport_width: Number(body?.viewport_width) || 0,
      viewport_height: Number(body?.viewport_height) || 0,
      element_text: cleanText(body?.element_text).slice(0, 500),
      note: cleanText(body?.note).slice(0, 1200),
      visibility: visibility || "private",
      status: "open",
      created_at: Date.now(),
      updated_at: Date.now(),
    };

    db.evidence_pins.push(pin);
    const score = (db.audit_scores[String(auditId)] || []).find((item) => item.dim_id === dimId);
    if (score) score.evidence_count = db.evidence_pins.filter((item) => item.audit_id === auditId && item.dim_id === dimId).length;
  });

  if (!pin) return json({ ok: false, errors: ["Draft audit or dimension not found"] }, { status: 404 });
  return json({ ok: true, evidence: pin, audit: state.audits.find((item) => item.id === auditId) });
}

export async function extensionDeleteEvidence(request: Request, store: Store, auditId: number, evidenceId: number) {
  if (!isAuthed(request)) return json({ ok: false, errors: ["Unauthorized"] }, { status: 401 });
  let deleted: EvidencePin | undefined;
  const state = await store.mutate((db) => {
    const audit = db.audits.find((item) => item.id === auditId && item.status === "draft");
    if (!audit) return;
    const index = db.evidence_pins.findIndex((pin) => pin.id === evidenceId && pin.audit_id === auditId);
    if (index < 0) return;
    deleted = db.evidence_pins[index];
    db.evidence_pins.splice(index, 1);
    const score = (db.audit_scores[String(auditId)] || []).find((item) => item.dim_id === deleted!.dim_id);
    if (score) {
      score.evidence_count = db.evidence_pins.filter((item) => item.audit_id === auditId && item.dim_id === deleted!.dim_id).length;
    }
  });

  if (!deleted) return json({ ok: false, errors: ["Draft audit or evidence not found"] }, { status: 404 });
  return json({ ok: true, evidence_id: evidenceId, audit: state.audits.find((item) => item.id === auditId) });
}

export async function extensionListEvidence(request: Request, store: Store, auditId: number) {
  if (!isAuthed(request)) return json({ ok: false, errors: ["Unauthorized"] }, { status: 401 });
  const state = await store.get();
  return json({ ok: true, evidence: state.evidence_pins.filter((pin) => pin.audit_id === auditId) });
}

export async function extensionSubmitAudit(request: Request, store: Store, auditId: number) {
  if (!isAuthed(request)) return json({ ok: false, errors: ["Unauthorized"] }, { status: 401 });
  const body = await parseJson(request);
  const summary = cleanText(body?.summary);
  const errors: string[] = [];
  let publishedAudit: Audit | undefined;

  const state = await store.mutate((db) => {
    const audit = db.audits.find((item) => item.id === auditId && item.status === "draft");
    if (!audit) {
      errors.push("Draft audit not found.");
      return;
    }

    const scores = db.audit_scores[String(auditId)] || [];
    if (summary.length > 1200) errors.push("Summary is too long.");
    if (errors.length) return;

    const overall = computeOverall(scores, db, audit.weights_version_id);
    audit.status = "published";
    audit.overall_score = overall;
    audit.tier = tierFor(overall).key;
    audit.summary = summary || "Audited from the live page with extension evidence.";
    audit.submitted_at = Date.now();
    audit.published_at = Date.now();
    publishedAudit = audit;
  });

  if (errors.length) return json({ ok: false, errors }, { status: 400 });
  return json({
    ok: true,
    audit: publishedAudit,
    status: "published",
    overall_score: publishedAudit?.overall_score,
    tier: publishedAudit ? tierFor(publishedAudit.overall_score).name : undefined,
    public_url: publishedAudit ? `${new URL(request.url).origin}/#audit/${publishedAudit.id}` : undefined,
    state,
  });
}
