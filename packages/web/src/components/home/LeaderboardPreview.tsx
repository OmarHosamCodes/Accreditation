import type { AppState, Audit, Brand } from "@accreditation/shared";
import { tierFor } from "@accreditation/shared";
import { motion, useReducedMotion } from "motion/react";
import { Link, useNavigate } from "react-router-dom";
import { PlatformBadge, TierBadge } from "@/components/shared/TierBadge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { brandById } from "@/lib/state";
import { listItemVariants, staggerDelay, staggerFast } from "./motion-config";

const MotionTableRow = motion.create(TableRow);

type Row = { audit: Audit; brand: Brand; tier: ReturnType<typeof tierFor> };

function buildRows(db: AppState, top: Audit[]): Row[] {
  return top.map((audit) => ({
    audit,
    brand: brandById(db, audit.brand_id)!,
    tier: tierFor(audit.overall_score),
  }));
}

export function LeaderboardPreview({ db, top }: { db: AppState; top: Audit[] }) {
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const rows = buildRows(db, top);
  const itemVariants = listItemVariants(reduceMotion);
  const rowDelay = (index: number) => (reduceMotion ? 0 : staggerDelay + index * staggerFast);

  return (
    <section className="home-section py-12">
      <div className="mx-auto max-w-5xl px-4">
        <h2 className="mb-6 text-2xl font-semibold">Currently leading</h2>

        <div className="mb-4 grid gap-3 md:hidden">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-40px" }}
            className="flex flex-col gap-3"
          >
            {rows.length ? (
              rows.map((row, i) => (
                <motion.div
                  key={row.audit.id}
                  variants={itemVariants}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, margin: "-40px" }}
                  whileHover={reduceMotion ? undefined : { y: -2 }}
                  transition={{ delay: rowDelay(i), duration: 0.2 }}
                  className="home-leaderboard-card cursor-pointer rounded-lg border p-4"
                  onClick={() => navigate(`/audit/${row.audit.id}`)}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-medium">{row.brand.name}</div>
                      <div className="text-muted-foreground text-xs">{row.brand.niche}</div>
                    </div>
                    <span className="text-muted-foreground font-mono text-sm">#{i + 1}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <TierBadge tier={row.tier} />
                    <span className="font-mono font-semibold">{row.audit.overall_score}</span>
                  </div>
                </motion.div>
              ))
            ) : (
              <p className="text-muted-foreground py-8 text-center">No published audits yet.</p>
            )}
          </motion.div>
        </div>

        <div className="hidden md:block">
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
              {rows.length ? (
                rows.map((row, i) => (
                  <MotionTableRow
                    key={row.audit.id}
                    variants={itemVariants}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: "-40px" }}
                    whileHover={reduceMotion ? undefined : { y: -2 }}
                    transition={{ delay: rowDelay(i), duration: 0.15 }}
                    className="home-leaderboard-row cursor-pointer"
                    onClick={() => navigate(`/audit/${row.audit.id}`)}
                  >
                    <TableCell>{i + 1}</TableCell>
                    <TableCell>
                      <div className="font-medium">{row.brand.name}</div>
                      <div className="text-muted-foreground text-xs">{row.brand.niche}</div>
                    </TableCell>
                    <TableCell>
                      <PlatformBadge platform={row.brand.platform} />
                    </TableCell>
                    <TableCell>
                      <TierBadge tier={row.tier} />
                    </TableCell>
                    <TableCell className="font-mono font-semibold">{row.audit.overall_score}</TableCell>
                  </MotionTableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-muted-foreground py-8 text-center">
                    No published audits yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <Button variant="outline" size="sm" className="mt-4" asChild>
          <Link to="/leaderboard">View full leaderboard</Link>
        </Button>
      </div>
    </section>
  );
}
