import { tierFor } from "@accreditation/shared";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { EmptyState } from "@/components/shared/EmptyState";
import { TierBadge } from "@/components/shared/TierBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { useAdminEditor } from "@/contexts/AdminEditorContext";
import { useAppData } from "@/contexts/AppDataContext";
import { saveState } from "@/lib/api";
import { anchorForText, brandById, catBreakdown, computeOverall } from "@/lib/state";
import { CheckSquare, Rocket, Save } from "lucide-react";
import { useState } from "react";

export function EditorPage() {
  const { db, updateDB } = useAppData();
  const { user } = useAdminAuth();
  const { editing, scores, startAudit, cancelEdit, setScore, setNote, setSummary, setAuditId } = useAdminEditor();
  const navigate = useNavigate();
  const [publishing, setPublishing] = useState(false);
  const [saving, setSaving] = useState(false);

  if (!db) return null;

  if (!editing) {
    const pend = db.applications.filter((a) => a.status === "pending" || a.status === "in_progress");
    return (
      <div>
        <h1 className="mb-6 text-2xl font-semibold">Audit editor</h1>
        <Card>
          <CardContent className="pt-6">
            <p className="mb-4 font-medium">Pick something from the queue to score:</p>
            {pend.length ? (
              <div className="space-y-3">
                {pend.map((ap) => {
                  const b = brandById(db, ap.brand_id)!;
                  return (
                    <div key={ap.id} className="flex items-center justify-between gap-4">
                      <div>
                        <span className="font-medium">{b.name}</span>{" "}
                        <Badge variant="outline" className="text-[10px] uppercase">{ap.type}</Badge>
                        <p className="text-muted-foreground text-sm">{b.niche}</p>
                      </div>
                      <Button size="sm" onClick={() => startAudit(ap.brand_id, ap.id)}>Score brand</Button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState icon={<CheckSquare className="size-9" />}>Nothing waiting. Add one via the public Apply form.</EmptyState>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  const brand = brandById(db, editing.brandId)!;
  const anchors = db.rubric_anchors[editing.rubric]!;
  const scoreArr = Object.entries(scores).map(([id, s]) => ({ dim_id: parseInt(id, 10), score: s.score }));
  const overall = computeOverall(scoreArr, db, editing.rubric, editing.weights);
  const tier = tierFor(overall);
  const bd = catBreakdown(scoreArr.map((x) => ({ dim_id: x.dim_id, score: x.score })), db);

  const buildAudit = (status: "draft" | "published") => {
    const arr = Object.entries(scores).map(([id, s]) => ({
      dim_id: parseInt(id, 10),
      score: s.score,
      note: s.note,
    }));
    const scoreOnly = arr.map((x) => ({ dim_id: x.dim_id, score: x.score }));
    const overallScore = computeOverall(scoreOnly, db, editing.rubric, editing.weights);
    let aud = editing.auditId ? db.audits.find((a) => a.id === editing.auditId) : null;
    if (!aud) {
      aud = {
        id: db.nextId++,
        brand_id: editing.brandId,
        auditor: user,
        rubric_version_id: editing.rubric,
        weights_version_id: editing.weights,
        created_at: Date.now(),
        status: "draft",
        overall_score: 0,
        tier: "",
        summary: "",
      };
      db.audits.push(aud);
      setAuditId(aud.id);
    }
    aud.status = status;
    aud.overall_score = overallScore;
    aud.tier = tierFor(overallScore).key;
    aud.summary = editing.summary || "Audited across all 16 dimensions.";
    if (status === "published") aud.published_at = Date.now();
    db.audit_scores[aud.id] = arr;
    if (status === "published" && editing.appId) {
      const ap = db.applications.find((a) => a.id === editing.appId);
      if (ap) ap.status = "completed";
    }
    return aud;
  };

  const saveDraft = async () => {
    setSaving(true);
    try {
      buildAudit("draft");
      await saveState(db, (m) => toast.error(m));
      updateDB({ ...db });
      toast.success("Draft saved");
    } catch {
      /* shown */
    } finally {
      setSaving(false);
    }
  };

  const publishAudit = async () => {
    setPublishing(true);
    try {
      const aud = buildAudit("published");
      await saveState(db, (m) => toast.error(m));
      updateDB({ ...db });
      cancelEdit();
      toast.success("Published. Public audit is live.");
      navigate("/admin/queue");
      setTimeout(() => navigate(`/audit/${aud.id}`), 400);
    } catch {
      /* shown */
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Scoring: {brand.name}</h1>
        <Button variant="ghost" size="sm" onClick={() => { cancelEdit(); navigate("/admin/queue"); }}>
          ← Back to queue
        </Button>
      </div>
      <div className="grid gap-8 lg:grid-cols-[1fr_280px]">
        <div className="space-y-6">
          {db.categories.map((c) => {
            const dims = db.dimensions.filter((d) => d.category_key === c.key);
            return (
              <div key={c.key}>
                <h2 className="text-muted-foreground mb-3 text-sm font-medium tracking-wide uppercase">{c.name}</h2>
                <div className="space-y-4">
                  {dims.map((d) => {
                    const a = anchors[d.id]!;
                    const sc = scores[d.id]!;
                    const anchor = anchorForText(a, sc.score);
                    return (
                      <Card key={d.id} className="py-4">
                        <CardContent className="space-y-3 px-4">
                          <div className="flex justify-between text-sm font-medium">
                            <span>{d.name}</span>
                            <span className="font-mono">{sc.score}</span>
                          </div>
                          <Slider
                            min={1}
                            max={10}
                            step={1}
                            value={[sc.score]}
                            onValueChange={([v]) => setScore(d.id, v ?? sc.score)}
                          />
                          <p className="text-muted-foreground text-xs">
                            <strong>Anchor {anchor.label}:</strong> {anchor.text}
                          </p>
                          <Textarea
                            placeholder="Note (optional, shows on the public audit)"
                            value={sc.note}
                            onChange={(e) => setNote(d.id, e.target.value)}
                            className="min-h-16"
                          />
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            );
          })}
          <Card className="py-4">
            <CardContent className="px-4">
              <Label>Overall summary</Label>
              <Textarea
                className="mt-2 min-h-20"
                placeholder="One-paragraph verdict shown at the top of the public audit…"
                value={editing.summary}
                onChange={(e) => setSummary(e.target.value)}
              />
            </CardContent>
          </Card>
        </div>
        <Card className="sticky top-6 h-fit">
          <CardContent className="space-y-4 pt-6 text-center">
            <p className="text-muted-foreground text-xs tracking-wider uppercase">Live score</p>
            <div className="text-5xl font-bold" style={{ color: tier.col }}>{overall}</div>
            <TierBadge tier={tier} className="mx-auto" />
            <div className="space-y-2 text-left text-sm">
              {bd.map((b) => (
                <div key={b.cat.key} className="flex justify-between">
                  <span>{b.cat.name}</span>
                  <span className="font-mono font-semibold">{b.avg.toFixed(1)}</span>
                </div>
              ))}
            </div>
            <Button className="w-full" variant="outline" onClick={() => void saveDraft()} disabled={saving}>
              <Save className="size-4" />
              {saving ? "Saving…" : "Save draft"}
            </Button>
            <Button className="w-full" onClick={() => void publishAudit()} disabled={publishing}>
              <Rocket className="size-4" />
              {publishing ? "Publishing…" : "Publish audit"}
            </Button>
            <p className="text-muted-foreground text-xs">
              Publishing freezes the score + rubric v{editing.rubric} and creates the public page.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
