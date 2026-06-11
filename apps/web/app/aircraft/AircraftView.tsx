"use client";
import { useMemo, useState } from "react";
import { Badge, riskLabel } from "@/components/ui/Badge";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/Card";
import { Kpi } from "@/components/ui/Kpi";
import { Stat } from "@/components/ui/Stat";
import { TimeSeries } from "@/components/charts/TimeSeries";
import { StackedRiskBar } from "@/components/charts/StackedRiskBar";
import type { AircraftPoint, AircraftSummary } from "@/lib/aircraft";

type Props = {
  byAircraft: Record<string, AircraftPoint[]>;
  summaries: AircraftSummary[];
};

export function AircraftView({ byAircraft, summaries }: Props) {
  const [current, setCurrent] = useState<string>(summaries[0].aircraft_id);
  const [search, setSearch] = useState("");

  const filteredIds = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return summaries.map((s) => s.aircraft_id);
    return summaries.filter((s) => s.aircraft_id.toLowerCase().includes(q)).map((s) => s.aircraft_id);
  }, [search, summaries]);

  const rows = byAircraft[current] || [];
  const summary = summaries.find((s) => s.aircraft_id === current);

  const priorityVariant = (p: AircraftSummary["priority"]) =>
    p === "URGENT" ? "high" : p === "WATCH" ? "mid" : p === "ROUTINE" ? "info" : "low";

  return (
    <div className="space-y-6">
      {/* Selector strip */}
      <Panel>
        <PanelBody>
          <div className="flex flex-col lg:flex-row lg:items-center gap-4 lg:justify-between">
            <div className="flex flex-col sm:flex-row sm:items-end gap-3">
              <div>
                <div className="text-2xs uppercase tracking-widest text-fg-faint mb-1">Aircraft ID</div>
                <select
                  value={current}
                  onChange={(e) => setCurrent(e.target.value)}
                  className="bg-ink-1 border border-line-strong rounded px-3 py-2 mono text-sm focus:outline-none focus:border-brand min-w-[160px]"
                >
                  {filteredIds.map((id) => (
                    <option key={id} value={id}>
                      {id}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <div className="text-2xs uppercase tracking-widest text-fg-faint mb-1">Filter</div>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="search id…"
                  className="bg-ink-1 border border-line rounded px-3 py-2 mono text-sm focus:outline-none focus:border-brand w-44"
                />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setCurrent(summaries[0].aircraft_id)}
                className="text-2xs uppercase tracking-widest border border-line rounded px-2.5 py-1.5 text-fg-dim hover:text-brand-bright hover:border-brand transition"
              >
                ↑ Highest risk
              </button>
              <button
                onClick={() => setCurrent(summaries[summaries.length - 1].aircraft_id)}
                className="text-2xs uppercase tracking-widest border border-line rounded px-2.5 py-1.5 text-fg-dim hover:text-brand-bright hover:border-brand transition"
              >
                ↓ Lowest risk
              </button>
            </div>
          </div>
        </PanelBody>
      </Panel>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Kpi
          small
          label="Priority"
          value={summary?.priority ?? "—"}
          tone={
            summary?.priority === "URGENT"
              ? "bad"
              : summary?.priority === "WATCH"
                ? "warn"
                : summary?.priority === "ROUTINE"
                  ? "info"
                  : "good"
          }
          hint={summary?.recommendation ?? null}
        />
        <Kpi
          small
          label="Mean risk"
          value={summary ? summary.mean_risk.toFixed(3) : "—"}
          hint={`across ${summary?.n_months ?? 0} months`}
        />
        <Kpi
          small
          label="Peak risk"
          value={summary ? summary.peak_risk.toFixed(3) : "—"}
          tone="bad"
          hint={`month ${summary?.peak_month ?? "—"}`}
        />
        <Kpi
          small
          label="Recent 12mo mean"
          value={summary ? summary.recent12_mean.toFixed(3) : "—"}
          tone={summary && summary.recent12_mean > summary.mean_risk ? "warn" : "good"}
          hint={
            summary
              ? `vs lifetime ${summary.mean_risk.toFixed(3)} (${
                  summary.recent12_mean > summary.mean_risk ? "↑ trending up" : "↓ trending down"
                })`
              : ""
          }
        />
        <Kpi
          small
          label="High-risk months"
          value={summary ? summary.high_months : 0}
          tone="bad"
          hint="risk > 0.66"
        />
      </div>

      {/* Action */}
      {summary && (
        <Panel className="border-l-2 border-l-brand/60">
          <PanelBody>
            <div className="flex flex-col lg:flex-row gap-4 lg:items-center justify-between">
              <div className="flex items-start gap-3">
                <div className="mt-0.5">
                  <Badge variant={priorityVariant(summary.priority)} dot>
                    {summary.priority}
                  </Badge>
                </div>
                <div>
                  <div className="text-sm font-semibold">Recommended action</div>
                  <div className="text-sm text-fg-dim mt-1 leading-snug">{summary.recommendation}</div>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <Stat label="Low" value={summary.low_months} tone="good" />
                <Stat label="Mid" value={summary.mid_months} tone="warn" />
                <Stat label="High" value={summary.high_months} tone="bad" />
              </div>
            </div>
            <div className="mt-4">
              <StackedRiskBar low={summary.low_months} mid={summary.mid_months} high={summary.high_months} height={10} />
            </div>
          </PanelBody>
        </Panel>
      )}

      {/* Timeline */}
      <Panel>
        <PanelHeader
          title="Predicted corrosion risk over time"
          subtitle="Green / amber / red bands = low / mid / high risk · vertical line marks the peak month"
          right={
            <div className="flex items-center gap-2 text-2xs uppercase tracking-widest text-fg-dim">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-sm bg-risk-low/70" /> low
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-sm bg-risk-mid/70" /> mid
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-sm bg-risk-high/70" /> high
              </span>
            </div>
          }
        />
        <PanelBody>
          <TimeSeries data={rows} xKey="year_month" yKey="corrosion_risk" height={340} peakMonth={summary?.peak_month} />
        </PanelBody>
      </Panel>

      {/* Top months */}
      <Panel>
        <PanelHeader
          title="Months ranked by predicted risk"
          subtitle="Top 10 high-risk months for this aircraft"
        />
        <PanelBody pad={false}>
          <div className="overflow-x-auto scroll-thin">
            <table className="w-full text-sm">
              <thead className="text-2xs uppercase tracking-widest text-fg-faint">
                <tr className="border-b border-line">
                  <th className="text-left py-2.5 px-5">#</th>
                  <th className="text-left py-2.5 px-2">Month</th>
                  <th className="text-right py-2.5 px-2">Corrosion risk</th>
                  <th className="text-left py-2.5 px-5">Level</th>
                </tr>
              </thead>
              <tbody>
                {[...rows]
                  .sort((a, b) => b.corrosion_risk - a.corrosion_risk)
                  .slice(0, 10)
                  .map((r, i) => {
                    const lvl = riskLabel(r.corrosion_risk);
                    return (
                      <tr key={r.year_month} className="border-b border-line/40 hover:bg-ink-3/50 transition">
                        <td className="py-2.5 px-5 mono text-fg-faint">{(i + 1).toString().padStart(2, "0")}</td>
                        <td className="py-2.5 px-2 mono">{r.year_month}</td>
                        <td className="py-2.5 px-2 text-right mono">{r.corrosion_risk.toFixed(4)}</td>
                        <td className="py-2.5 px-5">
                          {lvl === "HIGH" && <Badge variant="high">HIGH</Badge>}
                          {lvl === "MID" && <Badge variant="mid">MID</Badge>}
                          {lvl === "LOW" && <Badge variant="low">LOW</Badge>}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </PanelBody>
      </Panel>
    </div>
  );
}
