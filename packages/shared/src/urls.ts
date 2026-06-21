export const SOCIAL_PAGE_URL_RE =
  /^https?:\/\/(www\.|m\.)?(facebook|instagram)\.com\//i;

export function isSocialPageUrl(url: string): boolean {
  return SOCIAL_PAGE_URL_RE.test(url);
}

export function publicAuditUrl(origin: string, auditId: number): string {
  const base = origin.replace(/\/+$/, "");
  return `${base}/audit/${auditId}`;
}

export function normalizePublicAuditUrl(rawUrl: string, auditId: number, apiBase: string): string {
  if (rawUrl) {
    try {
      const url = new URL(rawUrl);
      const hashMatch = url.hash.match(/^#audit\/(\d+)$/);
      if (hashMatch) {
        return publicAuditUrl(url.origin, Number(hashMatch[1]));
      }
      return rawUrl;
    } catch {
      /* fall through */
    }
  }
  if (auditId > 0 && apiBase) {
    return publicAuditUrl(apiBase, auditId);
  }
  return "";
}
