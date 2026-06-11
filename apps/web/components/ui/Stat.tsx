import { ReactNode } from "react";

/** Inline label/value pair used inside dense panels. */
export function Stat({
  label,
  value,
  tone = "default",
  className = "",
}: {
  label: string;
  value: ReactNode;
  tone?: "default" | "good" | "warn" | "bad";
  className?: string;
}) {
  const toneCls =
    tone === "good"
      ? "text-risk-low"
      : tone === "warn"
        ? "text-risk-mid"
        : tone === "bad"
          ? "text-risk-high"
          : "text-fg";
  return (
    <div className={`flex items-center justify-between text-sm ${className}`}>
      <span className="text-fg-dim">{label}</span>
      <span className={`mono font-medium ${toneCls}`}>{value}</span>
    </div>
  );
}
