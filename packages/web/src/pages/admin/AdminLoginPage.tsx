import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAdminAuth } from "@/contexts/AdminAuthContext";

export function AdminLoginPage() {
  const { login } = useAdminAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!email || !password) {
      setError("Enter email and password.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      navigate("/admin");
    } catch {
      setError("Wrong credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <div className="mb-2 flex items-center justify-center gap-2 text-lg font-semibold">
            <span className="bg-primary text-primary-foreground flex size-7 items-center justify-center rounded-md text-sm font-bold">A</span>
            The Accreditation
          </div>
          <p className="text-muted-foreground text-sm">Auditor and admin sign-in</p>
        </div>
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <form className="space-y-4" onSubmit={(e) => void handleLogin(e)}>
          <div className="space-y-2">
            <Label htmlFor="lg_email">Email</Label>
            <Input
              id="lg_email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lg_pass">Password</Label>
            <Input
              id="lg_pass"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <Button className="w-full" type="submit" disabled={loading}>
            {loading ? "Signing in…" : "Sign in"}
          </Button>
          <p className="text-center">
            <Link to="/" className="text-muted-foreground rounded-sm text-xs underline-offset-4 outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50">
              ← Back to public site
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
