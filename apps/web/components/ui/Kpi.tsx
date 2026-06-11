import { ReactNode } from "react";

type Tone = "default" | "good" | "warn" | "bad" | "info" | "experimental";

const TONE: Record<Tone, string> = {
  default: "text-fg",
  good: "text-risk-low",
  warn: "text-risk-mid",
  bad: "text-risk-high",
  info: "text-brand-bright",
  experimental: "text-tag-experimental",
};

export function Kpi({
  label,
  value,
  unit,
  hint,
  tone = "default",
  right,
  small,
}: {
  label: string;
  value: string | number;
  unit?: string;
  hint?: ReactNode;
  tone?: Tone;
  right?: ReactNode;
  small?: boolean;
}) {
  return (
    <div className="panel shadow-panel px-5 py-4 flex flex-col h-full">
      <div className="flex items-start justify-between gap-2">
        <div className="text-2xs uppercase tracking-widest text-fg-faint">{label}</div>
        {right}
      </div>
      <div className={`mono mt-2 ${small ? "text-xl" : "text-3xl"} font-semibold leading-none ${TONE[tone]}`}>
        {value}
        {unit && <span className="text-fg-dim text-base ml-1.5 font-normal">{unit}</span>}
      </div>
      {hint && <div className="text-xs text-fg-dim mt-2 leading-snug">{hint}</div>}
    </div>
  );
}
