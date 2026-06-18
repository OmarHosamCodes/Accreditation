import { tierFor } from "@accreditation/shared";
import { ExternalLink, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AdminEmptyState } from "@/components/admin/AdminEmptyState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminTable, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/admin/AdminTable";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { AuditStatusBadge } from "@/components/admin/StatusBadge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAppData } from "@/contexts/AppDataContext";
import { useAdminMutation } from "@/hooks/useAdminMutation";
import * as adminApi from "@/lib/admin-api";
import { fmtDate } from "@/lib/state";

export function AuditsPage() {
  const { db } = useAppData();
  const { mutate, pending } = useAdminMutation();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialStatus = searchParams.get("status");
  const [status, setStatus] = useState<"all" | "draft" | "published">(
    initialStatus === "draft" || initialStatus === "published" ? initialStatus : "all",
  );
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const setStatusFilter = (next: "all" | "draft" | "published") => {
    setStatus(next);
    if (next === "all") searchParams.delete("status");
    else searchParams.set("status", next);
    setSearchParams(searchParams, { replace: true });
  };

  const audits = useMemo(() => {
    if (!db) return [];
    let list = [...db.audits].sort((a, b) => b.created_at - a.created_at);
    if (status !== "all") list = list.filter((a) => a.status === status);
    return list;
  }, [db, status]);

  if (!db) return null;

  const confirmDelete = async () => {
    if (deleteId === null) return;
    const res = await mutate(() => adminApi.deleteAudit(deleteId), { success: "Audit deleted" });
    if (res) setDeleteId(null);
  };

  return (
    <div>
      <AdminPageHeader
        title="Audits"
        description="Draft and published audit records."
        meta={`${audits.length} audit(s)`}
      />

      <Tabs className="mb-4">
        <TabsList>
          {(["all", "draft", "published"] as const).map((s) => (
            <TabsTrigger key={s} active={status === s} onClick={() => setStatusFilter(s)} className="capitalize">
              {s === "all" ? "All" : s}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent />
      </Tabs>

      {audits.length ? (
        <AdminTable>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead scope="col">Brand</TableHead>
                <TableHead scope="col">Status</TableHead>
                <TableHead scope="col">Score</TableHead>
                <TableHead scope="col">Tier</TableHead>
                <TableHead scope="col">Auditor</TableHead>
                <TableHead scope="col">Date</TableHead>
                <TableHead scope="col" className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {audits.map((audit) => {
                const brand = db.brands.find((b) => b.id === audit.brand_id);
                const tier = audit.status === "published" ? tierFor(audit.overall_score) : null;
                return (
                  <TableRow key={audit.id}>
                    <TableCell>
                      <Link to={`/admin/brands/${audit.brand_id}`} className="font-medium hover:underline">
                        {brand?.name ?? "Unknown"}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <AuditStatusBadge status={audit.status} />
                    </TableCell>
                    <TableCell>{audit.status === "published" ? audit.overall_score : "—"}</TableCell>
                    <TableCell>{tier?.name ?? "—"}</TableCell>
                    <TableCell>{audit.auditor}</TableCell>
                    <TableCell>{fmtDate(audit.created_at)}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" asChild>
                        <Link to={`/admin/audits/${audit.id}`}>Details</Link>
                      </Button>
                      {audit.status === "published" && (
                        <Button variant="ghost" size="sm" asChild>
                          <Link to={`/audit/${audit.id}`} target="_blank">
                            <ExternalLink className="size-4" />
                          </Link>
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" onClick={() => setDeleteId(audit.id)}>
                        <Trash2 className="size-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </AdminTable>
      ) : (
        <AdminEmptyState title="No audits">Start scoring from the queue or create a draft audit for a brand.</AdminEmptyState>
      )}

      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title="Delete audit"
        description="This permanently removes the audit, scores, and evidence pins."
        confirmLabel="Delete audit"
        destructive
        loading={pending}
        onConfirm={() => void confirmDelete()}
      />
    </div>
  );
}
