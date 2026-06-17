import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function EmptyState({ icon, children, className }: { icon?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={cn("text-muted-foreground flex flex-col items-center justify-center gap-3 py-12 text-center text-sm", className)}>
      {icon && <div className="opacity-50">{icon}</div>}
      {children}
    </div>
  );
}
