import { Badge } from "@/components/ui/badge";
import { PlatformBadge } from "@/components/shared/TierBadge";

const applicationLabels: Record<string, string> = {
  pending: "Pending",
  in_progress: "In progress",
  completed: "Completed",
  rejected: "Rejected",
};

const auditLabels: Record<string, string> = {
  draft: "Draft",
  published: "Published",
};

export function ApplicationStatusBadge({ status }: { status: string }) {
  const variant = status === "rejected" ? "destructive" : status === "completed" ? "secondary" : "outline";
  return <Badge variant={variant}>{applicationLabels[status] ?? status}</Badge>;
}

export function AuditStatusBadge({ status }: { status: string }) {
  return (
    <Badge variant={status === "published" ? "default" : "outline"}>
      {auditLabels[status] ?? status}
    </Badge>
  );
}

export { PlatformBadge };

export function RoleBadge({ role }: { role: string }) {
  return (
    <Badge variant={role === "admin" ? "default" : "secondary"} className="text-[10px] uppercase">
      {role}
    </Badge>
  );
}
