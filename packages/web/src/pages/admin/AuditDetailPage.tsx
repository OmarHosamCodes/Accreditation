import { tierFor } from "@accreditation/shared";
import { ExternalLink, Rocket, Trash2 } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AdminBreadcrumbs } from "@/components/admin/AdminShell";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { AuditStatusBadge } from "@/components/admin/StatusBadge";
import { TierBadge } from "@/components/shared/TierBadge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAppData } from "@/contexts/AppDataContext";
import { useAdminMutation } from "@/hooks/useAdminMutation";
import * as adminApi from "@/lib/admin-api";

export function AuditDetailPage() {
  const { id } = useParams();
  const auditId = Number(id);
  const { db } = useAppData();
  const { mutate, pending } = useAdminMutation();
  const navigate = useNavigate();
  const [summary, setSummary] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);

  if (!db) return null;
  const audit = db.audits.find((a) => a.id === auditId);
  if (!audit) {
    return (
      <div>
        <p className="text-muted-foreground">Audit not found.</p>
        <Button variant="link" asChild className="mt-2 px-0">
          <Link to="/admin/audits">Back to audits</Link>
        </Button>
      </div>
    );
  }

  const brand = db.brands.find((b) => b.id === audit.brand_id);
  const scores = db.audit_scores[String(auditId)] || [];
  const evidence = db.evidence_pins.filter((p) => p.audit_id === auditId);
  const tier = audit.status === "published" ? tierFor(audit.overall_score) : null;
  const currentSummary = summary || audit.summary;

  const handlePublish = async () => {
    await mutate(() => adminApi.publishAudit(auditId, currentSummary), { success: "Audit published" });
  };

  const handleUnpublish = async () => {
    await mutate(() => adminApi.unpublishAudit(auditId), { success: "Audit reverted to draft" });
  };

  const handleDelete = async () => {
    const res = await mutate(() => adminApi.deleteAudit(auditId), { success: "Audit deleted" });
    if (res) navigate("/admin/audits");
  };

  return (
    <div>
      <AdminBreadcrumbs
        items={[
          { label: "Audits", to: "/admin/audits" },
          { label: brand?.name ?? `Audit #${auditId}` },
        ]}
      />

      <AdminPageHeader
        title={brand?.name ?? `Audit #${auditId}`}
        description={`Auditor: ${audit.auditor}`}
        actions={
          <>
            {audit.status === "published" && (
              <Button variant="outline" size="sm" asChild>
                <Link to={`/audit/${auditId}`} target="_blank">
                  <ExternalLink className="size-4" />
                  Public page
                </Link>
              </Button>
            )}
            <Button variant="destructive" size="sm" onClick={() => setDeleteOpen(true)}>
              <Trash2 className="size-4" />
              Delete
            </Button>
          </>
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <AuditStatusBadge status={audit.status} />
        {tier && (
          <>
            <span className="text-2xl font-bold tabular-nums" style={{ color: tier.col }}>
              {audit.overall_score}
            </span>
            <TierBadge tier={tier} />
          </>
        )}
      </div>

      {audit.status === "draft" && (
        <div className="bg-card mb-6 space-y-3 rounded-lg border p-4">
          <label className="text-sm font-medium" htmlFor="audit_summary">
            Summary (required to publish)
          </label>
          <Textarea
            id="audit_summary"
            value={currentSummary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="One-paragraph verdict for the public audit page…"
            className="min-h-24"
          />
          <div className="flex gap-2">
            <Button onClick={() => void handlePublish()} disabled={pending}>
              <Rocket className="size-4" />
              Publish audit
            </Button>
            <Button variant="outline" asChild>
              <Link to="/admin/editor">Open in editor</Link>
            </Button>
          </div>
        </div>
      )}

      {audit.status === "published" && (
        <div className="mb-6">
          <Button variant="outline" size="sm" onClick={() => void handleUnpublish()} disabled={pending}>
            Revert to draft
          </Button>
        </div>
      )}

      <h2 className="text-muted-foreground mb-3 text-xs font-medium tracking-wide uppercase">Dimension scores</h2>
      <div className="bg-card mb-8 rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead scope="col">Dimension</TableHead>
              <TableHead scope="col">Score</TableHead>
              <TableHead scope="col">Note</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {db.dimensions.map((dim) => {
              const sc = scores.find((s) => s.dim_id === dim.id);
              return (
                <TableRow key={dim.id}>
                  <TableCell>{dim.name}</TableCell>
                  <TableCell className="font-mono">{sc?.score ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground max-w-md truncate text-sm">{sc?.note || "—"}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <AdminPageHeader title="Evidence" meta={`${evidence.length} pin(s)`} />
      {evidence.length ? (
        <div className="bg-card rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead scope="col">Dimension</TableHead>
                <TableHead scope="col">Note</TableHead>
                <TableHead scope="col">Visibility</TableHead>
                <TableHead scope="col">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {evidence.map((pin) => {
                const dim = db.dimensions.find((d) => d.id === pin.dim_id);
                return (
                  <TableRow key={pin.id}>
                    <TableCell>{dim?.name ?? pin.dim_id}</TableCell>
                    <TableCell className="max-w-sm truncate">{pin.note}</TableCell>
                    <TableCell>{pin.visibility}</TableCell>
                    <TableCell>{pin.status}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      ) : (
        <p className="text-muted-foreground text-sm">No evidence pins for this audit.</p>
      )}

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete audit"
        description="This permanently removes the audit, scores, and evidence."
        confirmLabel="Delete audit"
        destructive
        loading={pending}
        onConfirm={() => void handleDelete()}
      />
    </div>
  );
}
