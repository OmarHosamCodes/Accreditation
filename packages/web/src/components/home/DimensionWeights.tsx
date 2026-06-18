import type { AppState, Category, Dimension } from "@accreditation/shared";
import { motion, useInView, useReducedMotion } from "motion/react";
import { useRef } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { listItemVariants, listVariants, springSmooth } from "./motion-config";

function WeightBar({ weight, reduceMotion }: { weight: number; reduceMotion: boolean | null }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-20px" });

  return (
    <div ref={ref} className="home-weight-bar">
      <motion.div
        className="home-weight-bar__fill"
        initial={{ width: reduceMotion ? `${weight}%` : "0%" }}
        animate={{ width: inView || reduceMotion ? `${weight}%` : "0%" }}
        transition={reduceMotion ? { duration: 0 } : springSmooth}
      />
    </div>
  );
}

function CategoryBlock({
  category,
  dimensions,
  weight,
  reduceMotion,
}: {
  category: Category;
  dimensions: Dimension[];
  weight: number;
  reduceMotion: boolean | null;
}) {
  const containerVariants = listVariants(reduceMotion);
  const itemVariants = listItemVariants(reduceMotion);

  return (
    <article className="home-dimension-block">
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <h3 className="text-base font-semibold">{category.name}</h3>
        <span className="font-mono text-muted-foreground text-sm tabular-nums">{weight}%</span>
      </div>
      <WeightBar weight={weight} reduceMotion={reduceMotion} />
      <motion.ul
        className="mt-4 space-y-1.5"
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-20px" }}
      >
        {dimensions.map((dim) => (
          <motion.li key={dim.id} variants={itemVariants} className="text-muted-foreground text-sm">
            {dim.name}
          </motion.li>
        ))}
      </motion.ul>
    </article>
  );
}

export function DimensionWeights({
  db,
  weights,
}: {
  db: AppState;
  weights: Record<string, number>;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <section className="home-section py-12">
      <div className="mx-auto max-w-5xl px-4">
        <h2 className="mb-6 text-2xl font-semibold">Four categories, sixteen dimensions</h2>
        <div className="grid gap-6 md:grid-cols-2">
          {db.categories.map((category) => {
            const dims = db.dimensions.filter((d) => d.category_key === category.key);
            return (
              <CategoryBlock
                key={category.key}
                category={category}
                dimensions={dims}
                weight={weights[category.key] ?? 0}
                reduceMotion={reduceMotion}
              />
            );
          })}
        </div>
        <Button variant="outline" size="sm" className="mt-6" asChild>
          <Link to="/methodology">Read full methodology</Link>
        </Button>
      </div>
    </section>
  );
}
