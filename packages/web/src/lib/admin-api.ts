import type { AppState, Application, Audit, Brand, EvidencePin } from "@accreditation/shared";
import { apiJSON } from "./api.ts";

type AdminResponse<T = Record<string, unknown>> = T & { ok: boolean; state?: AppState; errors?: string[] };

async function adminFetch<T>(path: string, opts: RequestInit = {}): Promise<AdminResponse<T>> {
  return apiJSON(path, opts) as Promise<AdminResponse<T>>;
}

// Config
export async function resetState() {
  return adminFetch("/api/admin/reset", { method: "POST", body: "{}" });
}

// Brands
export async function listBrands(q?: string) {
  const qs = q ? `?q=${encodeURIComponent(q)}` : "";
  return adminFetch<{ brands: Brand[] }>(`/api/admin/brands${qs}`);
}

export async function createBrand(data: Partial<Brand>) {
  return adminFetch<{ brand: Brand }>("/api/admin/brands", { method: "POST", body: JSON.stringify(data) });
}

export async function updateBrand(id: number, data: Partial<Brand>) {
  return adminFetch<{ brand: Brand }>(`/api/admin/brands/${id}`, { method: "PATCH", body: JSON.stringify(data) });
}

export async function deleteBrand(id: number) {
  return adminFetch(`/api/admin/brands/${id}`, { method: "DELETE" });
}

// Applications
export async function listApplications(status?: string) {
  const qs = status ? `?status=${encodeURIComponent(status)}` : "";
  return adminFetch<{ applications: Application[] }>(`/api/admin/applications${qs}`);
}

export async function getApplication(id: number) {
  return adminFetch<{ application: Application; brand: Brand }>(`/api/admin/applications/${id}`);
}

export async function claimApplication(id: number) {
  return adminFetch<{ application: Application }>(`/api/admin/applications/${id}/claim`, { method: "POST", body: "{}" });
}

export async function rejectApplication(id: number, reason: string) {
  return adminFetch<{ application: Application }>(`/api/admin/applications/${id}/reject`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
}

export async function deleteApplication(id: number) {
  return adminFetch(`/api/admin/applications/${id}`, { method: "DELETE" });
}

// Audits
export async function listAudits(params?: { status?: string; brand_id?: number }) {
  const search = new URLSearchParams();
  if (params?.status) search.set("status", params.status);
  if (params?.brand_id) search.set("brand_id", String(params.brand_id));
  const qs = search.toString() ? `?${search}` : "";
  return adminFetch<{ audits: Audit[] }>(`/api/admin/audits${qs}`);
}

export async function getAudit(id: number) {
  return adminFetch<{ audit: Audit; brand: Brand; scores: unknown[]; evidence: EvidencePin[] }>(`/api/admin/audits/${id}`);
}

export async function createAudit(brandId: number) {
  return adminFetch<{ audit: Audit }>("/api/admin/audits", { method: "POST", body: JSON.stringify({ brand_id: brandId }) });
}

export async function saveAuditDraft(data: {
  brand_id: number;
  audit_id?: number;
  application_id?: number;
  summary?: string;
  scores: Array<{ dim_id: number; score: number; note: string }>;
}) {
  return adminFetch<{ audit: Audit }>("/api/admin/audits/draft", { method: "POST", body: JSON.stringify(data) });
}

export async function publishAudit(id: number, summary: string, applicationId?: number) {
  return adminFetch<{ audit: Audit }>(`/api/admin/audits/${id}/publish`, {
    method: "POST",
    body: JSON.stringify({ summary, application_id: applicationId }),
  });
}

export async function bulkSaveAuditScores(
  id: number,
  data: { scores: Array<{ dim_id: number; score: number; note: string }>; summary?: string; status?: "draft" | "published"; application_id?: number },
) {
  return adminFetch<{ audit: Audit }>(`/api/admin/audits/${id}/scores`, { method: "PUT", body: JSON.stringify(data) });
}

export async function deleteAudit(id: number) {
  return adminFetch(`/api/admin/audits/${id}`, { method: "DELETE" });
}

export async function unpublishAudit(id: number) {
  return adminFetch<{ audit: Audit }>(`/api/admin/audits/${id}`, { method: "PATCH", body: JSON.stringify({ status: "draft" }) });
}

// Evidence
export async function listEvidence(params?: { audit_id?: number; brand_id?: number }) {
  const search = new URLSearchParams();
  if (params?.audit_id) search.set("audit_id", String(params.audit_id));
  if (params?.brand_id) search.set("brand_id", String(params.brand_id));
  const qs = search.toString() ? `?${search}` : "";
  return adminFetch<{ evidence: EvidencePin[] }>(`/api/admin/evidence${qs}`);
}

export async function createEvidence(auditId: number, data: Partial<EvidencePin>) {
  return adminFetch<{ evidence: EvidencePin }>(`/api/admin/audits/${auditId}/evidence`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateEvidence(id: number, data: Partial<EvidencePin>) {
  return adminFetch<{ evidence: EvidencePin }>(`/api/admin/evidence/${id}`, { method: "PATCH", body: JSON.stringify(data) });
}

export async function deleteEvidence(id: number) {
  return adminFetch(`/api/admin/evidence/${id}`, { method: "DELETE" });
}

// Users
export type AdminUser = { id?: string; name: string; email: string; role: string; created_at?: number };

export async function listUsers() {
  return adminFetch<{ users: AdminUser[] }>("/api/admin/users");
}

export async function createUser(data: { name: string; email: string; password: string; role: string }) {
  return adminFetch<{ user: AdminUser }>("/api/admin/users", { method: "POST", body: JSON.stringify(data) });
}

export async function deleteUser(id: string) {
  return adminFetch(`/api/admin/users/${id}`, { method: "DELETE" });
}
