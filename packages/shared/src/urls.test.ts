import { describe, expect, test } from "bun:test";
import { normalizePublicAuditUrl, publicAuditUrl } from "./urls.ts";

describe("publicAuditUrl", () => {
  test("builds path-based audit URLs", () => {
    expect(publicAuditUrl("http://localhost:3000", 42)).toBe("http://localhost:3000/audit/42");
    expect(publicAuditUrl("https://app.example.com/", 7)).toBe("https://app.example.com/audit/7");
  });
});

describe("normalizePublicAuditUrl", () => {
  test("rewrites legacy hash audit links", () => {
    expect(normalizePublicAuditUrl("http://localhost:3000/#audit/12", 0, "")).toBe("http://localhost:3000/audit/12");
  });

  test("falls back to api base when response omits url", () => {
    expect(normalizePublicAuditUrl("", 9, "http://localhost:3000")).toBe("http://localhost:3000/audit/9");
  });
});
