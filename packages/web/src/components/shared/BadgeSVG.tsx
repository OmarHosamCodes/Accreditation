import type { Audit, Brand, Tier } from "@accreditation/shared";

export function BadgeSVG({ audit, brand, tier, width = 200 }: { audit: Audit; brand: Brand; tier: Tier; width?: number }) {
  const height = Math.round(width * 0.42);
  const dash = Math.round((audit.overall_score / 100) * 170);
  return (
    <svg width={width} height={height} viewBox="0 0 220 92" xmlns="http://www.w3.org/2000/svg" role="img" aria-label={`The Accreditation badge: ${brand.name}`}>
      <rect x="1" y="1" width="218" height="90" rx="16" fill="#0a0b0d" stroke="#26282e" strokeWidth="1.5" />
      <circle cx="47" cy="46" r="27" fill="none" stroke={tier.col} strokeWidth="2.5" opacity="0.35" />
      <circle
        cx="47"
        cy="46"
        r="27"
        fill="none"
        stroke={tier.col}
        strokeWidth="2.5"
        strokeDasharray={`${dash} 999`}
        strokeLinecap="round"
        transform="rotate(-90 47 46)"
      />
      <text x="47" y="49" textAnchor="middle" fontFamily="system-ui,sans-serif" fontWeight="600" fontSize="23" fill="#f2f3f5">
        {audit.overall_score}
      </text>
      <text x="86" y="33" fontFamily="monospace" fontSize="7.5" letterSpacing="1.5" fill="#6b6f7a">
        THE ACCREDITATION
      </text>
      <text x="86" y="53" fontFamily="system-ui,sans-serif" fontWeight="600" fontSize="17" letterSpacing="-0.5" fill={tier.col}>
        {tier.name}
      </text>
      <text x="86" y="69" fontFamily="system-ui,sans-serif" fontSize="9" fill="#a4a8b2">
        {brand.name.slice(0, 24)} · #{audit.id}
      </text>
    </svg>
  );
}
