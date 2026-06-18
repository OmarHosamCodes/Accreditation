import { Menu } from "lucide-react";
import { useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const primaryNavLinks = [
  { to: "/leaderboard", label: "Leaderboard" },
  { to: "/methodology", label: "Methodology" },
] as const;

const navLinkClass = (isActive: boolean, muted = false) =>
  cn(
    "inline-flex min-h-11 items-center rounded-md px-3 py-2 text-sm font-medium transition-colors md:min-h-9",
    "outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
    isActive
      ? "bg-accent text-accent-foreground"
      : muted
        ? "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
        : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
  );

function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <Link
      to="/"
      className={cn(
        "inline-flex items-center gap-2 rounded-md font-semibold outline-none",
        "focus-visible:ring-[3px] focus-visible:ring-ring/50",
        compact && "min-w-0",
      )}
    >
      <span
        className={cn(
          "bg-primary text-primary-foreground flex shrink-0 items-center justify-center rounded-md font-bold",
          compact ? "size-7 text-sm" : "size-7 text-sm",
        )}
        aria-hidden="true"
      >
        A
      </span>
      <span className={cn("truncate", compact && "hidden min-[420px]:inline")}>The Accreditation</span>
    </Link>
  );
}

function PrimaryCta({ onNavigate, className }: { onNavigate?: () => void; className?: string }) {
  return (
    <Button asChild size="sm" className={className}>
      <Link to="/apply" onClick={onNavigate}>
        Apply for audit
      </Link>
    </Button>
  );
}

function DesktopNav() {
  return (
    <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
      {primaryNavLinks.map((link) => (
        <NavLink key={link.to} to={link.to} className={({ isActive }) => navLinkClass(isActive)}>
          {link.label}
        </NavLink>
      ))}
      <NavLink
        to="/admin"
        className={({ isActive }) => cn(navLinkClass(isActive, true), "ml-2")}
      >
        Auditor login
      </NavLink>
      <PrimaryCta className="ml-2" />
    </nav>
  );
}

function MobileNav({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const close = () => onOpenChange(false);

  return (
    <div className="flex items-center gap-2 md:hidden">
      <PrimaryCta className="hidden min-[420px]:inline-flex" />
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetTrigger asChild>
          <Button variant="outline" size="icon" className="size-11 shrink-0" aria-label="Open navigation menu">
            <Menu />
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="flex w-full max-w-xs flex-col">
          <SheetHeader>
            <SheetTitle className="text-left text-base">Navigate</SheetTitle>
          </SheetHeader>
          <nav aria-label="Main" className="flex flex-1 flex-col gap-1">
            {primaryNavLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                onClick={close}
                className={({ isActive }) => navLinkClass(isActive)}
              >
                {link.label}
              </NavLink>
            ))}
            <Separator className="my-2" />
            <NavLink
              to="/admin"
              onClick={close}
              className={({ isActive }) => navLinkClass(isActive, true)}
            >
              Auditor login
            </NavLink>
          </nav>
          <PrimaryCta onNavigate={close} className="mt-auto w-full" />
        </SheetContent>
      </Sheet>
    </div>
  );
}

export function PublicLayout() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="bg-background/95 supports-[backdrop-filter]:bg-background/80 sticky top-0 z-50 border-b backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-3 px-4">
          <BrandMark compact />
          <DesktopNav />
          <MobileNav open={menuOpen} onOpenChange={setMenuOpen} />
        </div>
      </header>
      <main className="flex-1" id="main-content">
        <Outlet />
      </main>
      <footer className="border-t py-8">
        <div className="mx-auto max-w-5xl px-4">
          <div className="mb-2 flex items-center gap-2 font-semibold">
            <span className="bg-primary text-primary-foreground flex size-6 items-center justify-center rounded text-xs font-bold">
              A
            </span>
            The Accreditation
          </div>
          <p className="text-muted-foreground text-sm">
            An independent audit bureau for FB &amp; IG brand presence. Scores are opinions, formed rigorously.
          </p>
        </div>
      </footer>
    </div>
  );
}
