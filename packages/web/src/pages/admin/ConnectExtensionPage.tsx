import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { mintExtensionToken } from "@/lib/api";

declare global {
  interface Window {
    chrome?: {
      runtime?: {
        sendMessage: (
          extensionId: string,
          message: { type: string; token: string; user?: { name: string; email?: string; role?: string } },
          callback?: (response: unknown) => void,
        ) => void;
        lastError?: { message?: string };
      };
    };
  }
}

const extensionId = import.meta.env.VITE_EXTENSION_ID as string | undefined;

function sendTokenToExtension(token: string, user: { name: string; email?: string; role?: string }) {
  if (!extensionId || !window.chrome?.runtime?.sendMessage) {
    return Promise.reject(new Error("Extension messaging is unavailable. Set VITE_EXTENSION_ID and reload this page from a browser with the extension installed."));
  }

  return new Promise<void>((resolve, reject) => {
    window.chrome!.runtime!.sendMessage!(
      extensionId,
      { type: "accred-auth", token, user },
      () => {
        const error = window.chrome?.runtime?.lastError;
        if (error?.message) reject(new Error(error.message));
        else resolve();
      },
    );
  });
}

export function ConnectExtensionPage() {
  const { isAuthed, isPending, login } = useAdminAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isAuthed || isPending) return;

    let cancelled = false;
    setLoading(true);
    setError(null);
    setStatus("Connecting extension…");

    mintExtensionToken()
      .then(async (data) => {
        if (cancelled) return;
        const token = String(data.token || "");
        const user = data.user as { name: string; email?: string; role?: string } | undefined;
        if (!token) throw new Error("Server did not return an extension token.");
        await sendTokenToExtension(token, {
          name: user?.name || "Auditor",
          email: user?.email,
          role: user?.role,
        });
        if (cancelled) return;
        setStatus("Extension connected — you can close this tab and return to Instagram or Facebook.");
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setStatus(null);
        setError(err instanceof Error ? err.message : "Could not connect the extension.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isAuthed, isPending]);

  if (isPending) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <p className="text-muted-foreground text-sm">Checking session…</p>
      </div>
    );
  }

  if (!isAuthed) {
    return (
      <div className="mx-auto max-w-md space-y-6 py-10">
        <div className="space-y-2 text-center">
          <h1 className="text-xl font-semibold">Connect extension</h1>
          <p className="text-muted-foreground text-sm">Sign in on the website to link the Accreditation browser extension.</p>
        </div>
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ext_email">Email</Label>
            <Input id="ext_email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ext_pass">Password</Label>
            <Input id="ext_pass" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <Button
            className="w-full"
            disabled={loading}
            onClick={() => {
              setError(null);
              setLoading(true);
              void login(email, password)
                .catch(() => setError("Wrong credentials."))
                .finally(() => setLoading(false));
            }}
          >
            {loading ? "Signing in…" : "Sign in"}
          </Button>
        </div>
        <p className="text-center">
          <Link to="/admin" className="text-muted-foreground font-mono text-xs hover:underline">← Admin home</Link>
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md space-y-4 py-16 text-center">
      <h1 className="text-xl font-semibold">Connect extension</h1>
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : (
        <p className="text-muted-foreground text-sm">{status || "Connecting extension…"}</p>
      )}
      {!extensionId && (
        <p className="text-muted-foreground text-xs">Set VITE_EXTENSION_ID in the web env to enable automatic extension handoff.</p>
      )}
    </div>
  );
}

export function ConnectExtensionGate() {
  const { isPending } = useAdminAuth();
  if (isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <p className="text-muted-foreground text-sm">Checking session…</p>
      </div>
    );
  }
  return <ConnectExtensionPage />;
}
