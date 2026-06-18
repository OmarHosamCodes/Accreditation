import { motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { springSmooth } from "@/components/home/motion-config";

const COOLDOWN_MS = 30 * 86_400_000;

function cooldownState(publishedAt: number, now: number) {
  const elapsed = Math.max(0, now - publishedAt);
  const remaining = Math.max(0, COOLDOWN_MS - elapsed);
  const progress = Math.min(1, elapsed / COOLDOWN_MS);
  const daysLeft = Math.ceil(remaining / 86_400_000);
  const daysElapsed = Math.floor(elapsed / 86_400_000);
  const eligible = remaining === 0;
  return { elapsed, remaining, progress, daysLeft, daysElapsed, eligible };
}

export function CooldownRing({
  publishedAt,
  brandName,
  className,
}: {
  publishedAt: number;
  brandName: string;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const { progress, daysLeft, daysElapsed, eligible } = cooldownState(publishedAt, now);
  const size = 112;
  const stroke = 6;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - progress);

  return (
    <div
      className={cn(
        "bg-card border-border flex items-center gap-5 rounded-lg border p-4",
        className,
      )}
      role="status"
      aria-live="polite"
      aria-label={
        eligible
          ? `Re-audit open for ${brandName}`
          : `${daysLeft} day${daysLeft === 1 ? "" : "s"} until re-audit opens for ${brandName}`
      }
    >
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="-rotate-90"
          aria-hidden="true"
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={stroke}
            className="text-secondary"
          />
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={stroke}
            strokeLinecap="round"
            className={eligible ? "text-chart-2" : "text-primary"}
            strokeDasharray={circumference}
            initial={false}
            animate={{ strokeDashoffset: dashOffset }}
            transition={reduceMotion ? { duration: 0 } : springSmooth}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          {eligible ? (
            <>
              <span className="text-chart-2 text-lg font-semibold leading-none">Open</span>
              <span className="text-muted-foreground mt-0.5 text-[10px] uppercase tracking-wide">re-audit</span>
            </>
          ) : (
            <>
              <span className="font-mono text-2xl font-semibold tabular-nums leading-none">{daysLeft}</span>
              <span className="text-muted-foreground mt-0.5 text-[10px] uppercase tracking-wide">
                day{daysLeft === 1 ? "" : "s"} left
              </span>
            </>
          )}
        </div>
      </div>
      <div className="min-w-0 space-y-1">
        <p className="text-sm font-medium">
          {eligible ? "Cooldown complete" : "30-day cooldown"}
        </p>
        <p className="text-muted-foreground text-sm leading-relaxed">
          {eligible
            ? `You can request a fresh audit for ${brandName}.`
            : `Published ${daysElapsed} day${daysElapsed === 1 ? "" : "s"} ago. Re-audits open after 30 days.`}
        </p>
      </div>
    </div>
  );
}
