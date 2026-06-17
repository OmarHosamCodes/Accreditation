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
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      await login(username, password);
      navigate("/admin/queue");
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
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="lg_user">Username</Label>
            <Input id="lg_user" autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lg_pass">Password</Label>
            <Input id="lg_pass" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <Button className="w-full" onClick={() => void handleLogin()} disabled={loading}>
            {loading ? "Signing in…" : "Sign in"}
          </Button>
          <p className="text-center">
            <Link to="/" className="text-muted-foreground font-mono text-xs hover:underline">← Back to public site</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
