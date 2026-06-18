import type { EvidencePin } from "@accreditation/shared";
import { Plus, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AdminEmptyState } from "@/components/admin/AdminEmptyState";
import { AdminFormDrawer } from "@/components/admin/AdminFormDrawer";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAppData } from "@/contexts/AppDataContext";
import { useAdminMutation } from "@/hooks/useAdminMutation";
import * as adminApi from "@/lib/admin-api";

export function EvidencePage() {
  const { db } = useAppData();
  const { mutate, pending } = useAdminMutation();
  const [search, setSearch] = useState("");
  const [auditFilter, setAuditFilter] = useState<string>("all");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [form, setForm] = useState({
    audit_id: "",
    dim_id: "",
    platform: "ig",
    note: "",
    visibility: "private" as EvidencePin["visibility"],
  });

  const evidence = useMemo(() => {
    if (!db) return [];
    let list = db.evidence_pins;
    if (auditFilter !== "all") {
      list = list.filter((p) => p.audit_id === Number(auditFilter));
    }
    const q = search.toLowerCase();
    if (q) {
      list = list.filter((p) => p.note.toLowerCase().includes(q) || p.author.toLowerCase().includes(q));
    }
    return [...list].sort((a, b) => b.created_at - a.created_at);
  }, [db, search, auditFilter]);

  if (!db) return null;

  const draftAudits = db.audits.filter((a) => a.status === "draft");

  const createEvidence = async () => {
    const auditId = Number(form.audit_id);
    const res = await mutate(
      () =>
        adminApi.createEvidence(auditId, {
          dim_id: Number(form.dim_id),
          platform: form.platform as "ig" | "fb",
          note: form.note,
          visibility: form.visibility,
        }),
      { success: "Evidence created" },
    );
    if (res) {
      setDrawerOpen(false);
      setForm({ audit_id: "", dim_id: "", platform: "ig", note: "", visibility: "private" });
    }
  };

  const confirmDelete = async () => {
    if (deleteId === null) return;
    const res = await mutate(() => adminApi.deleteEvidence(deleteId), { success: "Evidence deleted" });
    if (res) setDeleteId(null);
  };

  return (
    <div>
      <AdminPageHeader
        title="Evidence"
        description="Evidence pins attached to audits."
        meta={`${evidence.length} pin(s)`}
        actions={
          <Button size="sm" onClick={() => setDrawerOpen(true)} disabled={!draftAudits.length}>
            <Plus className="size-4" />
            Add evidence
          </Button>
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <div className="relative max-w-sm flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input className="pl-9" placeholder="Search notes…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={auditFilter} onValueChange={setAuditFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filter by audit" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All audits</SelectItem>
            {db.audits.map((a) => {
              const brand = db.brands.find((b) => b.id === a.brand_id);
              return (
                <SelectItem key={a.id} value={String(a.id)}>
                  {brand?.name ?? `Audit ${a.id}`} ({a.status})
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      {evidence.length ? (
        <div className="bg-card rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead scope="col">Audit</TableHead>
                <TableHead scope="col">Dimension</TableHead>
                <TableHead scope="col">Note</TableHead>
                <TableHead scope="col">Author</TableHead>
                <TableHead scope="col">Visibility</TableHead>
                <TableHead scope="col" className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {evidence.map((pin) => {
                const audit = db.audits.find((a) => a.id === pin.audit_id);
                const brand = audit ? db.brands.find((b) => b.id === audit.brand_id) : null;
                const dim = db.dimensions.find((d) => d.id === pin.dim_id);
                return (
                  <TableRow key={pin.id}>
                    <TableCell>
                      <Link to={`/admin/audits/${pin.audit_id}`} className="hover:underline">
                        {brand?.name ?? pin.audit_id}
                      </Link>
                    </TableCell>
                    <TableCell>{dim?.name ?? pin.dim_id}</TableCell>
                    <TableCell className="max-w-xs truncate">{pin.note}</TableCell>
                    <TableCell>{pin.author}</TableCell>
                    <TableCell>{pin.visibility}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => setDeleteId(pin.id)}>
                        <Trash2 className="size-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      ) : (
        <AdminEmptyState title="No evidence pins">Evidence is created during audits via the extension or admin.</AdminEmptyState>
      )}

      <AdminFormDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        title="Add evidence"
        footer={
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setDrawerOpen(false)}>
              Cancel
            </Button>
            <Button className="flex-1" onClick={() => void createEvidence()} disabled={pending}>
              Save evidence
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Draft audit</Label>
            <Select value={form.audit_id} onValueChange={(v) => setForm({ ...form, audit_id: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Select audit" />
              </SelectTrigger>
              <SelectContent>
                {draftAudits.map((a) => {
                  const brand = db.brands.find((b) => b.id === a.brand_id);
                  return (
                    <SelectItem key={a.id} value={String(a.id)}>
                      {brand?.name ?? `Audit ${a.id}`}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Dimension</Label>
            <Select value={form.dim_id} onValueChange={(v) => setForm({ ...form, dim_id: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Select dimension" />
              </SelectTrigger>
              <SelectContent>
                {db.dimensions.map((d) => (
                  <SelectItem key={d.id} value={String(d.id)}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ev_note">Note</Label>
            <Textarea id="ev_note" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Visibility</Label>
            <Select
              value={form.visibility}
              onValueChange={(v) => setForm({ ...form, visibility: v as EvidencePin["visibility"] })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="private">Private</SelectItem>
                <SelectItem value="brand-visible">Brand visible</SelectItem>
                <SelectItem value="public">Public</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </AdminFormDrawer>

      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title="Delete evidence"
        description="This permanently removes the evidence pin."
        confirmLabel="Delete"
        destructive
        loading={pending}
        onConfirm={() => void confirmDelete()}
      />
    </div>
  );
}
