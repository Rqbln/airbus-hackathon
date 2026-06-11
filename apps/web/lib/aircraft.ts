/**
 * Per-aircraft aggregates + inspection priority logic.
 */
import { readCsv } from "./data";

export type AircraftPoint = {
  aircraft_id: string;
  year_month: string;
  corrosion_risk: number;
};

export type AircraftSummary = {
  aircraft_id: string;
  n_months: number;
  mean_risk: number;
  peak_risk: number;
  peak_month: string;
  high_months: number;
  mid_months: number;
  low_months: number;
  // Recent trend: mean of last 12 months
  recent12_mean: number;
  priority: "URGENT" | "WATCH" | "ROUTINE" | "CLEAR";
  recommendation: string;
};

export function loadTimeSeries(): AircraftPoint[] {
  return readCsv("aircraft_risk_timeseries.csv").map((r) => ({
    aircraft_id: r.aircraft_id,
    year_month: r.year_month,
    corrosion_risk: parseFloat(r.corrosion_risk),
  }));
}

export function groupByAircraft(rows: AircraftPoint[]) {
  const map: Record<string, AircraftPoint[]> = {};
  rows.forEach((r) => {
    (map[r.aircraft_id] = map[r.aircraft_id] || []).push(r);
  });
  Object.values(map).forEach((arr) =>
    arr.sort((a, b) => a.year_month.localeCompare(b.year_month))
  );
  return map;
}

function classify(peak: number, recent: number): AircraftSummary["priority"] {
  if (peak > 0.66 || recent > 0.55) return "URGENT";
  if (peak > 0.45 || recent > 0.40) return "WATCH";
  if (peak > 0.25) return "ROUTINE";
  return "CLEAR";
}

function recommend(p: AircraftSummary["priority"], peak: number, peakMonth: string) {
  switch (p) {
    case "URGENT":
      return `Schedule on-the-ground inspection within 30 days. Peak risk ${peak.toFixed(2)} in ${peakMonth}.`;
    case "WATCH":
      return `Plan inspection within next 90 days; monitor humidity / pollutant exposure.`;
    case "ROUTINE":
      return `Continue standard inspection cycle. No immediate intervention needed.`;
    case "CLEAR":
      return `No anomaly. Standard maintenance schedule.`;
  }
}

export function summarize(rows: AircraftPoint[]): AircraftSummary {
  const vals = rows.map((r) => r.corrosion_risk);
  const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
  const peak = Math.max(...vals);
  const peakMonth = rows.find((r) => r.corrosion_risk === peak)?.year_month ?? "—";
  const high = rows.filter((r) => r.corrosion_risk > 0.66).length;
  const mid = rows.filter((r) => r.corrosion_risk > 0.33 && r.corrosion_risk <= 0.66).length;
  const low = rows.filter((r) => r.corrosion_risk <= 0.33).length;
  const last12 = rows.slice(-12).map((r) => r.corrosion_risk);
  const recent12 =
    last12.length > 0 ? last12.reduce((a, b) => a + b, 0) / last12.length : mean;

  const priority = classify(peak, recent12);
  return {
    aircraft_id: rows[0]?.aircraft_id ?? "",
    n_months: rows.length,
    mean_risk: mean,
    peak_risk: peak,
    peak_month: peakMonth,
    high_months: high,
    mid_months: mid,
    low_months: low,
    recent12_mean: recent12,
    priority,
    recommendation: recommend(priority, peak, peakMonth),
  };
}

export function buildFleetSummary(): AircraftSummary[] {
  const ts = loadTimeSeries();
  const grouped = groupByAircraft(ts);
  return Object.values(grouped)
    .map((arr) => summarize(arr))
    .sort((a, b) => b.peak_risk - a.peak_risk);
}

/** Aggregated counts across the whole fleet. */
export function fleetTotals(summaries: AircraftSummary[]) {
  let high = 0, mid = 0, low = 0, allMonths = 0;
  for (const s of summaries) {
    high += s.high_months;
    mid += s.mid_months;
    low += s.low_months;
    allMonths += s.n_months;
  }
  const urgent = summaries.filter((s) => s.priority === "URGENT").length;
  const watch = summaries.filter((s) => s.priority === "WATCH").length;
  const routine = summaries.filter((s) => s.priority === "ROUTINE").length;
  const clear = summaries.filter((s) => s.priority === "CLEAR").length;
  return { high, mid, low, allMonths, urgent, watch, routine, clear };
}
