import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { EmptyState } from "@/components/shared/EmptyState";
import { PlatformBadge } from "@/components/shared/TierBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { useAdminEditor } from "@/contexts/AdminEditorContext";
import { useAppData } from "@/contexts/AppDataContext";
import { saveState } from "@/lib/api";
import { brandById, fmtDate } from "@/lib/state";
import { Inbox, Settings2 } from "lucide-react";
import { useState } from "react";

const statuses = ["pending", "in_progress", "completed", "rejected"] as const;

export function QueuePage() {
  const { db, updateDB } = useAppData();
  const { user } = useAdminAuth();
  const { startAudit } = useAdminEditor();
  const navigate = useNavigate();
  const [rejectId, setRejectId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  if (!db) return null;

  const apps = [...db.applications].sort((a, b) => b.created_at - a.created_at);
  const pending = apps.filter((a) => a.status === "pending" || a.status === "in_progress");

  const claimAndScore = async (appId: number) => {
    const ap = db.applications.find((a) => a.id === appId);
    if (!ap) return;
    ap.status = "in_progress";
    ap.claimed_by = user;
    try {
      await saveState(db, (m) => toast.error(m));
      updateDB({ ...db });
      startAudit(ap.brand_id, appId);
      navigate("/admin/editor");
    } catch {
      /* toast shown */
    }
  };

  const rejectApp = async () => {
    if (rejectId === null) return;
    const ap = db.applications.find((a) => a.id === rejectId);
    if (!ap) return;
    ap.status = "rejected";
    ap.reject_reason = rejectReason;
    try {
      await saveState(db, (m) => toast.error(m));
      updateDB({ ...db });
      toast.success("Application rejected");
    } catch {
      /* toast shown */
    }
    setRejectId(null);
    setRejectReason("");
  };

  return (
    <div>
      <div className="mb-6 flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold">Queue</h1>
        <span className="text-muted-foreground text-sm">{pending.length} awaiting action · {apps.length} total</span>
      </div>
      {statuses.map((st) => {
        const list = apps.filter((a) => a.status === st);
        if (!list.length) return null;
        return (
          <div key={st} className="mb-8">
            <h2 className="text-muted-foreground mb-3 text-sm font-medium tracking-wide uppercase">{st.replace("_", " ")} ({list.length})</h2>
            <Card>
              <CardContent className="divide-y px-0 py-0">
                {list.map((ap) => {
                  const b = brandById(db, ap.brand_id)!;
                  return (
                    <div key={ap.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="font-medium">
                          {b.name}{" "}
                          <Badge variant="outline" className="ml-1 text-[10px] uppercase">{ap.type}</Badge>
                        </div>
                        <div className="text-muted-foreground text-sm">
                          {b.niche} · <PlatformBadge platform={b.platform} /> · {b.handle} · {fmtDate(ap.created_at)}
                        </div>
                        {ap.why && <p className="text-muted-foreground mt-1 text-sm italic">&ldquo;{ap.why}&rdquo;</p>}
                        {ap.changes_note && <p className="text-muted-foreground mt-1 text-sm italic">Changes: &ldquo;{ap.changes_note}&rdquo;</p>}
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="secondary">{ap.status.replace("_", " ")}</Badge>
                        {ap.status !== "completed" && ap.status !== "rejected" && (
                          <>
                            <Button size="sm" onClick={() => void claimAndScore(ap.id)}>
                              <Settings2 className="size-4" />
                              Audit now
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setRejectId(ap.id)}>
                              Reject
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>
        );
      })}
      {!apps.length && (
        <EmptyState icon={<Inbox className="size-9" />}>Queue empty. Applications appear here after someone submits the public form.</EmptyState>
      )}
      <Dialog open={rejectId !== null} onOpenChange={(o) => !o && setRejectId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject application</DialogTitle>
            <DialogDescription>Provide a reason for rejection.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reject_reason">Reason</Label>
            <Input id="reject_reason" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => void rejectApp()}>Reject</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
