import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AdminEmptyState } from "@/components/admin/AdminEmptyState";
import { AdminFormDrawer } from "@/components/admin/AdminFormDrawer";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminTable, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/admin/AdminTable";
import { ApplicationStatusBadge, PlatformBadge } from "@/components/admin/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAdminEditor } from "@/contexts/AdminEditorContext";
import { useAppData } from "@/contexts/AppDataContext";
import { useAdminMutation } from "@/hooks/useAdminMutation";
import * as adminApi from "@/lib/admin-api";
import { fmtDate } from "@/lib/state";
import { ClipboardList, Settings2 } from "lucide-react";

type StatusFilter = "all" | "pending" | "in_progress" | "completed" | "rejected";

export function QueuePage() {
  const { db } = useAppData();
  const { mutate, pending } = useAdminMutation();
  const { startAudit } = useAdminEditor();
  const navigate = useNavigate();
  const [status, setStatus] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");
  const [rejectId, setRejectId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const applications = useMemo(() => {
    if (!db) return [];
    let list = [...db.applications].sort((a, b) => b.created_at - a.created_at);
    if (status !== "all") list = list.filter((a) => a.status === status);
    const q = search.toLowerCase();
    if (q) {
      list = list.filter((ap) => {
        const brand = db.brands.find((b) => b.id === ap.brand_id);
        return brand?.name.toLowerCase().includes(q) || brand?.handle.toLowerCase().includes(q);
      });
    }
    return list;
  }, [db, status, search]);

  if (!db) return null;

  const pendingCount = db.applications.filter((a) => a.status === "pending" || a.status === "in_progress").length;

  const claimAndScore = async (appId: number) => {
    const ap = db.applications.find((a) => a.id === appId);
    if (!ap) return;
    const res = await mutate(() => adminApi.claimApplication(appId));
    if (res) {
      startAudit(ap.brand_id, appId);
      navigate("/admin/editor");
    }
  };

  const rejectApp = async () => {
    if (rejectId === null) return;
    const res = await mutate(
      () => adminApi.rejectApplication(rejectId, rejectReason),
      { success: "Application rejected" },
    );
    if (res) {
      setRejectId(null);
      setRejectReason("");
    }
  };

  return (
    <div>
      <AdminPageHeader
        title="Queue"
        description="Review and action incoming audit applications."
        meta={`${pendingCount} awaiting action · ${db.applications.length} total`}
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs>
          <TabsList className="flex-wrap">
            {(["all", "pending", "in_progress", "completed", "rejected"] as const).map((s) => (
              <TabsTrigger key={s} active={status === s} onClick={() => setStatus(s)} className="capitalize">
                {s === "all" ? "All" : s.replace("_", " ")}
              </TabsTrigger>
            ))}
          </TabsList>
          <TabsContent />
        </Tabs>
        <Input
          className="max-w-xs"
          placeholder="Search by brand…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {applications.length ? (
        <AdminTable>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead scope="col">Brand</TableHead>
                <TableHead scope="col">Type</TableHead>
                <TableHead scope="col">Status</TableHead>
                <TableHead scope="col">Submitted</TableHead>
                <TableHead scope="col" className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {applications.map((ap) => {
                const brand = db.brands.find((b) => b.id === ap.brand_id)!;
                return (
                  <TableRow key={ap.id}>
                    <TableCell>
                      <Link to={`/admin/brands/${brand.id}`} className="font-medium hover:underline">
                        {brand.name}
                      </Link>
                      <div className="text-muted-foreground mt-0.5 flex items-center gap-1 text-xs">
                        {brand.niche} · <PlatformBadge platform={brand.platform} /> · {brand.handle}
                      </div>
                      {ap.why && <p className="text-muted-foreground mt-1 max-w-md text-xs italic">&ldquo;{ap.why}&rdquo;</p>}
                    </TableCell>
                    <TableCell className="capitalize">{ap.type}</TableCell>
                    <TableCell>
                      <ApplicationStatusBadge status={ap.status} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">{fmtDate(ap.created_at)}</TableCell>
                    <TableCell className="text-right">
                      {ap.status !== "completed" && ap.status !== "rejected" && (
                        <>
                            <Button size="sm" className="min-h-10" onClick={() => void claimAndScore(ap.id)} disabled={pending}>
                            <Settings2 className="size-4" />
                            Audit now
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setRejectId(ap.id)}>
                            Reject
                          </Button>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </AdminTable>
      ) : (
        <AdminEmptyState icon={<ClipboardList className="size-9" />} title="Queue empty">
          Applications appear here after someone submits the public form.
        </AdminEmptyState>
      )}

      <AdminFormDrawer
        open={rejectId !== null}
        onOpenChange={(o) => !o && setRejectId(null)}
        title="Reject application"
        footer={
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setRejectId(null)}>
              Cancel
            </Button>
            <Button variant="destructive" className="flex-1" onClick={() => void rejectApp()} disabled={pending}>
              Reject
            </Button>
          </div>
        }
      >
        <div className="space-y-2">
          <Label htmlFor="reject_reason">Reason</Label>
          <Input id="reject_reason" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
        </div>
      </AdminFormDrawer>
    </div>
  );
}
