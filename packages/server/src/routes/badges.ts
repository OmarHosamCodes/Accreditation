import { tierFor } from "@accreditation/shared";
import type { Store } from "../store/types.ts";

function escapeXml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] || char);
}

export async function badgeSvg(store: Store, auditId: number) {
  const db = await store.get();
  const audit = db.audits.find((item) => item.id === auditId && item.status === "published");
  const brand = audit ? db.brands.find((item) => item.id === audit.brand_id) : null;
  if (!audit || !brand) return new Response("Not found", { status: 404 });

  const tier = tierFor(audit.overall_score);
  const safeBrand = escapeXml(brand.name).slice(0, 24);
  const svg = `<svg width="220" height="92" viewBox="0 0 220 92" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="The Accreditation badge">
  <rect x="1" y="1" width="218" height="90" rx="16" fill="#0a0b0d" stroke="#26282e" stroke-width="1.5"/>
  <circle cx="47" cy="46" r="27" fill="none" stroke="${tier.col}" stroke-width="2.5" opacity="0.35"/>
  <circle cx="47" cy="46" r="27" fill="none" stroke="${tier.col}" stroke-width="2.5" stroke-dasharray="${Math.round(audit.overall_score / 100 * 170)} 999" stroke-linecap="round" transform="rotate(-90 47 46)"/>
  <text x="47" y="49" text-anchor="middle" font-family="Geist,system-ui,sans-serif" font-weight="600" font-size="23" fill="#f2f3f5">${audit.overall_score}</text>
  <text x="86" y="33" font-family="Geist Mono,monospace" font-size="7.5" letter-spacing="1.5" fill="#6b6f7a">THE ACCREDITATION</text>
  <text x="86" y="53" font-family="Geist,system-ui,sans-serif" font-weight="600" font-size="17" letter-spacing="-0.5" fill="${tier.col}">${escapeXml(tier.name)}</text>
  <text x="86" y="69" font-family="Geist,system-ui,sans-serif" font-size="9" fill="#a4a8b2">${safeBrand} · #${audit.id}</text>
</svg>`;

  return new Response(svg, {
    headers: {
      "content-type": "image/svg+xml; charset=utf-8",
      "cache-control": "public, max-age=300",
    },
  });
}
