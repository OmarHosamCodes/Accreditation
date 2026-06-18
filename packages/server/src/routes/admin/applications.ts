import type { ApplicationStatus } from "@accreditation/shared";
import { authUser } from "../../http/auth.ts";
import { parseJson } from "../../http/responses.ts";
import type { Store } from "../../store/types.ts";
import { cleanText } from "../../services/validation.ts";
import { adminErr, adminOk, requireAdmin } from "./helpers.ts";

export async function listApplications(request: Request, store: Store) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  const url = new URL(request.url);
  const status = cleanText(url.searchParams.get("status")) as ApplicationStatus;
  const state = await store.get();
  let applications = [...state.applications].sort((a, b) => b.created_at - a.created_at);
  if (status && ["pending", "in_progress", "completed", "rejected"].includes(status)) {
    applications = applications.filter((a) => a.status === status);
  }
  return adminOk(request, state, { applications });
}

export async function getApplication(request: Request, store: Store, applicationId: number) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  const state = await store.get();
  const application = state.applications.find((a) => a.id === applicationId);
  if (!application) return adminErr(request, ["Application not found"], 404);
  const brand = state.brands.find((b) => b.id === application.brand_id);
  return adminOk(request, state, { application, brand });
}

export async function updateApplication(request: Request, store: Store, applicationId: number) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  const body = await parseJson(request);
  let application;
  const state = await store.mutate((db) => {
    const item = db.applications.find((a) => a.id === applicationId);
    if (!item) return;
    if (body?.why !== undefined) item.why = cleanText(body.why);
    if (body?.changes_note !== undefined) item.changes_note = cleanText(body.changes_note);
    if (body?.status !== undefined) {
      const st = cleanText(body.status) as ApplicationStatus;
      if (["pending", "in_progress", "completed", "rejected"].includes(st)) item.status = st;
    }
    application = item;
  });

  if (!application) return adminErr(request, ["Application not found"], 404);
  return adminOk(request, state, { application });
}

export async function claimApplication(request: Request, store: Store, applicationId: number) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  const auditor = (await authUser(request)) || "Auditor";
  let application;
  const state = await store.mutate((db) => {
    const item = db.applications.find((a) => a.id === applicationId);
    if (!item) return;
    if (item.status === "completed" || item.status === "rejected") return;
    item.status = "in_progress";
    item.claimed_by = auditor;
    application = item;
  });

  if (!application) return adminErr(request, ["Application not found or not claimable"], 404);
  return adminOk(request, state, { application });
}

export async function rejectApplication(request: Request, store: Store, applicationId: number) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  const body = await parseJson(request);
  const reason = cleanText(body?.reason);
  let application;
  const state = await store.mutate((db) => {
    const item = db.applications.find((a) => a.id === applicationId);
    if (!item) return;
    item.status = "rejected";
    item.reject_reason = reason;
    application = item;
  });

  if (!application) return adminErr(request, ["Application not found"], 404);
  return adminOk(request, state, { application });
}

export async function deleteApplication(request: Request, store: Store, applicationId: number) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  const state = await store.mutate((db) => {
    const index = db.applications.findIndex((a) => a.id === applicationId);
    if (index >= 0) db.applications.splice(index, 1);
  });

  const stillExists = state.applications.some((a) => a.id === applicationId);
  if (stillExists) return adminErr(request, ["Application not found"], 404);
  return adminOk(request, state, { application_id: applicationId });
}
