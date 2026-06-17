import { tierFor } from "@accreditation/shared";
import { Link, useParams } from "react-router-dom";
import { BadgeSVG } from "@/components/shared/BadgeSVG";
import { ScoreBar } from "@/components/shared/ScoreBar";
import { PlatformBadge, TierBadge } from "@/components/shared/TierBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useAppData } from "@/contexts/AppDataContext";
import { activeWeights, auditEvidence, brandById, catBreakdown, fmtDate } from "@/lib/state";

export function AuditPage() {
  const { id } = useParams();
  const { db } = useAppData();
  if (!db || !id) return null;

  const auditId = parseInt(id, 10);
  const audit = db.audits.find((x) => x.id === auditId && x.status === "published");
  if (!audit) {
    return (
      <section className="py-20 text-center">
        <h1 className="mb-4 text-3xl font-semibold">404</h1>
        <p className="text-muted-foreground mb-6">That audit isn&apos;t published (or doesn&apos;t exist).</p>
        <Button asChild><Link to="/">Home</Link></Button>
      </section>
    );
  }

  const brand = brandById(db, audit.brand_id)!;
  const tier = tierFor(audit.overall_score);
  const scores = db.audit_scores[audit.id] ?? [];
  const breakdown = catBreakdown(
    scores.map((s) => ({ dim_id: s.dim_id, score: s.score, note: s.note })),
    db,
  );
  const embedUrl = `${window.location.origin}/audit/${audit.id}`;
  const embedCode = `<a href="${embedUrl}">\n  <img src="badge-${audit.id}.svg" alt="The Accreditation — ${brand.name}: ${tier.name} ${audit.overall_score}/100" width="220">\n</a>`;
  const weights = activeWeights(db, audit.weights_version_id || 1);

  return (
    <section className="py-10">
      <div className="mx-auto max-w-5xl px-4">
        <Button variant="ghost" size="sm" className="mb-6" asChild>
          <Link to="/leaderboard">← Back to leaderboard</Link>
        </Button>
        <div className="grid gap-8 lg:grid-cols-[320px_1fr]">
          <Card>
            <CardHeader className="text-center" style={{ borderTop: `3px solid ${tier.col}` }}>
              <div className="text-5xl font-bold" style={{ color: tier.col }}>{audit.overall_score}</div>
              <p className="text-muted-foreground text-sm">/ 100 · {tier.name.toUpperCase()}</p>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Brand</span><strong>{brand.name}</strong></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Platform</span><PlatformBadge platform={brand.platform} /></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Handle</span><span className="font-mono">{brand.handle}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Auditor</span><span>{audit.auditor}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Date</span><span>{fmtDate(audit.published_at)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Rubric</span><span>v{audit.rubric_version_id}</span></div>
              <Button className="w-full" asChild>
                <Link to={`/reaudit/${audit.id}`}>Request re-audit</Link>
              </Button>
              <Separator />
              <p className="text-xs font-medium tracking-wide uppercase">Embed your badge</p>
              <BadgeSVG audit={audit} brand={brand} tier={tier} width={200} />
              <code className="bg-muted block overflow-x-auto rounded p-2 text-xs">{embedCode}</code>
            </CardContent>
          </Card>
          <div>
            <h1 className="mb-1 text-3xl font-semibold">{brand.name}</h1>
            <p className="text-muted-foreground mb-2">{brand.niche} · <span className="font-mono">{brand.handle}</span></p>
            <p className="mb-8 max-w-prose">{audit.summary}</p>
            {breakdown.map((bd) => (
              <div key={bd.cat.key} className="mb-8">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-semibold">
                    {bd.cat.name}{" "}
                    <span className="text-muted-foreground font-mono text-xs">{weights[bd.cat.key]}% wt</span>
                  </h2>
                  <span className="font-mono font-semibold">{bd.avg.toFixed(1)}/10</span>
                </div>
                <div className="space-y-4">
                  {bd.rows.map((r) => {
                    const ev = auditEvidence(db, audit.id, r.dim.id);
                    return (
                      <div key={r.dim.id}>
                        <div className="mb-1 flex justify-between text-sm">
                          <span>{r.dim.name}</span>
                          <span className="font-mono font-semibold">{r.score}/10</span>
                        </div>
                        <ScoreBar score={r.score} />
                        {r.note && <p className="text-muted-foreground mt-2 text-sm italic">&ldquo;{r.note}&rdquo;</p>}
                        {ev.length > 0 && (
                          <div className="mt-2 space-y-2">
                            {ev.map((p, i) => (
                              <Card key={p.id} className="py-3">
                                <CardContent className="px-4 text-sm">
                                  <div className="text-muted-foreground mb-1 flex justify-between text-xs">
                                    <span>Evidence #{i + 1}</span>
                                    <span>{p.visibility}</span>
                                  </div>
                                  <p>{p.note}</p>
                                  {p.element_text && <p className="text-muted-foreground mt-1 text-xs">{p.element_text}</p>}
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
