import { describe, expect, test } from "bun:test";
import { isAdminEmail } from "./auth.ts";

describe("isAdminEmail", () => {
  test("matches seeded admin email", () => {
    expect(isAdminEmail("roaster@accreditation.io")).toBe(true);
    expect(isAdminEmail("Roaster@accreditation.io")).toBe(true);
  });

  test("rejects other emails", () => {
    expect(isAdminEmail("auditor@accreditation.io")).toBe(false);
    expect(isAdminEmail(undefined)).toBe(false);
  });
});

describe("extensionUserRole", () => {
  test("assigns admin to seeded email", async () => {
    const { extensionUserRole } = await import("./auth.ts");
    expect(extensionUserRole("roaster@accreditation.io")).toBe("admin");
    expect(extensionUserRole("other@example.com")).toBe("auditor");
  });
});
