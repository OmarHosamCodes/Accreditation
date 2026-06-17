import { cn } from "@/lib/utils";

export function ScoreBar({ score, max = 10, className }: { score: number; max?: number; className?: string }) {
  const pct = Math.min(100, Math.max(0, (score / max) * 100));
  return (
    <div className={cn("bg-muted h-2 w-full overflow-hidden rounded-full", className)}>
      <div className="bg-primary h-full rounded-full transition-all" style={{ width: `${pct}%` }} />
    </div>
  );
}
