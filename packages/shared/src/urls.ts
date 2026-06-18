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
