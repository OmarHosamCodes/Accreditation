import { TIERS } from "@accreditation/shared";
import {
  AnimatePresence,
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useTransform,
} from "motion/react";
import { useRef, useState } from "react";
import { springSmooth } from "./motion-config";

const TIER_COPY: Record<string, string> = {
  plat: "Top-tier presence. The badge is earned, not bought.",
  gld: "Strong fundamentals with room to polish the edges.",
  slv: "Solid baseline. Nothing embarrassing, nothing exceptional.",
  brz: "Passing grade. Your competitors are not impressed.",
  roast: "Below 60. The auditors have notes.",
};

function tierRange(index: number): string {
  const tier = TIERS[index]!;
  if (tier.key === "roast") return "Below 60";
  if (tier.key === "plat") return `${tier.min}+`;
  const prev = TIERS[index - 1];
  return `${tier.min}–${prev ? prev.min - 1 : 99}`;
}

const DISPLAY_TIERS = [...TIERS].reverse();

function bandWidth(index: number): number {
  const tier = DISPLAY_TIERS[index]!;
  const nextTier = DISPLAY_TIERS[index + 1];
  if (!nextTier) return 100 - tier.min;
  return nextTier.min - tier.min;
}

function TierSpectrum({ activeIndex }: { activeIndex: number }) {
  const displayActive = activeIndex < 0 ? -1 : TIERS.length - 1 - activeIndex;

  return (
    <div className="home-tier-spectrum" role="img" aria-label="Score tier spectrum from 0 to 100">
      <div className="home-tier-spectrum__track">
        {DISPLAY_TIERS.map((tier, i) => (
          <div
            key={tier.key}
            className="home-tier-spectrum__band"
            style={{
              width: `${bandWidth(i)}%`,
              backgroundColor: tier.col,
              opacity: displayActive < 0 || i === displayActive ? 1 : 0.45,
            }}
          />
        ))}
      </div>
      <div className="home-tier-spectrum__scale">
        <span>0</span>
        <span>60</span>
        <span>70</span>
        <span>80</span>
        <span>90</span>
        <span>100</span>
      </div>
    </div>
  );
}

function StaticTierOverview() {
  return (
    <div className="home-tier-static">
      <TierSpectrum activeIndex={-1} />
      <ul className="home-tier-static__list">
        {TIERS.map((tier, i) => (
          <li key={tier.key} className="home-tier-static__item">
            <span className="home-tier-static__dot" style={{ backgroundColor: tier.col }} />
            <div>
              <span className="font-medium">{tier.name}</span>
              <span className="text-muted-foreground ml-2 font-mono text-sm">{tierRange(i)}</span>
              <p className="text-muted-foreground mt-1 text-sm">{TIER_COPY[tier.key]}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function TierScrollWalkthrough() {
  const sectionRef = useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  });
  const tierProgress = useTransform(scrollYProgress, [0, 1], [0, TIERS.length - 1]);
  const [activeIndex, setActiveIndex] = useState(0);

  useMotionValueEvent(tierProgress, "change", (v) => {
    setActiveIndex(Math.min(TIERS.length - 1, Math.max(0, Math.round(v))));
  });

  const activeTier = TIERS[activeIndex]!;

  if (reduceMotion) {
    return (
      <section className="home-section border-b py-12">
        <div className="mx-auto max-w-5xl px-4">
          <h2 className="mb-6 text-2xl font-semibold">Five outcomes. No participation trophies.</h2>
          <StaticTierOverview />
        </div>
      </section>
    );
  }

  return (
    <section ref={sectionRef} className="home-tier-scroll relative">
      <div className="home-tier-scroll__sticky">
        <div className="mx-auto max-w-5xl px-4">
          <h2 className="mb-8 text-2xl font-semibold">Five outcomes. No participation trophies.</h2>

          <TierSpectrum activeIndex={activeIndex} />

          <div className="home-tier-scroll__detail mt-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTier.key}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={springSmooth}
              >
                <div className="flex items-baseline gap-3">
                  <span
                    className="size-3 shrink-0 rounded-full"
                    style={{ backgroundColor: activeTier.col }}
                  />
                  <h3 className="text-xl font-semibold">{activeTier.name}</h3>
                  <span className="font-mono text-muted-foreground text-sm">{tierRange(activeIndex)}</span>
                </div>
                <p className="text-muted-foreground mt-3 max-w-xl text-base">{TIER_COPY[activeTier.key]}</p>
              </motion.div>
            </AnimatePresence>

            <div className="home-tier-scroll__dots mt-8" aria-hidden="true">
              {TIERS.map((tier, i) => (
                <span
                  key={tier.key}
                  className="home-tier-scroll__dot"
                  data-active={i === activeIndex}
                  style={{ backgroundColor: tier.col }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
