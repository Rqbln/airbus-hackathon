// Mapping des tiers de risque vers libellés français et couleurs de la palette.

import type { RiskTier } from "./api";

export const TIER_LABELS: Record<RiskTier, string> = {
  faible: "Faible",
  moyen: "Moyen",
  eleve: "Élevé",
};

export const TIER_COLORS: Record<RiskTier, string> = {
  faible: "#22C55E",
  moyen: "#F59E0B",
  eleve: "#EF4444",
};

export const TIER_BADGE_CLASSES: Record<RiskTier, string> = {
  faible: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  moyen: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  eleve: "bg-red-500/15 text-red-400 border-red-500/30",
};

export function formatPercent(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined) return "—";
  return `${(value * 100).toFixed(digits)} %`;
}

export function formatNumber(value: number | null | undefined, digits = 4): string {
  if (value === null || value === undefined) return "—";
  return value.toFixed(digits);
}

export function formatUSD(value: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}
