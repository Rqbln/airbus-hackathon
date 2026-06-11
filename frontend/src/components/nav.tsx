"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plane, FlaskConical, Calculator, LayoutDashboard } from "lucide-react";

import { cn } from "@/lib/utils";
import { ApiStatus } from "@/components/api-status";

const LINKS = [
  { href: "/", label: "Flotte", icon: LayoutDashboard },
  { href: "/labo", label: "Labo ML", icon: FlaskConical },
  { href: "/roi", label: "ROI", icon: Calculator },
];

export function Nav() {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-7xl items-center gap-6 px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15">
            <Plane className="h-4 w-4 text-[#38BDF8]" />
          </span>
          <span className="gradient-text text-lg tracking-tight">CorroTwin</span>
        </Link>
        <nav className="flex items-center gap-1">
          {LINKS.map(({ href, label, icon: Icon }) => {
            const active =
              href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-colors",
                  active
                    ? "bg-primary/15 text-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto">
          <ApiStatus />
        </div>
      </div>
    </header>
  );
}
