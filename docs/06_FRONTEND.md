# 06 — Frontend Next.js + shadcn/ui (français)

> Implémentation : `frontend/src/`. Style : aerospace enterprise SaaS — l'outil doit ressembler à un produit qu'Airbus ou un MRO utiliserait réellement.

## Stack

Next.js (App Router, TypeScript) + Tailwind CSS v4 + shadcn/ui (style new-york) + Recharts + TanStack Table + Lucide. UI **100 % en français**. Thème sombre navy par défaut.

## Pages

| Route | Rôle | Composants clés |
|---|---|---|
| `/` | Tableau de bord flotte : KPI (flotte, haut risque, Brier actif, économies) + table triable des 142 avions | Cards KPI, TanStack Table, badges de risque |
| `/aeronef/[id]` | Jumeau numérique : double axe CEI vs risque calibré, cards d'exposition | Recharts ComposedChart |
| `/labo` | Labo ML : config + lancement de benchmark, suivi (polling 2 s), tableau comparatif des runs, détail métriques (calibration, histogramme, importances, Brier/fold), comparaison A/B, activation, soumission Kaggle | Formulaire shadcn, charts Recharts |
| `/roi` | Simulateur ROI : sliders d'hypothèses → économies + ROI en direct | Sliders shadcn, BarChart |

## Palette (tokens CSS dans `globals.css`)

| Usage | Couleur | Hex |
|---|---|---|
| Fond sombre | Navy aerospace | `#071A2C` |
| Fond clair | Off-white | `#F8FAFC` |
| Primaire | Bleu Airbus/IBM | `#0F62FE` |
| Accent data | Cyan | `#38BDF8` |
| Accent slides | Magenta | `#C026D3` |
| Risque faible / économies | Vert | `#22C55E` |
| Risque moyen | Ambre | `#F59E0B` |
| Risque élevé | Rouge | `#EF4444` |
| Texte sombre | Slate | `#0F172A` |
| Texte atténué | Gris | `#64748B` |

Principes : cards arrondies (`rounded-xl`+), gros KPI, peu de texte, gradient discret bleu→cyan sur les éléments hero, 1 idée par écran.

## Conventions

- Client API unique : `src/lib/api.ts` → `http://localhost:8000` (surchargeable via `NEXT_PUBLIC_API_URL`). Tous les types TypeScript des réponses y sont définis.
- États gérés partout : chargement (skeletons), erreur, API hors ligne (bannière).
- Pas de composant maison quand shadcn/ui fournit l'équivalent (`card`, `table`, `badge`, `button`, `slider`, `select`, `tabs`, `skeleton`, `tooltip`, `sonner`).
- Libellés de tiers de risque : `eleve` → « Élevé » (rouge), `moyen` → « Moyen » (ambre), `faible` → « Faible » (vert) — mapping dans `src/lib/risk.ts`.
- Le polling des runs en cours s'arrête quand `status` ∈ {done, failed}.
