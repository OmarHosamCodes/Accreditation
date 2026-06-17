import { TIERS, tierFor } from "@accreditation/shared";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { EmptyState } from "@/components/shared/EmptyState";
import { PlatformBadge, TierBadge } from "@/components/shared/TierBadge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAppData } from "@/contexts/AppDataContext";
import { brandById, fmtDate, latestAuditByBrand, publishedAudits } from "@/lib/state";
import { Search } from "lucide-react";

type SortKey = "rank" | "name" | "platform" | "tier" | "score" | "date";

export function LeaderboardPage() {
  const { db } = useAppData();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState("");
  const [platFilter, setPlatFilter] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; dir: number }>({ key: "score", dir: -1 });

  const rows = useMemo(() => {
    if (!db) return [];
    let list = latestAuditByBrand(db).map((a) => {
      const b = brandById(db, a.brand_id)!;
      const t = tierFor(a.overall_score);
      const cnt = publishedAudits(db).filter((x) => x.brand_id === a.brand_id).length;
      return { a, b, t, cnt };
    });
    const q = search.toLowerCase();
    list = list.filter(
      (r) =>
        (!q || r.b.name.toLowerCase().includes(q)) &&
        (!tierFilter || r.t.key === tierFilter) &&
        (!platFilter || r.b.platform === platFilter),
    );
    list.sort((x, y) => {
      let v = 0;
      switch (sort.key) {
        case "name":
          v = x.b.name.localeCompare(y.b.name);
          break;
        case "platform":
          v = x.b.platform.localeCompare(y.b.platform);
          break;
        case "date":
          v = (x.a.published_at ?? 0) - (y.a.published_at ?? 0);
          break;
        default:
          v = x.a.overall_score - y.a.overall_score;
      }
      return v * sort.dir;
    });
    return list;
  }, [db, search, tierFilter, platFilter, sort]);

  if (!db) return null;

  const toggleSort = (key: SortKey) => {
    setSort((s) => (s.key === key ? { key, dir: s.dir * -1 } : { key, dir: key === "name" ? 1 : -1 }));
  };

  const sortArrow = (key: SortKey) => (sort.key === key ? (sort.dir === 1 ? " ↑" : " ↓") : " ↕");

  return (
    <section className="py-10">
      <div className="mx-auto max-w-5xl px-4">
        <h1 className="mb-6 text-3xl font-semibold">Leaderboard</h1>
        <div className="mb-6 flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="text-muted-foreground absolute top-2.5 left-3 size-4" />
            <Input className="pl-9" placeholder="Search brand…" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search brands" />
          </div>
          <Select value={tierFilter || "all"} onValueChange={(v) => setTierFilter(v === "all" ? "" : v)}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="All tiers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All tiers</SelectItem>
              {TIERS.map((t) => (
                <SelectItem key={t.key} value={t.key}>{t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={platFilter || "all"} onValueChange={(v) => setPlatFilter(v === "all" ? "" : v)}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="All platforms" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All platforms</SelectItem>
              <SelectItem value="ig">Instagram</SelectItem>
              <SelectItem value="fb">Facebook</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="mb-4 grid gap-3 md:hidden">
          {rows.map((r, i) => (
            <Card key={r.a.id} className="cursor-pointer py-4" onClick={() => navigate(`/audit/${r.a.id}`)}>
              <CardContent className="px-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-medium">{r.b.name}</div>
                    <div className="text-muted-foreground text-xs">{r.b.niche}</div>
                  </div>
                  <span className="text-muted-foreground font-mono text-sm">#{i + 1}</span>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <TierBadge tier={r.t} />
                  <span className="font-mono font-semibold">{r.a.overall_score}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="cursor-pointer" onClick={() => toggleSort("rank")}>#{sortArrow("rank")}</TableHead>
                <TableHead className="cursor-pointer" onClick={() => toggleSort("name")}>Brand{sortArrow("name")}</TableHead>
                <TableHead className="cursor-pointer" onClick={() => toggleSort("platform")}>Platform{sortArrow("platform")}</TableHead>
                <TableHead className="cursor-pointer" onClick={() => toggleSort("tier")}>Tier{sortArrow("tier")}</TableHead>
                <TableHead className="cursor-pointer" onClick={() => toggleSort("score")}>Score{sortArrow("score")}</TableHead>
                <TableHead className="cursor-pointer" onClick={() => toggleSort("date")}>Last audit{sortArrow("date")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length ? (
                rows.map((r, i) => (
                  <TableRow key={r.a.id} className="cursor-pointer" onClick={() => navigate(`/audit/${r.a.id}`)}>
                    <TableCell>{i + 1}</TableCell>
                    <TableCell>
                      <div className="font-medium">{r.b.name}</div>
                      <div className="text-muted-foreground text-xs">{r.b.niche} · {r.cnt} audit{r.cnt > 1 ? "s" : ""}</div>
                    </TableCell>
                    <TableCell><PlatformBadge platform={r.b.platform} /></TableCell>
                    <TableCell><TierBadge tier={r.t} /></TableCell>
                    <TableCell className="font-mono font-semibold">{r.a.overall_score}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{fmtDate(r.a.published_at)}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6}>
                    <EmptyState>No brands match your filters.</EmptyState>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <p className="text-muted-foreground mt-4 text-sm">Click any row to read the full audit. Click a column header to sort.</p>
      </div>
    </section>
  );
}
