import { ReactNode } from "react";

type Variant =
  | "low"
  | "mid"
  | "high"
  | "robust"
  | "experimental"
  | "info"
  | "warn"
  | "muted";

const VARIANTS: Record<Variant, string> = {
  low: "bg-risk-low/10 text-risk-low border-risk-low/30",
  mid: "bg-risk-mid/10 text-risk-mid border-risk-mid/30",
  high: "bg-risk-high/10 text-risk-high border-risk-high/30",
  robust: "bg-tag-robust/10 text-tag-robust border-tag-robust/30",
  experimental: "bg-tag-experimental/12 text-tag-experimental border-tag-experimental/30",
  info: "bg-brand/10 text-brand-bright border-brand/30",
  warn: "bg-tag-warn/10 text-tag-warn border-tag-warn/30",
  muted: "bg-fg-mute/10 text-fg-dim border-fg-mute/30",
};

export function Badge({
  variant = "info",
  children,
  className = "",
  dot,
}: {
  variant?: Variant;
  children: ReactNode;
  className?: string;
  dot?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-2xs uppercase tracking-widest border ${VARIANTS[variant]} ${className}`}
    >
      {dot && (
        <span className={`inline-block w-1.5 h-1.5 rounded-full bg-current ${dot ? "pulse-dot" : ""}`} />
      )}
      <span className="font-semibold">{children}</span>
    </span>
  );
}

export function riskBadge(value: number) {
  if (value > 0.66) return <Badge variant="high">High risk</Badge>;
  if (value > 0.33) return <Badge variant="mid">Mid risk</Badge>;
  return <Badge variant="low">Low risk</Badge>;
}

export function riskLabel(value: number): "LOW" | "MID" | "HIGH" {
  if (value > 0.66) return "HIGH";
  if (value > 0.33) return "MID";
  return "LOW";
}
