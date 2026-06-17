import type { AppState } from "@accreditation/shared";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { loadState } from "@/lib/api";
import { setDB } from "@/lib/state";

type AppDataContextValue = {
  db: AppState | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  updateDB: (state: AppState) => void;
};

const AppDataContext = createContext<AppDataContextValue | null>(null);

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [db, setDbState] = useState<AppState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const state = await loadState();
      setDB(state);
      setDbState(state);
    } catch {
      setError("Could not load Accreditation data. Please refresh or check the server.");
    } finally {
      setLoading(false);
    }
  }, []);

  const updateDB = useCallback((state: AppState) => {
    setDB(state);
    setDbState(state);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <AppDataContext.Provider value={{ db, loading, error, refresh, updateDB }}>
      {children}
    </AppDataContext.Provider>
  );
}

export function useAppData() {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error("useAppData must be used within AppDataProvider");
  return ctx;
}
