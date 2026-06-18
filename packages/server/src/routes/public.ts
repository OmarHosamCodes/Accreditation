import type { Platform } from "@accreditation/shared";
import { rateLimitByEmail } from "../http/auth.ts";
import { jsonPublic, parseJson } from "../http/responses.ts";
import type { Store } from "../store/types.ts";
import { cleanText, handleFrom } from "../services/validation.ts";

export async function getState(store: Store) {
  return jsonPublic(await store.get());
}

export async function createApplication(request: Request, store: Store) {
  const body = await parseJson(request);
  const brandName = cleanText(body?.brandName);
  const platform = cleanText(body?.platform) as Platform;
  const url = cleanText(body?.url);
  const email = cleanText(body?.email).toLowerCase();
  const niche = cleanText(body?.niche);
  const why = cleanText(body?.why);
  const honeypot = cleanText(body?.honeypot);
  const errors: string[] = [];

  if (honeypot) return jsonPublic({ ok: true });
  if (brandName.length < 2 || brandName.length > 80) errors.push("Brand name looks off.");
  if (!["ig", "fb"].includes(platform)) errors.push("Choose Instagram or Facebook.");
  if (!/^https?:\/\/(www\.)?(facebook|instagram)\.com\//i.test(url)) errors.push("Profile URL must be a facebook.com or instagram.com link.");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) errors.push("Enter a valid email.");
  if (niche.length < 2) errors.push("Tell us your niche.");
  if (why.length < 10) errors.push("Give us a sentence on why you want it.");

  const lastSubmission = rateLimitByEmail.get(email);
  if (lastSubmission && Date.now() - lastSubmission < 60000) {
    errors.push("Slow down - you just applied. Try again shortly.");
  }

  if (errors.length) return jsonPublic({ ok: false, errors }, { status: 400 });

  const state = await store.mutate((db) => {
    const brandId = db.nextId++;
    db.brands.push({
      id: brandId,
      name: brandName,
      platform,
      handle: handleFrom(url),
      url,
      contact_email: email,
      niche,
      created_at: Date.now(),
    });
    db.applications.push({
      id: db.nextId++,
      brand_id: brandId,
      type: "new",
      status: "pending",
      changes_note: "",
      why,
      created_at: Date.now(),
    });
  });

  rateLimitByEmail.set(email, Date.now());
  return jsonPublic({ ok: true, state });
}

export async function createReaudit(request: Request, store: Store) {
  const body = await parseJson(request);
  const auditId = Number(body?.auditId);
  const email = cleanText(body?.email).toLowerCase();
  const changesNote = cleanText(body?.changesNote);
  const errors: string[] = [];
  const current = await store.get();
  const audit = current.audits.find((item) => item.id === auditId && item.status === "published");
  const brand = audit ? current.brands.find((item) => item.id === audit.brand_id) : null;

  if (!audit || !brand) errors.push("Can't request a re-audit for that.");
  if (audit?.published_at && (Date.now() - audit.published_at) / 86400000 < 30) errors.push("Too soon - 30-day cooldown.");
  if (brand && email !== brand.contact_email.toLowerCase()) errors.push("Email must match the one on the original audit.");
  if (changesNote.length < 15) errors.push("Tell us what changed (a real sentence).");

  if (errors.length) return jsonPublic({ ok: false, errors }, { status: 400 });

  const state = await store.mutate((db) => {
    db.applications.push({
      id: db.nextId++,
      brand_id: brand!.id,
      type: "reaudit",
      status: "pending",
      prior_audit_id: auditId,
      changes_note: changesNote,
      created_at: Date.now(),
    });
  });

  return jsonPublic({ ok: true, state });
}
