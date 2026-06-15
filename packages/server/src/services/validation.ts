import type { AppState, Platform } from "@accreditation/shared";

export function cleanText(value: unknown): string {
  return String(value || "").trim();
}

export function handleFrom(url: string): string {
  try {
    const parsed = new URL(url);
    const profile = parsed.pathname.replace(/\//g, "") || "profile";
    return parsed.hostname.includes("instagram") ? `@${profile}` : profile;
  } catch {
    return "profile";
  }
}

export function normalizeHandle(value: unknown, platform: Platform, url = ""): string {
  const raw = cleanText(value).replace(/^@/, "");
  if (raw) return platform === "ig" ? `@${raw}` : raw;
  return handleFrom(url);
}

export function validateState(state: AppState): string[] {
  const errors: string[] = [];
  if (!Array.isArray(state.categories)) errors.push("categories must be an array");
  if (!Array.isArray(state.dimensions)) errors.push("dimensions must be an array");
  if (!Array.isArray(state.brands)) errors.push("brands must be an array");
  if (!Array.isArray(state.applications)) errors.push("applications must be an array");
  if (!Array.isArray(state.audits)) errors.push("audits must be an array");
  if (!state.audit_scores || typeof state.audit_scores !== "object") errors.push("audit_scores must be an object");
  if (!Array.isArray(state.evidence_pins)) state.evidence_pins = [];
  if (!Number.isFinite(state.nextId)) errors.push("nextId must be a number");

  for (const application of state.applications || []) {
    if (!["pending", "in_progress", "completed", "rejected"].includes(application.status)) {
      errors.push(`invalid application status: ${application.status}`);
      break;
    }
  }

  for (const audit of state.audits || []) {
    if (!["draft", "published"].includes(audit.status)) {
      errors.push(`invalid audit status: ${audit.status}`);
      break;
    }
  }

  for (const scores of Object.values(state.audit_scores || {})) {
    for (const score of scores || []) {
      if (!Number.isInteger(score.score) || score.score < 1 || score.score > 10) {
        errors.push("audit scores must be integers from 1 to 10");
        return errors;
      }
    }
  }

  return errors;
}
