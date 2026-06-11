import { ReactNode } from "react";

export function Panel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`panel shadow-panel ${className}`}>{children}</div>
  );
}

export function PanelHeader({
  title,
  subtitle,
  right,
  className = "",
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`px-5 pt-4 pb-3 flex items-start justify-between gap-4 ${className}`}>
      <div>
        <div className="text-sm font-semibold text-fg tracking-tight">{title}</div>
        {subtitle && <div className="text-xs text-fg-dim mt-0.5">{subtitle}</div>}
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </div>
  );
}

export function PanelBody({
  children,
  className = "",
  pad = true,
}: {
  children: ReactNode;
  className?: string;
  pad?: boolean;
}) {
  return <div className={`${pad ? "px-5 pb-5" : ""} ${className}`}>{children}</div>;
}

export function Section({
  eyebrow,
  title,
  description,
  right,
  children,
  className = "",
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  right?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`space-y-4 ${className}`}>
      <div className="flex items-end justify-between gap-4">
        <div>
          {eyebrow && (
            <div className="text-2xs uppercase tracking-widest text-fg-faint mb-1">{eyebrow}</div>
          )}
          <h2 className="text-lg font-semibold tracking-tight text-fg">{title}</h2>
          {description && <p className="text-sm text-fg-dim mt-1 max-w-3xl">{description}</p>}
        </div>
        {right}
      </div>
      <div className="section-rule" />
      {children}
    </section>
  );
}
