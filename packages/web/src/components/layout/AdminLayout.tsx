import { Navigate, Outlet, useLocation } from "react-router-dom";
import { AdminShell } from "@/components/admin/AdminShell";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { AdminLoginPage } from "@/pages/admin/AdminLoginPage";

export function AdminLayout() {
  const { isAuthed, isPending } = useAdminAuth();
  const location = useLocation();

  if (isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <p className="text-muted-foreground text-sm">Checking session…</p>
      </div>
    );
  }

  if (!isAuthed && location.pathname !== "/admin" && location.pathname !== "/admin/connect-extension") {
    return <Navigate to="/admin" replace />;
  }

  if (!isAuthed && location.pathname === "/admin/connect-extension") {
    return <Outlet />;
  }

  if (!isAuthed) {
    return <AdminLoginPage />;
  }

  return <AdminShell />;
}

export { AdminShell };
