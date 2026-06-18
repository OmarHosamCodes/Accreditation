import type { ReactNode } from "react";
import { EmptyState } from "@/components/shared/EmptyState";

export function AdminEmptyState({
  icon,
  title,
  children,
  action,
}: {
  icon?: ReactNode;
  title?: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="bg-card rounded-lg border p-8">
      <EmptyState icon={icon}>
        {title && <p className="mb-1 font-medium">{title}</p>}
        <p className="text-muted-foreground text-sm">{children}</p>
        {action && <div className="mt-4">{action}</div>}
      </EmptyState>
    </div>
  );
}
