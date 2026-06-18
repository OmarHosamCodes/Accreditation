import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

export function AdminPageHeader({
  title,
  description,
  meta,
  actions,
}: {
  title: string;
  description?: string;
  meta?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-xl font-semibold tracking-tight text-balance sm:text-2xl">{title}</h1>
        {description && <p className="text-muted-foreground mt-1 text-sm">{description}</p>}
        {meta && <div className="text-muted-foreground mt-2 text-sm">{meta}</div>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function AdminStatCard({
  label,
  value,
  hint,
  to,
}: {
  label: string;
  value: string | number;
  hint?: string;
  to?: string;
}) {
  const inner = (
    <>
      <p className="text-muted-foreground text-xs font-medium">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
      {hint && <p className="text-muted-foreground mt-1 text-xs">{hint}</p>}
    </>
  );

  if (to) {
    return (
      <Link
        to={to}
        className="bg-card block rounded-lg border p-4 outline-none transition-colors hover:bg-accent/30 focus-visible:ring-[3px] focus-visible:ring-ring/50"
      >
        {inner}
      </Link>
    );
  }

  return <div className="bg-card rounded-lg border p-4">{inner}</div>;
}

export function AdminSection({ title, children, className }: { title?: string; children: ReactNode; className?: string }) {
  return (
    <section className={cn("mb-8", className)}>
      {title && <h2 className="text-muted-foreground mb-3 text-xs font-medium tracking-wide uppercase">{title}</h2>}
      {children}
    </section>
  );
}
