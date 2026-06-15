import type { Tier } from "./types.ts";

export const TIERS: Tier[] = [
  { key: "plat", name: "Platinum", min: 90, col: "#3a7bd5", cls: "plat", dcls: "platd" },
  { key: "gld", name: "Gold", min: 80, col: "#c79a3b", cls: "gld", dcls: "gldd" },
  { key: "slv", name: "Silver", min: 70, col: "#8b8b8b", cls: "slv", dcls: "slvd" },
  { key: "brz", name: "Bronze", min: 60, col: "#a8662d", cls: "brz", dcls: "brzd" },
  { key: "roast", name: "Needs Roasting", min: 0, col: "#e8482b", cls: "roast", dcls: "roastd" },
];

export function tierFor(score: number): Tier {
  return TIERS.find((tier) => score >= tier.min) ?? TIERS[TIERS.length - 1]!;
}
