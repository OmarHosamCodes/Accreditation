import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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

  const saveWeights = async () => {
    if (total !== 100) {
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
      <div className="mb-6 flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold">Weights</h1>
        <span className="text-muted-foreground text-sm">Affects new audits only</span>
      </div>
      <Card className="max-w-md">
        <CardContent className="space-y-4 pt-6">
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
          <p className={`text-sm font-medium ${total === 100 ? "text-green-600" : "text-destructive"}`}>
            Total: {total}%{total !== 100 ? " (should be 100)" : ""}
          </p>
          <Button onClick={() => void saveWeights()} disabled={saving}>
            <Save className="size-4" />
            {saving ? "Saving…" : "Save weights"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
