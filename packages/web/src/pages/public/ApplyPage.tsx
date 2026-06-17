import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAppData } from "@/contexts/AppDataContext";
import { apiJSON } from "@/lib/api";
import type { AppState } from "@accreditation/shared";

export function ApplyPage() {
  const { updateDB } = useAppData();
  const [submitted, setSubmitted] = useState(false);
  const [brandName, setBrandName] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    plat: "ig",
    url: "",
    email: "",
    niche: "",
    why: "",
    hp: "",
  });

  const submit = async () => {
    if (form.hp) return;
    const errs: string[] = [];
    if (form.name.length < 2 || form.name.length > 80) errs.push("Brand name looks off.");
    if (!/^https?:\/\/(www\.)?(facebook|instagram)\.com\//i.test(form.url)) errs.push("Profile URL must be a facebook.com or instagram.com link.");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email)) errs.push("Enter a valid email.");
    if (form.niche.length < 2) errs.push("Tell us your niche.");
    if (form.why.length < 10) errs.push("Give us a sentence on why you want it.");
    if (errs.length) {
      setErrors(errs);
      return;
    }
    setErrors([]);
    setLoading(true);
    try {
      const res = await apiJSON("/api/applications", {
        method: "POST",
        body: JSON.stringify({
          brandName: form.name,
          platform: form.plat,
          url: form.url,
          email: form.email,
          niche: form.niche,
          why: form.why,
          honeypot: form.hp,
        }),
      });
      if (res.state) updateDB(res.state as AppState);
      setBrandName(form.name);
      setSubmitted(true);
    } catch (e) {
      const err = e as { errors?: string[] };
      setErrors(err.errors ?? ["Could not submit application."]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="py-10">
      <div className="mx-auto max-w-lg px-4">
        <h1 className="mb-2 text-3xl font-semibold">Submit your brand for audit</h1>
        <p className="text-muted-foreground mb-8">
          No account needed. We will review your application, run the 16-dimension audit, and publish a permanent, embeddable result, whatever the score.
        </p>
        {errors.length > 0 && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>
              <ul className="list-disc pl-4">
                {errors.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}
        {submitted ? (
          <div className="space-y-4">
            <Alert>
              <AlertDescription>
                Application received for <strong>{brandName}</strong>. It is now in the audit queue. Watch your inbox at {form.email}.
              </AlertDescription>
            </Alert>
            <Button variant="outline" size="sm" asChild>
              <Link to="/leaderboard">View leaderboard</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ap_name">Brand name</Label>
              <Input id="ap_name" placeholder="e.g. Your Brand" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ap_plat">Platform</Label>
              <Select value={form.plat} onValueChange={(v) => setForm({ ...form, plat: v })}>
                <SelectTrigger id="ap_plat"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ig">Instagram</SelectItem>
                  <SelectItem value="fb">Facebook</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ap_url">Profile URL</Label>
              <Input id="ap_url" placeholder="https://instagram.com/yourbrand" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} />
              <p className="text-muted-foreground text-xs">Must be a facebook.com or instagram.com link.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ap_email">Contact email</Label>
              <Input id="ap_email" type="email" placeholder="you@brand.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ap_niche">Niche</Label>
              <Input id="ap_niche" placeholder="e.g. D2C skincare" value={form.niche} onChange={(e) => setForm({ ...form, niche: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ap_why">Why do you want the accreditation?</Label>
              <Textarea id="ap_why" placeholder="Tell us what you are hoping it proves…" value={form.why} onChange={(e) => setForm({ ...form, why: e.target.value })} />
            </div>
            <input className="hidden" tabIndex={-1} autoComplete="off" value={form.hp} onChange={(e) => setForm({ ...form, hp: e.target.value })} aria-hidden />
            <Button onClick={() => void submit()} disabled={loading}>
              {loading ? "Submitting…" : "Submit application"}
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
