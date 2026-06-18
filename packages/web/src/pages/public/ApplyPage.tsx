import { useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "motion/react";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAppData } from "@/contexts/AppDataContext";
import { apiJSON } from "@/lib/api";
import type { AppState } from "@accreditation/shared";
import { springSnappy } from "@/components/home/motion-config";
import {
  fieldControlClass,
  FormReadinessMeter,
  FormSuccessReveal,
  ValidatedField,
} from "@/components/forms/FormInstrument";
import { useValidatedFields } from "@/components/forms/useValidatedFields";
import {
  validateBrandName,
  validateEmail,
  validateNiche,
  validateProfileUrl,
  validateWhy,
} from "@/components/forms/validators";

const applyValidators = {
  name: validateBrandName,
  url: validateProfileUrl,
  email: validateEmail,
  niche: validateNiche,
  why: validateWhy,
} as const;

export function ApplyPage() {
  const { updateDB } = useAppData();
  const reduceMotion = useReducedMotion();
  const [submitted, setSubmitted] = useState(false);
  const [brandName, setBrandName] = useState("");
  const [loading, setLoading] = useState(false);
  const [serverErrors, setServerErrors] = useState<string[]>([]);
  const [plat, setPlat] = useState("ig");
  const [hp, setHp] = useState("");

  const {
    values,
    errors,
    states,
    readiness,
    isValid,
    setValue,
    touch,
    touchAll,
  } = useValidatedFields(
    { name: "", url: "", email: "", niche: "", why: "" },
    applyValidators,
  );

  const submit = async () => {
    if (hp) return;
    touchAll();
    setServerErrors([]);
    if (!isValid) return;

    setLoading(true);
    try {
      const res = await apiJSON("/api/applications", {
        method: "POST",
        body: JSON.stringify({
          brandName: values.name,
          platform: plat,
          url: values.url,
          email: values.email,
          niche: values.niche,
          why: values.why,
          honeypot: hp,
        }),
      });
      if (res.state) updateDB(res.state as AppState);
      setBrandName(values.name);
      setSubmitted(true);
    } catch (e) {
      const err = e as { errors?: string[] };
      setServerErrors(err.errors ?? ["Could not submit application."]);
    } finally {
      setLoading(false);
    }
  };

  const showError = (key: keyof typeof applyValidators) =>
    (states[key] === "invalid" ? errors[key] : null);

  const readyToSubmit = readiness.ratio === 1 && isValid;

  return (
    <section className="py-10">
      <div className="mx-auto max-w-lg px-4">
        <h1 className="mb-2 text-3xl font-semibold">Submit your brand for audit</h1>
        <p className="text-muted-foreground mb-8">
          No account needed. We will review your application, run the 16-dimension audit, and publish a permanent, embeddable result, whatever the score.
        </p>

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

        <LayoutGroup id="apply-form">
          <AnimatePresence mode="wait">
            {submitted ? (
              <FormSuccessReveal key="success" layoutId="apply-surface">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="text-chart-2 mt-0.5 size-5 shrink-0" aria-hidden="true" />
                  <div className="space-y-2">
                    <p className="font-medium">Application received</p>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      <strong className="text-foreground">{brandName}</strong> is in the audit queue. Watch your inbox at{" "}
                      <span className="text-foreground">{values.email}</span>.
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link to="/leaderboard">View leaderboard</Link>
                </Button>
              </FormSuccessReveal>
            ) : (
              <motion.div
                key="form"
                layoutId="apply-surface"
                className="bg-card border-border rounded-lg border p-5"
                transition={reduceMotion ? { duration: 0 } : springSnappy}
              >
                <FormReadinessMeter met={readiness.met} total={readiness.total} ratio={readiness.ratio} />

                <div className="space-y-4">
                  <ValidatedField
                    id="ap_name"
                    label="Brand name"
                    state={states.name}
                    error={showError("name")}
                  >
                    <Input
                      id="ap_name"
                      placeholder="e.g. Your Brand"
                      value={values.name}
                      onChange={(e) => setValue("name", e.target.value)}
                      onBlur={() => touch("name")}
                      className={fieldControlClass(states.name)}
                      aria-invalid={states.name === "invalid"}
                      aria-describedby={showError("name") ? "ap_name-error" : undefined}
                    />
                  </ValidatedField>

                  <div className="space-y-2">
                    <Label htmlFor="ap_plat">Platform</Label>
                    <Select value={plat} onValueChange={setPlat}>
                      <SelectTrigger id="ap_plat" className={fieldControlClass("valid")}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ig">Instagram</SelectItem>
                        <SelectItem value="fb">Facebook</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <ValidatedField
                    id="ap_url"
                    label="Profile URL"
                    hint="Must be a facebook.com or instagram.com link."
                    state={states.url}
                    error={showError("url")}
                  >
                    <Input
                      id="ap_url"
                      placeholder="https://instagram.com/yourbrand"
                      value={values.url}
                      onChange={(e) => setValue("url", e.target.value)}
                      onBlur={() => touch("url")}
                      className={fieldControlClass(states.url)}
                      aria-invalid={states.url === "invalid"}
                      aria-describedby={showError("url") ? "ap_url-error" : undefined}
                    />
                  </ValidatedField>

                  <ValidatedField
                    id="ap_email"
                    label="Contact email"
                    state={states.email}
                    error={showError("email")}
                  >
                    <Input
                      id="ap_email"
                      type="email"
                      placeholder="you@brand.com"
                      value={values.email}
                      onChange={(e) => setValue("email", e.target.value)}
                      onBlur={() => touch("email")}
                      className={fieldControlClass(states.email)}
                      aria-invalid={states.email === "invalid"}
                      aria-describedby={showError("email") ? "ap_email-error" : undefined}
                    />
                  </ValidatedField>

                  <ValidatedField
                    id="ap_niche"
                    label="Niche"
                    state={states.niche}
                    error={showError("niche")}
                  >
                    <Input
                      id="ap_niche"
                      placeholder="e.g. D2C skincare"
                      value={values.niche}
                      onChange={(e) => setValue("niche", e.target.value)}
                      onBlur={() => touch("niche")}
                      className={fieldControlClass(states.niche)}
                      aria-invalid={states.niche === "invalid"}
                      aria-describedby={showError("niche") ? "ap_niche-error" : undefined}
                    />
                  </ValidatedField>

                  <ValidatedField
                    id="ap_why"
                    label="Why do you want the accreditation?"
                    state={states.why}
                    error={showError("why")}
                  >
                    <Textarea
                      id="ap_why"
                      placeholder="Tell us what you are hoping it proves…"
                      value={values.why}
                      onChange={(e) => setValue("why", e.target.value)}
                      onBlur={() => touch("why")}
                      className={fieldControlClass(states.why)}
                      aria-invalid={states.why === "invalid"}
                      aria-describedby={showError("why") ? "ap_why-error" : undefined}
                    />
                  </ValidatedField>

                  <input
                    className="hidden"
                    tabIndex={-1}
                    autoComplete="off"
                    value={hp}
                    onChange={(e) => setHp(e.target.value)}
                    aria-hidden
                  />

                  <motion.div
                    animate={readyToSubmit && !loading && !reduceMotion ? { scale: [1, 1.015, 1] } : { scale: 1 }}
                    transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <Button
                      onClick={() => void submit()}
                      disabled={loading}
                      className="w-full sm:w-auto"
                    >
                      {loading ? "Submitting…" : "Submit application"}
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
