import type { LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  accent = "#38BDF8",
  className,
}: {
  label: string;
  value: string;
  sub?: string;
  icon?: LucideIcon;
  accent?: string;
  className?: string;
}) {
  return (
    <Card className={cn("gradient-hero", className)}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              {label}
            </p>
            <p className="mt-2 text-3xl font-semibold tabular-nums">{value}</p>
            {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
          </div>
          {Icon && (
            <span
              className="flex h-9 w-9 items-center justify-center rounded-lg"
              style={{ backgroundColor: `${accent}1f` }}
            >
              <Icon className="h-4 w-4" style={{ color: accent }} />
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
