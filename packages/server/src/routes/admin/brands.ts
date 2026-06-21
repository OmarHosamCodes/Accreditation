import { isSocialPageUrl, type Platform } from "@accreditation/shared";
import { parseJson } from "../../http/responses.ts";
import type { Store } from "../../store/types.ts";
import {
  brandAuditCount,
  brandApplicationCount,
  createBrandInDb,
} from "../../services/admin-mutations.ts";
import { cleanText, normalizeHandle } from "../../services/validation.ts";
import { adminErr, adminOk, requireAdmin } from "./helpers.ts";

export async function listBrands(request: Request, store: Store) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  const url = new URL(request.url);
  const q = cleanText(url.searchParams.get("q")).toLowerCase();
  const state = await store.get();
  let brands = state.brands;
  if (q) {
    brands = brands.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        b.handle.toLowerCase().includes(q) ||
        b.niche.toLowerCase().includes(q) ||
        b.contact_email.toLowerCase().includes(q),
    );
  }
  return adminOk(request, state, { brands });
}

export async function createBrand(request: Request, store: Store) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  const body = await parseJson(request);
  const name = cleanText(body?.name);
  const platform = cleanText(body?.platform) as Platform;
  const url = cleanText(body?.url);
  const contactEmail = cleanText(body?.contact_email).toLowerCase();
  const niche = cleanText(body?.niche);
  const errors: string[] = [];

  if (name.length < 2) errors.push("Brand name is required.");
  if (!["ig", "fb"].includes(platform)) errors.push("Platform must be ig or fb.");
  if (!isSocialPageUrl(url)) {
    errors.push("URL must be a facebook.com or instagram.com link.");
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(contactEmail)) errors.push("Enter a valid email.");
  if (niche.length < 2) errors.push("Niche is required.");
  if (errors.length) return adminErr(request, errors);

  let brand;
  const state = await store.mutate((db) => {
    brand = createBrandInDb(db, {
      name,
      platform,
      url,
      handle: cleanText(body?.handle),
      contact_email: contactEmail,
      niche,
    });
  });

  return adminOk(request, state, { brand });
}

export async function updateBrand(request: Request, store: Store, brandId: number) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  const body = await parseJson(request);
  let brand;
  const state = await store.mutate((db) => {
    const item = db.brands.find((b) => b.id === brandId);
    if (!item) return;
    if (body?.name !== undefined) item.name = cleanText(body.name);
    if (body?.platform !== undefined) {
      const p = cleanText(body.platform) as Platform;
      if (["ig", "fb"].includes(p)) item.platform = p;
    }
    if (body?.url !== undefined) item.url = cleanText(body.url);
    if (body?.handle !== undefined) item.handle = normalizeHandle(body.handle, item.platform, item.url);
    if (body?.contact_email !== undefined) item.contact_email = cleanText(body.contact_email).toLowerCase();
    if (body?.niche !== undefined) item.niche = cleanText(body.niche);
    brand = item;
  });

  if (!brand) return adminErr(request, ["Brand not found"], 404);
  return adminOk(request, state, { brand });
}

export async function deleteBrand(request: Request, store: Store, brandId: number) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  const current = await store.get();
  const auditCount = brandAuditCount(current, brandId);
  if (auditCount > 0) {
    return adminErr(
      request,
      [`Cannot delete brand with ${auditCount} linked audit(s). Delete audits first.`],
      409,
    );
  }

  const appCount = brandApplicationCount(current, brandId);
  if (appCount > 0) {
    return adminErr(
      request,
      [`Cannot delete brand with ${appCount} linked application(s). Delete applications first.`],
      409,
    );
  }

  const state = await store.mutate((db) => {
    const index = db.brands.findIndex((b) => b.id === brandId);
    if (index >= 0) db.brands.splice(index, 1);
  });

  const stillExists = state.brands.some((b) => b.id === brandId);
  if (stillExists) return adminErr(request, ["Brand not found"], 404);
  return adminOk(request, state, { brand_id: brandId });
}
