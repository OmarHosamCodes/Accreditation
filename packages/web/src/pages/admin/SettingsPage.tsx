import { Plug } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { AdminPageHeader, AdminSection } from "@/components/admin/AdminPageHeader";
import { ExtensionDownloadButton } from "@/components/admin/ExtensionDownloadButton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAdminMutation } from "@/hooks/useAdminMutation";
import * as adminApi from "@/lib/admin-api";

export function SettingsPage() {
  const { mutate, pending } = useAdminMutation();
  const [resetOpen, setResetOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  const handleReset = async () => {
    if (confirmText !== "RESET") return;
    const res = await mutate(() => adminApi.resetState(), { success: "State reset to defaults" });
    if (res) {
      setResetOpen(false);
      setConfirmText("");
    }
  };

  return (
    <div>
      <AdminPageHeader title="Settings" description="Extension connection and system maintenance." />

      <AdminSection title="Extension">
        <div className="bg-card rounded-lg border p-4">
          <p className="text-muted-foreground mb-3 text-sm">
            Download and install the browser extension, then connect it to your admin session for live page auditing.
          </p>
          <div className="flex flex-wrap gap-2">
            <ExtensionDownloadButton variant="default" />
            <Button asChild>
              <Link to="/admin/connect-extension">
                <Plug className="size-4" />
                Connect extension
              </Link>
            </Button>
          </div>
        </div>
      </AdminSection>

      <AdminSection title="Environment">
        <div className="bg-card text-muted-foreground max-w-lg rounded-lg border p-4 text-sm">
          <p>User accounts require <code className="text-foreground">DATABASE_URL</code> and a migrated Better Auth schema.</p>
          <p className="mt-2">Operational data (brands, audits, queue) syncs through admin REST endpoints. Rubric and weights still save via bulk state.</p>
        </div>
      </AdminSection>

      <AdminSection title="Danger zone">
        <Alert variant="destructive" className="mb-4 max-w-lg">
          <AlertDescription>
            Resetting wipes all brands, applications, audits, and evidence. Rubric and weights return to seed defaults. This cannot be undone.
          </AlertDescription>
        </Alert>
        <Button variant="destructive" onClick={() => setResetOpen(true)}>
          Reset all data
        </Button>
      </AdminSection>

      <Dialog open={resetOpen} onOpenChange={(o) => { setResetOpen(o); if (!o) setConfirmText(""); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset all data</DialogTitle>
            <DialogDescription>
              Type RESET to confirm. All operational data will be deleted.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reset_confirm">Confirmation</Label>
            <Input id="reset_confirm" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder="RESET" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => void handleReset()} disabled={pending || confirmText !== "RESET"}>
              {pending ? "Resetting…" : "Reset everything"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
