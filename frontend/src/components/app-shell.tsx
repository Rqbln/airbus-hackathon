"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FlaskConical, LayoutDashboard, Plane, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

const links = [
  { href: "/", label: "Flotte", icon: LayoutDashboard },
  { href: "/labo", label: "Labo ML", icon: FlaskConical },
  { href: "/roi", label: "ROI", icon: TrendingUp },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-[#071A2C] text-slate-100">
      <header className="border-b border-white/10 bg-[#071A2C]/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#0F62FE] to-[#38BDF8]">
              <Plane className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-[#38BDF8]">CorroTwin</p>
              <h1 className="text-lg font-semibold">Gestion corrosion aéronef</h1>
            </div>
          </div>
          <nav className="flex gap-2">
            {links.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-2 rounded-xl px-4 py-2 text-sm transition",
                  pathname === href || (href !== "/" && pathname.startsWith(href))
                    ? "bg-[#0F62FE] text-white"
                    : "text-slate-300 hover:bg-white/5 hover:text-white",
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
    </div>
  );
}
