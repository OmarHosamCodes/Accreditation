import { createContext, useCallback, useContext, type ReactNode } from "react";
import { authClient } from "@/lib/auth-client";

type AdminAuthContextValue = {
  isAuthed: boolean;
  isPending: boolean;
  user: string;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AdminAuthContext = createContext<AdminAuthContextValue | null>(null);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const { data: session, isPending } = authClient.useSession();

  const login = useCallback(async (email: string, password: string) => {
    const result = await authClient.signIn.email({ email, password });
    if (result.error) {
      throw new Error(result.error.message || "Wrong credentials.");
    }
  }, []);

  const logout = useCallback(async () => {
    await authClient.signOut();
  }, []);

  return (
    <AdminAuthContext.Provider
      value={{
        isAuthed: Boolean(session?.user),
        isPending,
        user: session?.user.name || session?.user.email || "Auditor",
        login,
        logout,
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error("useAdminAuth must be used within AdminAuthProvider");
  return ctx;
}
