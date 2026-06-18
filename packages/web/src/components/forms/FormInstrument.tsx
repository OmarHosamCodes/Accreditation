import { AlertCircle, Check } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";
import { Label } from "@/components/ui/label";
import { springSnappy } from "@/components/home/motion-config";
import type { FieldState } from "./validators";

export function fieldControlClass(state: FieldState): string {
  switch (state) {
    case "valid":
      return "border-chart-2/70 focus-visible:border-chart-2 focus-visible:ring-chart-2/25";
    case "invalid":
      return "border-destructive focus-visible:border-destructive focus-visible:ring-destructive/25";
    default:
      return "";
  }
}

export function FormReadinessMeter({
  met,
  total,
  ratio,
  label = "requirements met",
}: {
  met: number;
  total: number;
  ratio: number;
  label?: string;
}) {
  const reduceMotion = useReducedMotion();
  const pct = Math.round(ratio * 100);

  return (
    <div className="mb-6 space-y-2" aria-live="polite" aria-atomic="true">
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="text-muted-foreground">
          <span className="text-foreground font-medium tabular-nums">{met}</span>
          {" of "}
          <span className="tabular-nums">{total}</span>
          {" "}
          {label}
        </span>
        <span className="text-muted-foreground font-mono text-xs tabular-nums">{pct}%</span>
      </div>
      <div
        className="bg-secondary h-1.5 overflow-hidden rounded-full"
        role="progressbar"
        aria-valuenow={met}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-label={`${met} of ${total} ${label}`}
      >
        <motion.div
          className="bg-primary h-full rounded-full"
          initial={false}
          animate={{ width: `${pct}%` }}
          transition={reduceMotion ? { duration: 0 } : springSnappy}
        />
      </div>
    </div>
  );
}

export function ValidatedField({
  id,
  label,
  hint,
  state,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  state: FieldState;
  error?: string | null;
  children: ReactNode;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={id}>{label}</Label>
        <AnimatePresence mode="popLayout">
          {state === "valid" && (
            <motion.span
              key="valid"
              initial={reduceMotion ? false : { opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={reduceMotion ? undefined : { opacity: 0, scale: 0.8 }}
              transition={reduceMotion ? { duration: 0 } : springSnappy}
              className="text-chart-2 flex items-center gap-1 text-xs font-medium"
              aria-hidden="true"
            >
              <Check className="size-3.5" strokeWidth={2.5} />
            </motion.span>
          )}
          {state === "invalid" && (
            <motion.span
              key="invalid"
              initial={reduceMotion ? false : { opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={reduceMotion ? undefined : { opacity: 0, scale: 0.8 }}
              transition={reduceMotion ? { duration: 0 } : springSnappy}
              className="text-destructive flex items-center gap-1 text-xs font-medium"
              aria-hidden="true"
            >
              <AlertCircle className="size-3.5" strokeWidth={2.5} />
            </motion.span>
          )}
        </AnimatePresence>
      </div>
      {children}
      {hint && !error && <p className="text-muted-foreground text-xs">{hint}</p>}
      <AnimatePresence mode="wait">
        {error && (
          <motion.p
            key={error}
            id={`${id}-error`}
            role="alert"
            initial={reduceMotion ? false : { opacity: 0, y: -4, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={reduceMotion ? undefined : { opacity: 0, y: -4, height: 0 }}
            transition={reduceMotion ? { duration: 0 } : { duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="text-destructive text-xs"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

export function FormSuccessReveal({
  children,
  layoutId = "form-success",
}: {
  children: ReactNode;
  layoutId?: string;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      layoutId={layoutId}
      initial={reduceMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reduceMotion ? { duration: 0 } : springSnappy}
      className="bg-card border-border space-y-4 rounded-lg border p-5"
    >
      {children}
    </motion.div>
  );
}
