import { describe, expect, test } from "bun:test";
import { config } from "../config.ts";
import { isAuthed } from "./auth.ts";

describe("isAuthed", () => {
  test("accepts valid basic auth", () => {
    const token = btoa(`${config.adminUsername}:${config.adminPassword}`);
    const request = new Request("http://localhost/api/admin/login", {
      headers: { authorization: `Basic ${token}` },
    });
    expect(isAuthed(request)).toBe(true);
  });

  test("rejects missing auth", () => {
    const request = new Request("http://localhost/api/admin/login");
    expect(isAuthed(request)).toBe(false);
  });
});
