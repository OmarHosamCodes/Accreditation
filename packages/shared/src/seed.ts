import type { AppState } from "./types.ts";

export const SEED_CATEGORIES = [
  { key: "foundation", name: "Brand Foundation", weight: 20, sort: 1 },
  { key: "exposure", name: "Exposure", weight: 20, sort: 2 },
  { key: "influence", name: "Influence", weight: 30, sort: 3 },
  { key: "conversion", name: "Conversion", weight: 30, sort: 4 },
] as const;

export const SEED_DIMS = [
  ["foundation", "Positioning", "Is the brand's reason-to-exist instantly legible?"],
  ["foundation", "Identity Coherence", "Visual + verbal identity consistent across the feed."],
  ["foundation", "Strategic Real Estate", "Bio, link, highlights, pinned content used deliberately."],
  ["exposure", "Hook-to-Value Ratio", "Do openers earn the scroll-stop and pay it off?"],
  ["exposure", "PaC Consistency", "Steady cadence without dead zones or spam bursts."],
  ["exposure", "Overall Brand Exposure", "Reach footprint relative to niche."],
  ["exposure", "Frequency", "Posting volume sufficient to stay top-of-mind."],
  ["influence", "Value Density", "Useful substance per unit of attention spent."],
  ["influence", "Parasocial Depth", "Strength of the audience's felt relationship."],
  ["influence", "Comment-to-Reaction Rate", "Conversation vs. passive likes."],
  ["influence", "Engagement Rate", "Interactions relative to reach."],
  ["conversion", "Clear Selling Proposition", "Is what they sell obvious?"],
  ["conversion", "Clear Objection Handling", "Are doubts pre-empted in content?"],
  ["conversion", "Clear Offer", "Is there a defined, compelling next step?"],
  ["conversion", "Response Time", "Speed of reply to DMs/comments."],
  ["conversion", "Response Quality", "Helpfulness and tone of replies."],
] as const;

export const SEED_ANCHORS: Record<string, [string, string, string]> = {
  Positioning: ["Generic; could be any brand in the niche.", "Recognisable angle but inconsistently expressed.", "Owns a sharp, defensible position you remember."],
  "Identity Coherence": ["Visuals/voice clash post to post.", "Mostly consistent with occasional drift.", "Unmistakable system; you'd ID it with the logo cropped."],
  "Strategic Real Estate": ["Bio/link/pins empty or wasted.", "Some assets used, others neglected.", "Every fixed asset earns its place and converts."],
  "Hook-to-Value Ratio": ["Hooks absent or clickbait with no payoff.", "Decent hooks, uneven payoff.", "Hooks stop the scroll and the value lands every time."],
  "PaC Consistency": ["Erratic - famine then flood.", "Roughly regular with gaps.", "Metronomic, reliable rhythm."],
  "Overall Brand Exposure": ["Near-invisible for the niche.", "Moderate, niche-typical reach.", "Category-leading footprint."],
  Frequency: ["Too sparse to build memory.", "Adequate but could compound faster.", "Optimal volume for the format & audience."],
  "Value Density": ["Filler; little to take away.", "Useful but padded.", "Every post is a keeper - high signal."],
  "Parasocial Depth": ["Audience feels nothing personal.", "Some warmth and recognition.", "Audience feels they truly know the brand/person."],
  "Comment-to-Reaction Rate": ["Likes only; no conversation.", "Some discussion threads.", "Comments rival or exceed reactions - real dialogue."],
  "Engagement Rate": ["Far below niche benchmark.", "Around niche benchmark.", "Top-decile engagement for the niche."],
  "Clear Selling Proposition": ["Unclear what they even sell.", "Sellable but you must dig.", "Crystal clear what they offer and why it wins."],
  "Clear Objection Handling": ["Doubts never addressed.", "Some objections touched.", "Objections pre-empted and dismantled in content."],
  "Clear Offer": ["No next step anywhere.", "Offer exists but buried.", "Compelling, obvious, low-friction next step."],
  "Response Time": ["Days, or no reply.", "Within ~24h.", "Near-instant, within the hour."],
  "Response Quality": ["Curt, templated, unhelpful.", "Helpful but generic.", "Personal, on-brand, genuinely useful replies."],
};

export function freshDB(): AppState {
  const categories = SEED_CATEGORIES.map((category, index) => ({ id: index + 1, ...category }));
  const dimensions = SEED_DIMS.map((dimension, index) => ({
    id: index + 1,
    category_key: dimension[0],
    name: dimension[1],
    description: dimension[2],
    sort: index + 1,
  }));
  const anchors: AppState["rubric_anchors"][string] = {};

  for (const dimension of dimensions) {
    const seed = SEED_ANCHORS[dimension.name] || ["", "", ""];
    anchors[String(dimension.id)] = {
      anchor_1: seed[0],
      anchor_5: seed[1],
      anchor_10: seed[2],
    };
  }

  const db: AppState = {
    categories,
    dimensions,
    rubric_versions: [{ id: 1, created_at: Date.now(), notes: "Initial rubric v1" }],
    rubric_anchors: { "1": anchors },
    weights_versions: [{ id: 1, weights: Object.fromEntries(categories.map((category) => [category.key, category.weight])) }],
    brands: [],
    applications: [],
    audits: [],
    audit_scores: {},
    evidence_pins: [],
    users: [{ name: "Roaster", role: "admin", email: "roaster@accreditation.io" }],
    nextId: 1,
  };

  return db;
}

export function normalizeState(state: AppState): AppState {
  state.evidence_pins ||= [];
  state.audit_scores ||= {};
  state.users ||= [{ name: "Roaster", role: "admin", email: "roaster@accreditation.io" }];
  return state;
}
