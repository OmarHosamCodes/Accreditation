import {
  Building2,
  ClipboardList,
  ClipboardPen,
  ExternalLink,
  FileStack,
  LayoutDashboard,
  LogOut,
  Menu,
  Pin,
  Ruler,
  Scale,
  Settings,
  Users,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { cn } from "@/lib/utils";

type NavItem = { to: string; label: string; icon: React.ComponentType<{ className?: string }> };
type NavSection = { title: string; items: NavItem[] };

const navSections: NavSection[] = [
  {
    title: "Overview",
    items: [{ to: "/admin", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    title: "Work",
    items: [
      { to: "/admin/queue", label: "Queue", icon: ClipboardList },
      { to: "/admin/editor", label: "Audit editor", icon: ClipboardPen },
    ],
  },
  {
    title: "Records",
    items: [
      { to: "/admin/brands", label: "Brands", icon: Building2 },
      { to: "/admin/audits", label: "Audits", icon: FileStack },
      { to: "/admin/evidence", label: "Evidence", icon: Pin },
    ],
  },
  {
    title: "Configuration",
    items: [
      { to: "/admin/rubric", label: "Rubric", icon: Ruler },
      { to: "/admin/weights", label: "Weights", icon: Scale },
    ],
  },
  {
    title: "Team",
    items: [{ to: "/admin/users", label: "Users", icon: Users }],
  },
  {
    title: "System",
    items: [{ to: "/admin/settings", label: "Settings", icon: Settings }],
  },
];

function navClass(isActive: boolean) {
  return cn(
    "flex min-h-11 items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors md:min-h-9",
    "outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
    isActive ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
  );
}

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav aria-label="Admin" className="flex flex-1 flex-col gap-4 overflow-y-auto p-2">
      {navSections.map((section) => (
        <div key={section.title}>
          <p className="text-muted-foreground mb-1 px-3 text-[10px] font-medium tracking-wider uppercase">{section.title}</p>
          <div className="flex flex-col gap-0.5">
            {section.items.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === "/admin"}
                onClick={onNavigate}
                className={({ isActive }) => navClass(isActive)}
              >
                <Icon className="size-4 shrink-0" />
                {label}
              </NavLink>
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}

function SidebarFooter({ user, onLogout }: { user: string; onLogout: () => void }) {
  return (
    <div className="flex flex-col gap-1 border-t border-sidebar-border p-2">
      <Button variant="ghost" className="justify-start" asChild>
        <Link to="/">
          <ExternalLink className="size-4" />
          View public site
        </Link>
      </Button>
      <Button variant="ghost" className="justify-start" onClick={onLogout}>
        <LogOut className="size-4" />
        Log out
      </Button>
      <p className="text-muted-foreground truncate px-3 py-2 text-xs">Signed in as {user}</p>
    </div>
  );
}

export function AdminShell({ breadcrumbs }: { breadcrumbs?: ReactNode }) {
  const { user, logout } = useAdminAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen">
      <aside className="bg-sidebar text-sidebar-foreground hidden w-60 shrink-0 flex-col border-r md:flex">
        <div className="border-b border-sidebar-border p-4">
          <div className="flex items-center gap-2 font-semibold">
            <span className="bg-primary text-primary-foreground flex size-7 items-center justify-center rounded-md text-sm font-bold">A</span>
            The Accreditation
          </div>
          <p className="text-muted-foreground mt-1 font-mono text-[10px] tracking-wider uppercase">Audit Bureau · Admin</p>
        </div>
        <SidebarNav />
        <SidebarFooter user={user} onLogout={() => void logout()} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="bg-background flex h-14 items-center gap-3 border-b px-4 md:hidden">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="size-11 shrink-0" aria-label="Open admin menu">
                <Menu />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="bg-sidebar flex w-full max-w-xs flex-col p-0">
              <SheetHeader className="border-b border-sidebar-border p-4 text-left">
                <SheetTitle>Admin menu</SheetTitle>
              </SheetHeader>
              <SidebarNav onNavigate={() => setMobileOpen(false)} />
              <SidebarFooter user={user} onLogout={() => void logout()} />
            </SheetContent>
          </Sheet>
          <span className="truncate font-semibold">Admin</span>
        </header>

        <main className="flex-1 overflow-auto p-4 sm:p-6">
          {breadcrumbs && <div className="text-muted-foreground mb-4 text-sm">{breadcrumbs}</div>}
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export function AdminBreadcrumbs({ items }: { items: Array<{ label: string; to?: string }> }) {
  return (
    <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1 text-sm">
      {items.map((item, i) => (
        <span key={item.label} className="inline-flex items-center gap-1">
          {i > 0 && <Separator orientation="vertical" className="mx-1 h-4" />}
          {item.to ? (
            <Link
              to={item.to}
              className="rounded-sm underline-offset-4 outline-none hover:text-foreground hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              {item.label}
            </Link>
          ) : (
            <span className="text-foreground font-medium">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
