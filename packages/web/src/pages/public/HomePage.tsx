import { TIERS, tierFor } from "@accreditation/shared";
import { Link, useNavigate } from "react-router-dom";
import { PlatformBadge, TierBadge } from "@/components/shared/TierBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAppData } from "@/contexts/AppDataContext";
import { activeWeights, brandById, latestAuditByBrand, publishedAudits } from "@/lib/state";
export function HomePage() {
  const { db } = useAppData();
  const navigate = useNavigate();
  if (!db) return null;

  const audits = latestAuditByBrand(db).sort((a, b) => b.overall_score - a.overall_score);
  const top = audits.slice(0, 3);
  const queue = db.applications.filter((a) => a.status === "pending" || a.status === "in_progress").length;
  const weights = activeWeights(db, db.weights_versions[db.weights_versions.length - 1]!.id);

  return (
    <div>
      <section className="border-b py-16 md:py-24">
        <div className="mx-auto max-w-5xl px-4">
          <p className="text-muted-foreground mb-4 font-mono text-xs tracking-wider uppercase">Independent · FB &amp; IG · since 2026</p>
          <h1 className="mb-4 text-4xl font-semibold tracking-tight md:text-5xl">
            Your feed thinks it&apos;s good. <em className="not-italic text-muted-foreground">We decide.</em>
          </h1>
          <p className="text-muted-foreground mb-8 max-w-2xl text-lg">
            The Accreditation is a third-party audit of brand presence on Facebook and Instagram, scored across 16 dimensions by real auditors, against published rubrics. Earn a tier. Wear the badge. Or get roasted.
          </p>
          <div className="mb-8 flex flex-wrap gap-3">
            <Button asChild>
              <Link to="/apply">Apply for an audit</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/leaderboard">View leaderboard</Link>
            </Button>
          </div>
          <div className="flex flex-wrap gap-6 text-sm">
            <p><strong>{audits.length}</strong> brands accredited</p>
            <p><strong>16</strong> dimensions scored</p>
            <p><strong>{queue}</strong> in the queue</p>
          </div>
        </div>
      </section>

      <section className="py-12">
        <div className="mx-auto max-w-5xl px-4">
          <h2 className="mb-6 text-2xl font-semibold">Five outcomes. No participation trophies.</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {TIERS.map((t, i) => (
              <Card key={t.key}>
                <CardHeader className="pb-2">
                  <div className="mb-2 size-3 rounded-full" style={{ backgroundColor: t.col }} />
                  <CardTitle className="text-base">{t.name}</CardTitle>
                </CardHeader>
                <CardContent className="text-muted-foreground text-sm">
                  {t.key === "roast" ? "Below 60" : t.min + (t.key === "plat" ? "+" : "–" + (TIERS[i - 1] ? TIERS[i - 1]!.min - 1 : 99))}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-12">
        <div className="mx-auto max-w-5xl px-4">
          <h2 className="mb-6 text-2xl font-semibold">Currently leading</h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Brand</TableHead>
                <TableHead>Platform</TableHead>
                <TableHead>Tier</TableHead>
                <TableHead>Score</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {top.length ? (
                top.map((a, i) => {
                  const b = brandById(db, a.brand_id)!;
                  const t = tierFor(a.overall_score);
                  return (
                    <TableRow key={a.id} className="cursor-pointer" onClick={() => navigate(`/audit/${a.id}`)}>
                      <TableCell>{i + 1}</TableCell>
                      <TableCell>
                        <div className="font-medium">{b.name}</div>
                        <div className="text-muted-foreground text-xs">{b.niche}</div>
                      </TableCell>
                      <TableCell><PlatformBadge platform={b.platform} /></TableCell>
                      <TableCell><TierBadge tier={t} /></TableCell>
                      <TableCell className="font-mono font-semibold">{a.overall_score}</TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-muted-foreground text-center py-8">
                    No published audits yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          <Button variant="outline" size="sm" className="mt-4" asChild>
            <Link to="/leaderboard">View full leaderboard</Link>
          </Button>
        </div>
      </section>

      <section className="py-12">
        <div className="mx-auto max-w-5xl px-4">
          <h2 className="mb-6 text-2xl font-semibold">Four categories, sixteen dimensions</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {db.categories.map((c) => {
              const dims = db.dimensions.filter((d) => d.category_key === c.key);
              return (
                <Card key={c.key}>
                  <CardHeader className="flex-row items-center justify-between">
                    <CardTitle className="text-base">{c.name}</CardTitle>
                    <span className="text-muted-foreground text-xs">{weights[c.key]}% weight</span>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-1 text-sm">
                      {dims.map((d) => (
                        <li key={d.id} className="text-muted-foreground">→ {d.name}</li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          <Button variant="outline" size="sm" className="mt-4" asChild>
            <Link to="/methodology">Read full methodology</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
