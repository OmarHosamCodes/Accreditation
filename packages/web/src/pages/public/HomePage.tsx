import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "motion/react";
import { AnimatedCounter } from "@/components/home/AnimatedCounter";
import { DimensionWeights } from "@/components/home/DimensionWeights";
import { LeaderboardPreview } from "@/components/home/LeaderboardPreview";
import { fadeUp, fadeUpTransition } from "@/components/home/motion-config";
import { TierScrollWalkthrough } from "@/components/home/TierScrollWalkthrough";
import { Button } from "@/components/ui/button";
import { useAppData } from "@/contexts/AppDataContext";
import { activeWeights, latestAuditByBrand } from "@/lib/state";
import "./home.css";

export function HomePage() {
  const { db } = useAppData();
  const reduceMotion = useReducedMotion();
  if (!db) return null;

  const audits = latestAuditByBrand(db).sort((a, b) => b.overall_score - a.overall_score);
  const top = audits.slice(0, 3);
  const queue = db.applications.filter((a) => a.status === "pending" || a.status === "in_progress").length;
  const weights = activeWeights(db, db.weights_versions[db.weights_versions.length - 1]!.id);

  return (
    <div>
      <motion.section
        className="border-b py-16 md:py-24"
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        transition={fadeUpTransition(reduceMotion)}
      >
        <div className="mx-auto max-w-5xl px-4">
          <p className="text-muted-foreground mb-4 text-sm">
            Independent audit bureau · Facebook &amp; Instagram · Est. 2026
          </p>
          <h1 className="mb-4 text-4xl font-semibold tracking-tight text-balance md:text-5xl">
            Your feed thinks it&apos;s good. <em className="not-italic text-muted-foreground">We decide.</em>
          </h1>
          <p className="text-muted-foreground mb-8 max-w-2xl text-lg text-pretty">
            The Accreditation is a third-party audit of brand presence on Facebook and Instagram, scored across 16 dimensions by real auditors, against published rubrics. Earn a tier. Wear the badge. Or get roasted.
          </p>
          <div className="mb-10 flex flex-wrap gap-3">
            <Button asChild>
              <Link to="/apply">Apply for an audit</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/leaderboard">View leaderboard</Link>
            </Button>
          </div>
          <div className="home-stats text-sm">
            <AnimatedCounter value={audits.length} label="brands accredited" />
            <AnimatedCounter value={16} label="dimensions scored" />
            <AnimatedCounter value={queue} label="in the queue" />
          </div>
        </div>
      </motion.section>

      <TierScrollWalkthrough />
      <LeaderboardPreview db={db} top={top} />
      <DimensionWeights db={db} weights={weights} />
    </div>
  );
}
