import { tierFor } from "@accreditation/shared";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAppData } from "@/contexts/AppDataContext";
import { apiJSON } from "@/lib/api";
import { brandById } from "@/lib/state";
import type { AppState } from "@accreditation/shared";
import { Clock } from "lucide-react";

export function ReauditPage() {
  const { id } = useParams();
  const { db, updateDB } = useAppData();
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!db || !id) return null;
  const auditId = parseInt(id, 10);
  const audit = db.audits.find((x) => x.id === auditId && x.status === "published");
  if (!audit) {
    return (
      <section className="py-20 text-center">
        <h1 className="mb-4 text-3xl font-semibold">404</h1>
        <p className="text-muted-foreground mb-6">Can&apos;t request a re-audit for that.</p>
        <Button asChild><Link to="/">Home</Link></Button>
      </section>
    );
  }

  const brand = brandById(db, audit.brand_id)!;
  const days = Math.floor((Date.now() - (audit.published_at ?? 0)) / 86400000);
  const eligible = days >= 30;

  const submit = async () => {
    const errs: string[] = [];
    if (days < 30) errs.push("Too soon: 30-day cooldown applies.");
    if (email.trim().toLowerCase() !== brand.contact_email.toLowerCase()) errs.push("Email must match the one on the original audit.");
    if (note.trim().length < 15) errs.push("Tell us what changed (a real sentence).");
    if (errs.length) {
      setErrors(errs);
      return;
    }
    setErrors([]);
    setLoading(true);
    try {
      const res = await apiJSON("/api/reaudits", {
        method: "POST",
        body: JSON.stringify({ auditId, email, changesNote: note }),
      });
      if (res.state) updateDB(res.state as AppState);
      setSubmitted(true);
    } catch (e) {
      const err = e as { errors?: string[] };
      setErrors(err.errors ?? ["Could not request re-audit."]);
    } finally {
      setLoading(false);
    }
  };

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
        {!eligible && (
          <Alert variant="destructive" className="mb-4">
            <Clock className="size-4" />
            <AlertDescription>
              Re-audits open 30 days after the last publish. You can request again in {30 - days} day{30 - days === 1 ? "" : "s"}.
            </AlertDescription>
          </Alert>
        )}
        {errors.length > 0 && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>
              <ul className="list-disc pl-4">{errors.map((e) => <li key={e}>{e}</li>)}</ul>
            </AlertDescription>
          </Alert>
        )}
        {submitted ? (
          <Alert>
            <AlertDescription>
              Re-audit requested for <strong>{brand.name}</strong>. It is back in the queue.
            </AlertDescription>
          </Alert>
        ) : (
          <div className={`space-y-4 ${!eligible ? "pointer-events-none opacity-45" : ""}`}>
            <div className="space-y-2">
              <Label htmlFor="ra_email">Contact email (must match the original)</Label>
              <Input id="ra_email" type="email" placeholder={brand.contact_email} value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ra_note">What did you change?</Label>
              <Textarea id="ra_note" placeholder="Walk us through what has improved since the last audit…" value={note} onChange={(e) => setNote(e.target.value)} />
              <p className="text-muted-foreground text-xs">Required. We will not re-score a feed that has not changed.</p>
            </div>
            <Button onClick={() => void submit()} disabled={loading || !eligible}>
              {loading ? "Submitting…" : "Request re-audit"}
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
