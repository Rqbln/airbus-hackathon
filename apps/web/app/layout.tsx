import "./globals.css";
import Link from "next/link";
import type { Metadata } from "next";
import {
  IconDashboard,
  IconPlane,
  IconCpu,
  IconFile,
} from "@/components/ui/Icons";

export const metadata: Metadata = {
  title: "HAKS 2026 — Corrosion Risk Operations",
  description:
    "Airbus × IBM × AWS — corrosion risk scoring and inspection prioritization dashboard.",
};

const NAV: { href: string; label: string; sub: string; Icon: typeof IconDashboard }[] = [
  { href: "/", label: "Operations", sub: "Fleet overview", Icon: IconDashboard },
  { href: "/aircraft", label: "Aircraft", sub: "Risk timeline", Icon: IconPlane },
  { href: "/insights", label: "Model", sub: "Validation + drivers", Icon: IconCpu },
  { href: "/submission", label: "Submission", sub: "Robust vs experimental", Icon: IconFile },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen text-fg">
        <div className="flex min-h-screen">
          {/* === Sidebar === */}
          <aside className="hidden lg:flex w-60 shrink-0 flex-col border-r border-line bg-ink-1/80 backdrop-blur-sm">
            <div className="px-5 pt-5 pb-4 border-b border-line">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded grid place-items-center bg-brand/15 border border-brand/40">
                  <span className="mono text-brand-bright text-[11px] font-bold">HK</span>
                </div>
                <div>
                  <div className="text-2xs uppercase tracking-widest text-fg-faint leading-none">
                    HAKS · 2026
                  </div>
                  <div className="text-sm font-semibold leading-tight mt-1">Corrosion Ops</div>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2 text-2xs tracking-widest text-fg-faint uppercase">
                <span className="w-1.5 h-1.5 rounded-full bg-risk-low pulse-dot" />
                <span>Live · models loaded</span>
              </div>
            </div>

            <nav className="flex-1 px-3 py-3 space-y-1">
              {NAV.map(({ href, label, sub, Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className="group flex items-start gap-3 px-3 py-2.5 rounded-md hover:bg-ink-3 transition border border-transparent hover:border-line"
                >
                  <Icon className="mt-0.5 text-fg-dim group-hover:text-brand-bright transition" size={16} />
                  <div className="flex flex-col">
                    <span className="text-sm leading-tight text-fg">{label}</span>
                    <span className="text-2xs uppercase tracking-widest text-fg-faint mt-0.5">{sub}</span>
                  </div>
                </Link>
              ))}
            </nav>

            <div className="px-5 py-4 border-t border-line space-y-1">
              <div className="text-2xs uppercase tracking-widest text-fg-faint">Partners</div>
              <div className="mono text-xs text-fg-dim">Airbus · IBM · AWS</div>
              <div className="text-2xs uppercase tracking-widest text-fg-faint mt-3">Stack</div>
              <div className="mono text-xs text-fg-dim">CatBoost · LightGBM · XGBoost</div>
            </div>
          </aside>

          {/* === Main === */}
          <main className="flex-1 min-w-0 bg-ink-0 relative">
            {/* Top status bar */}
            <div className="border-b border-line bg-ink-1/60 px-6 lg:px-8 py-3 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 text-2xs tracking-widest uppercase text-fg-dim">
                <span className="mono text-fg-faint">SYS / PRED / ENGINE</span>
                <span className="text-line">|</span>
                <span className="text-risk-low">NOMINAL</span>
              </div>
              <div className="hidden md:flex items-center gap-5 text-2xs tracking-widest uppercase text-fg-dim">
                <div className="flex items-center gap-2">
                  <span className="text-fg-faint">FLEET</span>
                  <span className="mono text-fg">142 aircraft</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-fg-faint">PREDICTIONS</span>
                  <span className="mono text-fg">14,303</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-fg-faint">CV (robust)</span>
                  <span className="mono text-risk-low">0.1153</span>
                </div>
              </div>
              {/* mobile nav */}
              <nav className="lg:hidden flex gap-3 text-xs">
                {NAV.map(({ href, label }) => (
                  <Link key={href} href={href} className="text-fg-dim hover:text-fg">
                    {label}
                  </Link>
                ))}
              </nav>
            </div>

            <div className="px-6 lg:px-8 py-8 max-w-[1500px] mx-auto">
              {children}
            </div>
          </main>
        </div>
      </body>
    </html>
  );
}
