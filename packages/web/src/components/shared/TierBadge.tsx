import type { Tier } from "@accreditation/shared";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const tierStyles: Record<string, string> = {
  plat: "border-blue-400/40 bg-blue-500/10 text-blue-300",
  gld: "border-amber-400/40 bg-amber-500/10 text-amber-300",
  slv: "border-zinc-400/40 bg-zinc-500/10 text-zinc-300",
  brz: "border-orange-400/40 bg-orange-500/10 text-orange-300",
  roast: "border-red-400/40 bg-red-500/10 text-red-300",
};

export function TierBadge({ tier, className }: { tier: Tier; className?: string }) {
  return (
    <Badge variant="outline" className={cn(tierStyles[tier.cls], className)}>
      <span className="size-2 rounded-full" style={{ backgroundColor: tier.col }} />
      {tier.name}
    </Badge>
  );
}

export function PlatformBadge({ platform }: { platform: string }) {
  return (
    <Badge variant="secondary" className="font-mono text-[10px] uppercase">
      {platform}
    </Badge>
  );
}
