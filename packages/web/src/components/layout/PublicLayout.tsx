import { Menu } from "lucide-react";
import { useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const navLinks = [
  { to: "/leaderboard", label: "Leaderboard" },
  { to: "/methodology", label: "Methodology" },
  { to: "/apply", label: "Apply" },
  { to: "/admin", label: "Auditor login", className: "text-muted-foreground" },
];

function NavItems({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <>
      {navLinks.map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              "hover:bg-accent rounded-md px-3 py-2 text-sm font-medium transition-colors",
              isActive ? "text-foreground" : "text-muted-foreground",
              link.className,
            )
          }
        >
          {link.label}
        </NavLink>
      ))}
      <Button asChild size="sm" className="ml-2">
        <Link to="/apply" onClick={onNavigate}>
          Get accredited
        </Link>
      </Button>
    </>
  );
}

export function PublicLayout() {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="bg-background/95 sticky top-0 z-50 border-b backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-4">
          <Link to="/" className="flex items-center gap-2 font-semibold">
            <span className="bg-primary text-primary-foreground flex size-7 items-center justify-center rounded-md text-sm font-bold">A</span>
            The Accreditation
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            <NavItems />
          </nav>
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="outline" size="icon" aria-label="Open menu">
                <Menu />
              </Button>
            </SheetTrigger>
            <SheetContent side="right">
              <SheetHeader>
                <SheetTitle>Menu</SheetTitle>
              </SheetHeader>
              <nav className="mt-6 flex flex-col gap-2">
                <NavItems onNavigate={() => setOpen(false)} />
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </header>
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="border-t py-8">
        <div className="mx-auto max-w-5xl px-4">
          <div className="mb-2 flex items-center gap-2 font-semibold">
            <span className="bg-primary text-primary-foreground flex size-6 items-center justify-center rounded text-xs font-bold">A</span>
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
