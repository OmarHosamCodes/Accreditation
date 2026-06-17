import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { apiJSON, authHeader } from "@/lib/api";
import { setAdminCredentials, type AdminCredentials } from "@/lib/state";

type AdminAuthContextValue = {
  isAuthed: boolean;
  user: string;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
};

const AdminAuthContext = createContext<AdminAuthContextValue | null>(null);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [credentials, setCredentials] = useState<AdminCredentials>(null);

  const login = useCallback(async (username: string, password: string) => {
    setAdminCredentials({ user: username, pass: password });
    try {
      await apiJSON("/api/admin/login", {
        method: "POST",
        headers: authHeader(),
        body: "{}",
      });
      setCredentials({ user: username, pass: password });
    } catch {
      setAdminCredentials(null);
      setCredentials(null);
      throw new Error("Wrong credentials.");
    }
  }, []);

  const logout = useCallback(() => {
    setAdminCredentials(null);
    setCredentials(null);
  }, []);

  return (
    <AdminAuthContext.Provider
      value={{
        isAuthed: credentials !== null,
        user: credentials?.user ?? "Roaster",
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
