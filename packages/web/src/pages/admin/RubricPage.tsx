import { useState } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAppData } from "@/contexts/AppDataContext";
import { saveState } from "@/lib/api";
import type { AppState, Dimension } from "@accreditation/shared";
import { Info, Save } from "lucide-react";

type RubricDraft = {
  dims: Dimension[];
  anchors: AppState["rubric_anchors"][number];
  base: number;
};

export function RubricPage() {
  const { db, updateDB } = useAppData();
  const [draft, setDraft] = useState<RubricDraft | null>(null);
  const [saving, setSaving] = useState(false);

  if (!db) return null;

  const currentDraft: RubricDraft = draft ?? (() => {
    const cur = db.rubric_versions[db.rubric_versions.length - 1]!.id;
    return {
      dims: structuredClone(db.dimensions),
      anchors: structuredClone(db.rubric_anchors[cur]!),
      base: cur,
    };
  })();

  const setDraftField = (updater: (d: RubricDraft) => RubricDraft) => {
    setDraft(updater(draft ?? currentDraft));
  };

  const saveRubric = async () => {
    const d = draft ?? currentDraft;
    setSaving(true);
    try {
      const newId = db.rubric_versions.length + 1;
      db.rubric_versions.push({ id: newId, created_at: Date.now(), notes: `Edited from v${d.base}` });
      db.dimensions = d.dims;
      db.rubric_anchors[newId] = structuredClone(d.anchors);
      await saveState(db, (m) => toast.error(m));
      updateDB({ ...db });
      setDraft(null);
      toast.success(`Rubric v${newId} saved`);
    } catch {
      /* shown */
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold">Rubric manager</h1>
        <span className="text-muted-foreground text-sm">
          Editing from v{currentDraft.base} · {db.rubric_versions.length} version(s)
        </span>
      </div>
      <Alert className="mb-6">
        <Info className="size-4" />
        <AlertDescription>
          Saving creates a <strong>new rubric version</strong>. Existing audits keep the version they were scored on.
        </AlertDescription>
      </Alert>
      {db.categories.map((c) => {
        const dims = currentDraft.dims.filter((x) => x.category_key === c.key);
        return (
          <div key={c.key} className="mb-8">
            <h2 className="text-muted-foreground mb-3 text-sm font-medium tracking-wide uppercase">{c.name}</h2>
            <Card>
              <CardContent className="space-y-6 px-4 py-6">
                {dims.map((dim) => {
                  const a = currentDraft.anchors[dim.id]!;
                  return (
                    <div key={dim.id} className="space-y-3">
                      <Input
                        value={dim.name}
                        className="font-semibold"
                        onChange={(e) =>
                          setDraftField((d) => ({
                            ...d,
                            dims: d.dims.map((x) => (x.id === dim.id ? { ...x, name: e.target.value } : x)),
                          }))
                        }
                      />
                      <Input
                        value={dim.description}
                        placeholder="description"
                        onChange={(e) =>
                          setDraftField((d) => ({
                            ...d,
                            dims: d.dims.map((x) => (x.id === dim.id ? { ...x, description: e.target.value } : x)),
                          }))
                        }
                      />
                      <div className="grid gap-2 md:grid-cols-3">
                        {(["anchor_1", "anchor_5", "anchor_10"] as const).map((key) => (
                          <Textarea
                            key={key}
                            placeholder={key.replace("anchor_", "Anchor ")}
                            value={a[key]}
                            onChange={(e) =>
                              setDraftField((d) => ({
                                ...d,
                                anchors: {
                                  ...d.anchors,
                                  [dim.id]: { ...d.anchors[dim.id]!, [key]: e.target.value },
                                },
                              }))
                            }
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>
        );
      })}
      <div className="flex gap-3">
        <Button onClick={() => void saveRubric()} disabled={saving}>
          <Save className="size-4" />
          {saving ? "Saving…" : "Save as new version"}
        </Button>
        <Button variant="ghost" onClick={() => setDraft(null)}>Discard changes</Button>
      </div>
    </div>
  );
}
