import type { ReactNode } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

export function AdminTable({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("bg-card overflow-hidden rounded-lg border", className)}>{children}</div>;
}

export { Table, TableBody, TableCell, TableHead, TableHeader, TableRow };
