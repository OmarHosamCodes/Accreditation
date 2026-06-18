import { animate, useInView, useMotionValue, useMotionValueEvent, useReducedMotion, useTransform } from "motion/react";
import { useEffect, useRef, useState } from "react";

export function AnimatedCounter({
  value,
  label,
  className,
}: {
  value: number;
  label: string;
  className?: string;
}) {
  const ref = useRef<HTMLParagraphElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const reduceMotion = useReducedMotion();
  const motionValue = useMotionValue(0);
  const display = useTransform(motionValue, (v) => Math.round(v));
  const [shown, setShown] = useState(reduceMotion ? value : 0);

  useEffect(() => {
    if (!inView) return;
    if (reduceMotion) {
      setShown(value);
      return;
    }
    const controls = animate(motionValue, value, { duration: 1.2, ease: [0.22, 1, 0.36, 1] });
    return () => controls.stop();
  }, [inView, value, motionValue, reduceMotion]);

  useMotionValueEvent(display, "change", (v) => {
    if (!reduceMotion) setShown(v);
  });

  return (
    <p ref={ref} className={className}>
      <strong className="font-mono text-lg tabular-nums">{shown}</strong> {label}
    </p>
  );
}
