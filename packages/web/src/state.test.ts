import { describe, expect, test } from "bun:test";
import { esc, fmtDate } from "./state.ts";

describe("esc", () => {
  test("escapes HTML characters", () => {
    expect(esc(`Tom & Jerry's "show"`)).toBe("Tom &amp; Jerry&#39;s &quot;show&quot;");
  });
});

describe("fmtDate", () => {
  test("formats timestamps", () => {
    expect(fmtDate(Date.parse("2026-01-15"))).toMatch(/15/);
  });
});
