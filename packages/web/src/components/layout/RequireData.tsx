import { useAppData } from "@/contexts/AppDataContext";

export function LoadingScreen() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <p className="text-muted-foreground text-sm">Loading…</p>
    </div>
  );
}

export function ErrorScreen({ message }: { message: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center p-8">
      <p className="text-center text-sm">{message}</p>
    </div>
  );
}

export function RequireData({ children }: { children: React.ReactNode }) {
  const { db, loading, error } = useAppData();
  if (loading) return <LoadingScreen />;
  if (error || !db) return <ErrorScreen message={error ?? "No data"} />;
  return children;
}
