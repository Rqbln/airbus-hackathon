# 06 — Frontend Next.js + shadcn/ui

## Stack

- Next.js App Router (TypeScript)
- shadcn/ui (card, table, badge, button, select, slider, tabs, progress, sonner)
- Recharts (graphiques)
- Lucide (icônes)
- Langue : **français**

## Palette

| Usage | Hex |
|-------|-----|
| Fond dark | `#071A2C` |
| Primaire | `#0F62FE` |
| Cyan | `#38BDF8` |
| Magenta | `#C026D3` |
| Risque faible | `#22C55E` |
| Risque moyen | `#F59E0B` |
| Risque élevé | `#EF4444` |

## Pages

| Route | Rôle |
|-------|------|
| `/` | Dashboard flotte — KPI + table 142 avions |
| `/aeronef/[id]` | Jumeau numérique — CEI vs risque |
| `/labo` | Labo ML — benchmark, métriques, comparaison, soumission |
| `/roi` | Simulateur ROI interactif |

## Client API

`frontend/src/lib/api.ts` — `NEXT_PUBLIC_API_URL` (défaut `http://localhost:8000`)

## Composants clés

- `components/app-shell.tsx` — navigation
- `components/kpi-card.tsx` — cartes KPI
- `components/fleet-table.tsx` — table triable
- `components/risk-badge.tsx` — badge coloré par tier
