import { useState } from "react";
import { toast } from "sonner";
import { AdminPageHeader, AdminSection } from "@/components/admin/AdminPageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAppData } from "@/contexts/AppDataContext";
import { saveState } from "@/lib/api";
import { activeWeights } from "@/lib/state";
import { Save } from "lucide-react";

export function WeightsPage() {
  const { db, updateDB } = useAppData();
  const [saving, setSaving] = useState(false);

  if (!db) return null;

  const latestId = db.weights_versions[db.weights_versions.length - 1]!.id;
  const current = activeWeights(db, latestId);
  const [weights, setWeights] = useState<Record<string, number>>({ ...current });

  const total = db.categories.reduce((s, c) => s + (weights[c.key] ?? 0), 0);
  const valid = total === 100;

  const saveWeights = async () => {
    if (!valid) {
      toast.error("Weights must total 100");
      return;
    }
    setSaving(true);
    try {
      const id = db.weights_versions.length + 1;
      db.weights_versions.push({ id, weights: { ...weights } });
      db.categories.forEach((c) => {
        c.weight = weights[c.key] ?? 0;
      });
      await saveState(db, (m) => toast.error(m));
      updateDB({ ...db });
      toast.success(`Weights v${id} saved`);
    } catch {
      /* shown */
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <AdminPageHeader
        title="Weights"
        description="Category weights for scoring. Affects new audits only."
        meta={`Current: v${latestId}`}
      />

      <div className="bg-card mb-6 max-w-md rounded-lg border p-4">
        <div className="mb-2 flex justify-between text-sm">
          <span className="text-muted-foreground">Total</span>
          <span className={valid ? "text-chart-2 font-medium" : "text-destructive font-medium"}>{total}%</span>
        </div>
        <div className="bg-muted h-2 overflow-hidden rounded-full">
          <div
            className={`h-full motion-safe:transition-all ${valid ? "bg-primary" : "bg-destructive"}`}
            style={{ width: `${Math.min(total, 100)}%` }}
          />
        </div>
        {!valid && <p className="text-destructive mt-2 text-xs">Weights must total exactly 100%.</p>}
      </div>

      <div className="bg-card mb-8 max-w-md rounded-lg border p-4">
        <div className="space-y-4">
          {db.categories.map((c) => (
            <div key={c.key} className="flex items-center justify-between gap-4">
              <span className="text-sm font-medium">{c.name}</span>
              <Input
                type="number"
                min={0}
                max={100}
                className="w-24"
                value={weights[c.key] ?? 0}
                onChange={(e) => setWeights({ ...weights, [c.key]: parseInt(e.target.value, 10) || 0 })}
              />
            </div>
          ))}
          <Button onClick={() => void saveWeights()} disabled={saving || !valid}>
            <Save className="size-4" />
            {saving ? "Saving…" : "Save weights"}
          </Button>
        </div>
      </div>

      <AdminSection title="Version history">
        <ul className="text-muted-foreground space-y-1 text-sm">
          {[...db.weights_versions].reverse().map((v) => (
            <li key={v.id}>
              v{v.id}: {Object.entries(v.weights).map(([k, w]) => `${k} ${w}%`).join(", ")}
            </li>
          ))}
        </ul>
      </AdminSection>
    </div>
  );
}
