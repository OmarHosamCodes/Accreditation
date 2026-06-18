import { tierFor } from "@accreditation/shared";
import { Link, useNavigate } from "react-router-dom";
import { AdminBreadcrumbs } from "@/components/admin/AdminShell";
import { AdminEmptyState } from "@/components/admin/AdminEmptyState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { TierBadge } from "@/components/shared/TierBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { useAdminEditor } from "@/contexts/AdminEditorContext";
import { useAppData } from "@/contexts/AppDataContext";
import { useAdminMutation } from "@/hooks/useAdminMutation";
import * as adminApi from "@/lib/admin-api";
import { anchorForText, brandById, catBreakdown, computeOverall } from "@/lib/state";
import { CheckSquare, Rocket, Save } from "lucide-react";

export function EditorPage() {
  const { db } = useAppData();
  const { mutate, pending } = useAdminMutation();
  const { editing, scores, startAudit, cancelEdit, setScore, setNote, setSummary, setAuditId } = useAdminEditor();
  const navigate = useNavigate();

  if (!db) return null;

  if (!editing) {
    const pend = db.applications.filter((a) => a.status === "pending" || a.status === "in_progress");
    return (
      <div>
        <AdminPageHeader title="Audit editor" description="Pick an application from the queue to score all 16 dimensions." />
        {pend.length ? (
          <div className="bg-card space-y-3 rounded-lg border p-4">
            {pend.map((ap) => {
              const b = brandById(db, ap.brand_id)!;
              return (
                <div key={ap.id} className="flex items-center justify-between gap-4 border-b pb-3 last:border-0 last:pb-0">
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
          <AdminEmptyState icon={<CheckSquare className="size-9" />} title="Nothing waiting">
            Claim an application from the queue or wait for a new submission.
          </AdminEmptyState>
        )}
      </div>
    );
  }

  const brand = brandById(db, editing.brandId)!;
  const anchors = db.rubric_anchors[editing.rubric]!;
  const scoreArr = Object.entries(scores).map(([id, s]) => ({ dim_id: parseInt(id, 10), score: s.score }));
  const overall = computeOverall(scoreArr, db, editing.rubric, editing.weights);
  const tier = tierFor(overall);
  const bd = catBreakdown(scoreArr.map((x) => ({ dim_id: x.dim_id, score: x.score })), db);

  const buildScorePayload = () =>
    Object.entries(scores).map(([id, s]) => ({
      dim_id: parseInt(id, 10),
      score: s.score,
      note: s.note,
    }));

  const saveDraft = async () => {
    const payload = {
      brand_id: editing.brandId,
      audit_id: editing.auditId ?? undefined,
      application_id: editing.appId ?? undefined,
      summary: editing.summary,
      scores: buildScorePayload(),
    };
    const res = await mutate(() => adminApi.saveAuditDraft(payload), { success: "Draft saved" });
    if (res?.audit) setAuditId((res.audit as { id: number }).id);
  };

  const publishAudit = async () => {
    let auditId: number | undefined = editing.auditId ?? undefined;
    if (!auditId) {
      const draftRes = await mutate(() =>
        adminApi.saveAuditDraft({
          brand_id: editing.brandId,
          application_id: editing.appId ?? undefined,
          summary: editing.summary,
          scores: buildScorePayload(),
        }),
      );
      auditId = (draftRes?.audit as { id: number } | undefined)?.id;
      if (!auditId) return;
      setAuditId(auditId);
    } else {
      const id = auditId;
      await mutate(() =>
        adminApi.bulkSaveAuditScores(id, {
          scores: buildScorePayload(),
          summary: editing.summary,
          status: "draft",
          application_id: editing.appId ?? undefined,
        }),
      );
    }

    const res = await mutate(
      () => adminApi.publishAudit(auditId, editing.summary || "Audited across all 16 dimensions.", editing.appId ?? undefined),
      { success: "Published. Public audit is live." },
    );
    if (res) {
      cancelEdit();
      navigate("/admin/queue");
      setTimeout(() => navigate(`/audit/${auditId}`), 400);
    }
  };

  const evidenceForDim = (dimId: number) =>
    db.evidence_pins.filter((p) => p.audit_id === editing.auditId && p.dim_id === dimId).length;

  return (
    <div>
      <AdminBreadcrumbs
        items={[
          { label: "Queue", to: "/admin/queue" },
          { label: brand.name },
        ]}
      />

      <AdminPageHeader
        title={`Scoring: ${brand.name}`}
        actions={
          <Button variant="ghost" size="sm" onClick={() => { cancelEdit(); navigate("/admin/queue"); }}>
            ← Back to queue
          </Button>
        }
      />

      <div className="grid gap-8 lg:grid-cols-[1fr_280px]">
        <div className="space-y-6">
          {db.categories.map((c) => {
            const dims = db.dimensions.filter((d) => d.category_key === c.key);
            return (
              <div key={c.key}>
                <h2 className="text-muted-foreground mb-3 text-xs font-medium tracking-wide uppercase">{c.name}</h2>
                <div className="space-y-4">
                  {dims.map((d) => {
                    const a = anchors[d.id]!;
                    const sc = scores[d.id]!;
                    const anchor = anchorForText(a, sc.score);
                    const evCount = editing.auditId ? evidenceForDim(d.id) : 0;
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
                          {evCount > 0 && editing.auditId && (
                            <p className="text-muted-foreground text-xs">
                              <Link to={`/admin/audits/${editing.auditId}`} className="underline">
                                {evCount} evidence pin(s)
                              </Link>
                            </p>
                          )}
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
              <Label htmlFor="editor_summary">Overall summary</Label>
              <Textarea
                id="editor_summary"
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
            <div className="text-5xl font-bold tabular-nums" style={{ color: tier.col }}>{overall}</div>
            <TierBadge tier={tier} className="mx-auto" />
            <div className="space-y-2 text-left text-sm">
              {bd.map((b) => (
                <div key={b.cat.key} className="flex justify-between">
                  <span>{b.cat.name}</span>
                  <span className="font-mono font-semibold">{b.avg.toFixed(1)}</span>
                </div>
              ))}
            </div>
            <Button className="w-full" variant="outline" onClick={() => void saveDraft()} disabled={pending}>
              <Save className="size-4" />
              {pending ? "Saving…" : "Save draft"}
            </Button>
            <Button className="w-full" onClick={() => void publishAudit()} disabled={pending}>
              <Rocket className="size-4" />
              {pending ? "Publishing…" : "Publish audit"}
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
