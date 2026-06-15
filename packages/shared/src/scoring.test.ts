import { describe, expect, test } from "bun:test";
import { computeOverall, freshDB, normalizeState, tierFor } from "./index.ts";

describe("tierFor", () => {
  test("returns Platinum for score 90+", () => {
    expect(tierFor(95).key).toBe("plat");
  });

  test("returns Needs Roasting for low scores", () => {
    expect(tierFor(30).key).toBe("roast");
  });
});

describe("computeOverall", () => {
  test("returns 100 when all dimensions score 10", () => {
    const db = freshDB();
    const scores = db.dimensions.map((d) => ({ dim_id: d.id, score: 10 }));
    expect(computeOverall(scores, db, 1)).toBe(100);
  });
});

describe("freshDB", () => {
  test("seeds 16 dimensions and 4 categories", () => {
    const db = freshDB();
    expect(db.categories).toHaveLength(4);
    expect(db.dimensions).toHaveLength(16);
  });

  test("normalizeState fills missing arrays", () => {
    const db = freshDB();
    delete (db as Partial<typeof db>).evidence_pins;
    normalizeState(db);
    expect(Array.isArray(db.evidence_pins)).toBe(true);
  });
});
