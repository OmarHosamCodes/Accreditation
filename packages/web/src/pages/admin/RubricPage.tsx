import { useState } from "react";
import { toast } from "sonner";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  const [viewVersion, setViewVersion] = useState<string>("");

  if (!db) return null;

  const latestId = db.rubric_versions[db.rubric_versions.length - 1]!.id;
  const baseVersion = viewVersion ? Number(viewVersion) : latestId;

  const currentDraft: RubricDraft = draft ?? (() => {
    const cur = baseVersion;
    return {
      dims: structuredClone(db.dimensions),
      anchors: structuredClone(db.rubric_anchors[cur]!),
      base: cur,
    };
  })();

  const setDraftField = (updater: (d: RubricDraft) => RubricDraft) => {
    setDraft(updater(draft ?? currentDraft));
  };

  const isEditingLatest = currentDraft.base === latestId && !draft;

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
      setViewVersion(String(newId));
      toast.success(`Rubric v${newId} saved`);
    } catch {
      /* shown */
    } finally {
      setSaving(false);
    }
  };

  const loadVersionForEdit = (versionId: number) => {
    setViewVersion(String(versionId));
    setDraft({
      dims: structuredClone(db.dimensions),
      anchors: structuredClone(db.rubric_anchors[versionId]!),
      base: versionId,
    });
  };

  return (
    <div className="pb-24">
      <AdminPageHeader
        title="Rubric"
        description="Edit dimension names, descriptions, and score anchors."
        meta={`${db.rubric_versions.length} version(s) · viewing v${currentDraft.base}`}
        actions={
          <Select
            value={String(baseVersion)}
            onValueChange={(v) => {
              setViewVersion(v);
              setDraft(null);
            }}
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {db.rubric_versions.map((v) => (
                <SelectItem key={v.id} value={String(v.id)}>
                  v{v.id}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      <Alert className="mb-6">
        <Info className="size-4" />
        <AlertDescription>
          Saving creates a new rubric version. Existing audits keep the version they were scored on.
        </AlertDescription>
      </Alert>

      <Accordion type="multiple" defaultValue={db.categories.map((c) => c.key)} className="mb-24 space-y-2">
        {db.categories.map((c) => {
          const dims = currentDraft.dims.filter((x) => x.category_key === c.key);
          return (
            <AccordionItem key={c.key} value={c.key} className="bg-card rounded-lg border px-4">
              <AccordionTrigger className="text-sm font-medium">{c.name}</AccordionTrigger>
              <AccordionContent className="space-y-6 pb-4">
                {dims.map((dim) => {
                  const a = currentDraft.anchors[dim.id]!;
                  return (
                    <div key={dim.id} className="space-y-3 border-t pt-4 first:border-0 first:pt-0">
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
                        placeholder="Description"
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
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>

      <div className="bg-background fixed inset-x-0 bottom-0 z-10 border-t p-4 motion-safe:transition-shadow md:left-60">
        <div className="mx-auto flex max-w-4xl flex-wrap gap-3">
          <Button onClick={() => void saveRubric()} disabled={saving}>
            <Save className="size-4" />
            {saving ? "Saving…" : "Save as new version"}
          </Button>
          {draft && (
            <Button variant="ghost" onClick={() => setDraft(null)}>
              Discard changes
            </Button>
          )}
          {!isEditingLatest && !draft && (
            <Button variant="outline" onClick={() => loadVersionForEdit(baseVersion)}>
              Fork v{baseVersion} to edit
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
