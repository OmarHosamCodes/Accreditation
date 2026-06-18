import { describe, expect, test } from "bun:test";
import { freshDB } from "@accreditation/shared";
import {
  brandAuditCount,
  createBrandInDb,
  createDraftAudit,
  deleteAuditCascade,
  publishAudit,
  upsertAuditScore,
} from "../services/admin-mutations.ts";

describe("admin-mutations", () => {
  test("createBrandInDb assigns id and pushes to brands", () => {
    const db = freshDB();
    const brand = createBrandInDb(db, {
      name: "Test Brand",
      platform: "ig",
      url: "https://instagram.com/testbrand",
      contact_email: "test@example.com",
      niche: "Coffee",
    });
    expect(brand.id).toBeGreaterThan(0);
    expect(db.brands).toHaveLength(1);
    expect(db.brands[0]!.name).toBe("Test Brand");
  });

  test("createDraftAudit and upsertAuditScore update overall", () => {
    const db = freshDB();
    const brand = createBrandInDb(db, {
      name: "Test",
      platform: "ig",
      url: "https://instagram.com/test",
      contact_email: "a@b.com",
      niche: "Food",
    });
    const audit = createDraftAudit(db, brand.id, "Auditor");
    expect(audit).not.toBeNull();
    const dimId = db.dimensions[0]!.id;
    const saved = upsertAuditScore(db, audit!.id, dimId, 8, "Good");
    expect(saved?.score).toBe(8);
    expect(db.audits[0]!.overall_score).toBeGreaterThan(0);
  });

  test("publishAudit marks application completed", () => {
    const db = freshDB();
    const brand = createBrandInDb(db, {
      name: "Test",
      platform: "ig",
      url: "https://instagram.com/test",
      contact_email: "a@b.com",
      niche: "Food",
    });
    db.applications.push({
      id: db.nextId++,
      brand_id: brand.id,
      type: "new",
      status: "in_progress",
      changes_note: "",
      created_at: Date.now(),
    });
    const audit = createDraftAudit(db, brand.id, "Auditor")!;
    db.audit_scores[String(audit.id)] = db.dimensions.map((d) => ({
      dim_id: d.id,
      score: 7,
      note: "",
    }));
    const appId = db.applications[0]!.id;
    const { audit: published, errors } = publishAudit(db, audit.id, "Summary", appId);
    expect(errors).toHaveLength(0);
    expect(published?.status).toBe("published");
    expect(db.applications[0]!.status).toBe("completed");
  });

  test("deleteAuditCascade removes scores and evidence", () => {
    const db = freshDB();
    const brand = createBrandInDb(db, {
      name: "Test",
      platform: "ig",
      url: "https://instagram.com/test",
      contact_email: "a@b.com",
      niche: "Food",
    });
    const audit = createDraftAudit(db, brand.id, "Auditor")!;
    db.evidence_pins.push({
      id: db.nextId++,
      audit_id: audit.id,
      dim_id: 1,
      author: "A",
      platform: "ig",
      page_url: "",
      selector: "",
      dom_path: "",
      x: 0,
      y: 0,
      viewport_width: 100,
      viewport_height: 100,
      element_text: "",
      note: "note",
      visibility: "private",
      status: "open",
      created_at: Date.now(),
      updated_at: Date.now(),
    });
    expect(brandAuditCount(db, brand.id)).toBe(1);
    deleteAuditCascade(db, audit.id);
    expect(db.audits).toHaveLength(0);
    expect(db.evidence_pins).toHaveLength(0);
    expect(db.audit_scores[String(audit.id)]).toBeUndefined();
  });
});

describe("extensionUserRole with AppState", () => {
  test("uses AppState.users role when present", async () => {
    const { extensionUserRole } = await import("../http/auth.ts");
    const db = freshDB();
    db.users = [{ name: "Jane", email: "jane@example.com", role: "admin" }];
    expect(extensionUserRole("jane@example.com", db)).toBe("admin");
    expect(extensionUserRole("other@example.com", db)).toBe("auditor");
  });
});
