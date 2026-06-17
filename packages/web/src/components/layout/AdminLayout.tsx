import {
  ExternalLink,
  Inbox,
  LogOut,
  Ruler,
  Scale,
  Settings2,
  Users,
} from "lucide-react";
import { Link, NavLink, Navigate, Outlet, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { cn } from "@/lib/utils";
import { AdminLoginPage } from "@/pages/admin/AdminLoginPage";

const adminNav = [
  { to: "/admin/queue", label: "Queue", icon: Inbox },
  { to: "/admin/editor", label: "Audit editor", icon: Settings2 },
  { to: "/admin/rubric", label: "Rubric manager", icon: Ruler },
  { to: "/admin/weights", label: "Weights", icon: Scale },
  { to: "/admin/users", label: "Users", icon: Users },
];

export function AdminLayout() {
  const { isAuthed, user, logout } = useAdminAuth();
  const location = useLocation();

  if (!isAuthed && location.pathname !== "/admin") {
    return <Navigate to="/admin" replace />;
  }

  if (!isAuthed) {
    return <AdminLoginPage />;
  }

  return (
    <div className="flex min-h-screen">
      <aside className="bg-card hidden w-56 shrink-0 flex-col border-r md:flex">
        <div className="border-b p-4">
          <div className="flex items-center gap-2 font-semibold">
            <span className="bg-primary text-primary-foreground flex size-7 items-center justify-center rounded-md text-sm font-bold">A</span>
            The Accreditation
          </div>
          <p className="text-muted-foreground mt-1 font-mono text-[10px] tracking-wider uppercase">Audit Bureau · Admin</p>
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-2">
          {adminNav.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                  isActive ? "bg-accent text-accent-foreground font-medium" : "text-muted-foreground hover:bg-accent/50",
                )
              }
            >
              <Icon className="size-4" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="flex flex-col gap-1 border-t p-2">
          <Button variant="ghost" className="justify-start" asChild>
            <Link to="/">
              <ExternalLink className="size-4" />
              View public site
            </Link>
          </Button>
          <Button variant="ghost" className="justify-start" onClick={logout}>
            <LogOut className="size-4" />
            Log out
          </Button>
          <p className="text-muted-foreground px-3 py-2 text-xs">Signed in as {user}</p>
        </div>
      </aside>
      <main className="flex-1 overflow-auto p-6">
        <Outlet />
      </main>
    </div>
  );
}
