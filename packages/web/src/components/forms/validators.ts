export type FieldState = "idle" | "valid" | "invalid";

export function fieldState(value: string, touched: boolean, error: string | null): FieldState {
  if (error && (touched || value.length > 0)) return "invalid";
  if (!error && value.length > 0) return "valid";
  return "idle";
}

export function validateBrandName(name: string): string | null {
  if (name.length < 2 || name.length > 80) return "Brand name looks off (2–80 characters).";
  return null;
}

export function validateProfileUrl(url: string): string | null {
  if (!/^https?:\/\/(www\.)?(facebook|instagram)\.com\//i.test(url)) {
    return "Profile URL must be a facebook.com or instagram.com link.";
  }
  return null;
}

export function validateEmail(email: string): string | null {
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return "Enter a valid email.";
  return null;
}

export function validateNiche(niche: string): string | null {
  if (niche.length < 2) return "Tell us your niche.";
  return null;
}

export function validateWhy(why: string): string | null {
  if (why.length < 10) return "Give us a sentence on why you want it.";
  return null;
}

export function validateChangesNote(note: string): string | null {
  if (note.trim().length < 15) return "Tell us what changed (a real sentence).";
  return null;
}

export function validateReauditEmail(email: string, expected: string): string | null {
  if (email.trim().toLowerCase() !== expected.toLowerCase()) {
    return "Email must match the one on the original audit.";
  }
  return null;
}
