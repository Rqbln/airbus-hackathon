import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function KpiCard({
  title,
  value,
  hint,
  accent,
}: {
  title: string;
  value: string;
  hint?: string;
  accent?: string;
}) {
  return (
    <Card className="rounded-2xl border-white/10 bg-white/5 text-slate-100 shadow-lg">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-slate-400">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className={`text-4xl font-semibold tracking-tight ${accent ?? "text-white"}`}>{value}</p>
        {hint ? <p className="mt-2 text-xs text-slate-400">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}
