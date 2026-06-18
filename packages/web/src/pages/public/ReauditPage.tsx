import { tierFor } from "@accreditation/shared";
import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "motion/react";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAppData } from "@/contexts/AppDataContext";
import { apiJSON } from "@/lib/api";
import { brandById } from "@/lib/state";
import type { AppState } from "@accreditation/shared";
import { springSnappy } from "@/components/home/motion-config";
import { CooldownRing } from "@/components/forms/CooldownRing";
import {
  fieldControlClass,
  FormReadinessMeter,
  FormSuccessReveal,
  ValidatedField,
} from "@/components/forms/FormInstrument";
import { useValidatedFields } from "@/components/forms/useValidatedFields";
import { validateChangesNote, validateReauditEmail } from "@/components/forms/validators";

export function ReauditPage() {
  const { id } = useParams();
  const { db, updateDB } = useAppData();
  const reduceMotion = useReducedMotion();
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [serverErrors, setServerErrors] = useState<string[]>([]);

  const auditId = id ? parseInt(id, 10) : NaN;
  const audit = db?.audits.find((x) => x.id === auditId && x.status === "published");
  const brand = audit && db ? brandById(db, audit.brand_id) : undefined;
  const contactEmail = brand?.contact_email ?? "";

  const validators = useMemo(
    () => ({
      email: (value: string) => validateReauditEmail(value, contactEmail),
      note: validateChangesNote,
    }),
    [contactEmail],
  );

  const {
    values,
    errors,
    states,
    readiness,
    isValid,
    setValue,
    touch,
    touchAll,
  } = useValidatedFields({ email: "", note: "" }, validators);

  if (!db || !id) return null;
  if (!audit || !brand) {
    return (
      <section className="py-20 text-center">
        <h1 className="mb-4 text-3xl font-semibold">404</h1>
        <p className="text-muted-foreground mb-6">Can&apos;t request a re-audit for that.</p>
        <Button asChild><Link to="/">Home</Link></Button>
      </section>
    );
  }

  const publishedAt = audit.published_at ?? 0;
  const days = Math.floor((Date.now() - publishedAt) / 86_400_000);
  const eligible = days >= 30;

  const submit = async () => {
    touchAll();
    setServerErrors([]);
    if (!eligible) {
      setServerErrors(["Too soon: 30-day cooldown applies."]);
      return;
    }
    if (!isValid) return;

    setLoading(true);
    try {
      const res = await apiJSON("/api/reaudits", {
        method: "POST",
        body: JSON.stringify({ auditId, email: values.email, changesNote: values.note }),
      });
      if (res.state) updateDB(res.state as AppState);
      setSubmitted(true);
    } catch (e) {
      const err = e as { errors?: string[] };
      setServerErrors(err.errors ?? ["Could not request re-audit."]);
    } finally {
      setLoading(false);
    }
  };

  const showError = (key: "email" | "note") =>
    (states[key] === "invalid" ? errors[key] : null);

  const readyToSubmit = eligible && readiness.ratio === 1 && isValid;

  return (
    <section className="py-10">
      <div className="mx-auto max-w-lg px-4">
        <Button variant="ghost" size="sm" className="mb-6" asChild>
          <Link to={`/audit/${audit.id}`}>← Back to audit</Link>
        </Button>
        <h1 className="mb-2 text-3xl font-semibold">Request a re-audit for {brand.name}</h1>
        <p className="text-muted-foreground mb-6">
          Current: {audit.overall_score}/100 ({tierFor(audit.overall_score).name}), audited {days} day{days === 1 ? "" : "s"} ago.
        </p>

        <CooldownRing publishedAt={publishedAt} brandName={brand.name} className="mb-6" />

        {serverErrors.length > 0 && (
          <div
            role="alert"
            className="bg-destructive/10 text-destructive border-destructive/30 mb-4 rounded-lg border px-4 py-3 text-sm"
          >
            <ul className="list-disc pl-4">
              {serverErrors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          </div>
        )}

        <LayoutGroup id="reaudit-form">
          <AnimatePresence mode="wait">
            {submitted ? (
              <FormSuccessReveal key="success" layoutId="reaudit-surface">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="text-chart-2 mt-0.5 size-5 shrink-0" aria-hidden="true" />
                  <div className="space-y-2">
                    <p className="font-medium">Re-audit requested</p>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      <strong className="text-foreground">{brand.name}</strong> is back in the queue.
                    </p>
                  </div>
                </div>
              </FormSuccessReveal>
            ) : (
              <motion.div
                key="form"
                layoutId="reaudit-surface"
                className={`bg-card border-border rounded-lg border p-5 ${!eligible ? "pointer-events-none opacity-45" : ""}`}
                transition={reduceMotion ? { duration: 0 } : springSnappy}
              >
                <FormReadinessMeter
                  met={readiness.met}
                  total={readiness.total}
                  ratio={readiness.ratio}
                  label="fields complete"
                />

                <div className="space-y-4">
                  <ValidatedField
                    id="ra_email"
                    label="Contact email (must match the original)"
                    state={states.email}
                    error={showError("email")}
                  >
                    <Input
                      id="ra_email"
                      type="email"
                      placeholder={brand.contact_email}
                      value={values.email}
                      onChange={(e) => setValue("email", e.target.value)}
                      onBlur={() => touch("email")}
                      className={fieldControlClass(states.email)}
                      aria-invalid={states.email === "invalid"}
                      aria-describedby={showError("email") ? "ra_email-error" : undefined}
                      disabled={!eligible}
                    />
                  </ValidatedField>

                  <ValidatedField
                    id="ra_note"
                    label="What did you change?"
                    hint="Required. We will not re-score a feed that has not changed."
                    state={states.note}
                    error={showError("note")}
                  >
                    <Textarea
                      id="ra_note"
                      placeholder="Walk us through what has improved since the last audit…"
                      value={values.note}
                      onChange={(e) => setValue("note", e.target.value)}
                      onBlur={() => touch("note")}
                      className={fieldControlClass(states.note)}
                      aria-invalid={states.note === "invalid"}
                      aria-describedby={showError("note") ? "ra_note-error" : undefined}
                      disabled={!eligible}
                    />
                  </ValidatedField>

                  <motion.div
                    animate={readyToSubmit && !loading && !reduceMotion ? { scale: [1, 1.015, 1] } : { scale: 1 }}
                    transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <Button
                      onClick={() => void submit()}
                      disabled={loading || !eligible}
                      className="w-full sm:w-auto"
                    >
                      {loading ? "Submitting…" : "Request re-audit"}
                    </Button>
                  </motion.div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </LayoutGroup>
      </div>
    </section>
  );
}
