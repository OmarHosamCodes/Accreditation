import type { Transition, Variants } from "motion/react";

export const springSnappy = { type: "spring" as const, stiffness: 400, damping: 30 };
export const springSmooth = { type: "spring" as const, stiffness: 260, damping: 28 };
export const springCounter = { type: "spring" as const, stiffness: 120, damping: 20 };

export const staggerFast = 0.05;
export const staggerDelay = 0.1;

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0 },
};

export const fadeUpTransition = (reduceMotion: boolean | null): Transition =>
  reduceMotion ? { duration: 0 } : { duration: 0.15, ease: [0.22, 1, 0.36, 1] };

export const listStagger: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: staggerFast,
      delayChildren: staggerDelay,
    },
  },
};

export const listItem: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.2, ease: [0.22, 1, 0.36, 1] } },
};

export function listVariants(reduceMotion: boolean | null): Variants {
  if (reduceMotion) {
    return {
      hidden: {},
      visible: {},
    };
  }
  return listStagger;
}

export function listItemVariants(reduceMotion: boolean | null): Variants {
  if (reduceMotion) {
    return {
      hidden: { opacity: 1, y: 0 },
      visible: { opacity: 1, y: 0 },
    };
  }
  return listItem;
}
