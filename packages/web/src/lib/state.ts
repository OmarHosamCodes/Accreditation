import type { AppState } from "@accreditation/shared";
import { activeWeights as sharedActiveWeights, computeOverall as sharedComputeOverall } from "@accreditation/shared";

export type AdminCredentials = { user: string; pass: string } | null;

export let DB: AppState | null = null;
export let adminCredentials: AdminCredentials = null;

export function setDB(state: AppState | null) {
  DB = state;
}

export function setAdminCredentials(credentials: AdminCredentials) {
  adminCredentials = credentials;
}

export function activeWeights(db: AppState, weightsVersionId: number) {
  return sharedActiveWeights(db, weightsVersionId);
}

export function computeOverall(
  scoreArr: Array<{ dim_id: number; score: number }>,
  db: AppState,
  _rubricVersionId: number,
  weightsVersionId: number,
) {
  return sharedComputeOverall(scoreArr, db, weightsVersionId);
}

export function catBreakdown(scoreArr: Array<{ dim_id: number; score: number; note?: string }>, db: AppState) {
  return db.categories.map((cat) => {
    const dims = db.dimensions.filter((d) => d.category_key === cat.key);
    let sum = 0;
    let n = 0;
    const rows: Array<{ dim: (typeof dims)[number]; score: number; note: string }> = [];
    dims.forEach((d) => {
      const s = scoreArr.find((x) => x.dim_id === d.id);
      const v = s ? s.score : 0;
      sum += v;
      n++;
      rows.push({ dim: d, score: v, note: s?.note || "" });
    });
    return { cat, avg: n ? sum / n : 0, rows };
  });
}

export function fmtDate(ts: number | undefined) {
  return new Date(ts || 0).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function esc(s: unknown) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[m]!);
}

export function brandById(db: AppState, id: number) {
  return db.brands.find((b) => b.id === id);
}

export function publishedAudits(db: AppState) {
  return db.audits.filter((a) => a.status === "published");
}

export function latestAuditByBrand(db: AppState) {
  const map: Record<number, (typeof db.audits)[number]> = {};
  publishedAudits(db).forEach((a) => {
    if (!map[a.brand_id] || a.published_at! > map[a.brand_id]!.published_at!) {
      map[a.brand_id] = a;
    }
  });
  return Object.values(map);
}

export function auditEvidence(db: AppState, auditId: number, dimId?: number) {
  const pins = db.evidence_pins || [];
  return pins.filter((p) => p.audit_id === auditId && (!dimId || p.dim_id === dimId) && p.visibility !== "private");
}

export function anchorForText(
  anchor: { anchor_1: string; anchor_5: string; anchor_10: string },
  score: number,
): { label: string; text: string } {
  if (score <= 3) return { label: "1", text: anchor.anchor_1 };
  if (score <= 7) return { label: "5", text: anchor.anchor_5 };
  return { label: "10", text: anchor.anchor_10 };
}
