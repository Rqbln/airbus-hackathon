"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowUpDown,
  Gauge,
  PlaneTakeoff,
  PiggyBank,
} from "lucide-react";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from "@tanstack/react-table";

import { api, type ActiveMetrics, type FleetAircraft, type FleetRisk } from "@/lib/api";
import { formatNumber, formatPercent, formatUSD } from "@/lib/risk";
import { KpiCard } from "@/components/kpi-card";
import { RiskBadge } from "@/components/risk-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const columnHelper = createColumnHelper<FleetAircraft>();

export default function DashboardPage() {
  const [fleet, setFleet] = useState<FleetRisk | null>(null);
  const [metrics, setMetrics] = useState<ActiveMetrics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sorting, setSorting] = useState<SortingState>([{ id: "risk", desc: true }]);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    Promise.all([api.fleetRisk(), api.activeMetrics()])
      .then(([f, m]) => {
        setFleet(f);
        setMetrics(m);
      })
      .catch((e: Error) => setError(e.message));
  }, []);

  const savings = useMemo(() => {
    if (!fleet) return null;
    // Hypothèse conservatrice affichée : 3 jours d'AOG évités x 15 k$/h
    return fleet.n_high * 3 * 24 * 15000;
  }, [fleet]);

  const columns = useMemo(
    () => [
      columnHelper.accessor("aircraft_id", {
        header: "Aéronef",
        cell: (info) => (
          <Link
            href={`/aeronef/${info.getValue()}`}
            className="font-mono text-sm text-[#38BDF8] hover:underline"
          >
            {info.getValue()}
          </Link>
        ),
      }),
      columnHelper.accessor("latest_year_month", { header: "Dernier mois" }),
      columnHelper.accessor("risk", {
        header: "Risque",
        cell: (info) => (
          <div className="flex items-center gap-3">
            <div className="h-1.5 w-24 overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${info.getValue() * 100}%`,
                  backgroundColor:
                    info.getValue() >= 0.75
                      ? "#EF4444"
                      : info.getValue() >= 0.4
                        ? "#F59E0B"
                        : "#22C55E",
                }}
              />
            </div>
            <span className="tabular-nums">{formatPercent(info.getValue())}</span>
          </div>
        ),
      }),
      columnHelper.accessor("tier", {
        header: "Niveau",
        cell: (info) => <RiskBadge tier={info.getValue()} />,
      }),
      columnHelper.accessor("months_observed", {
        header: "Mois observés",
        cell: (info) => <span className="tabular-nums">{info.getValue()}</span>,
      }),
    ],
    []
  );

  const table = useReactTable({
    data: fleet?.aircraft ?? [],
    columns,
    state: { sorting, globalFilter: filter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  if (error) {
    return (
      <Card className="border-red-500/30">
        <CardContent className="flex items-center gap-3 p-6 text-sm">
          <AlertTriangle className="h-5 w-5 text-red-400" />
          <div>
            <p className="font-medium">Impossible de charger la flotte</p>
            <p className="text-muted-foreground">
              {error} — vérifier que l&apos;API tourne (`make api`) et qu&apos;un
              modèle est entraîné (`make train`).
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Tableau de bord flotte
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Risque de corrosion prédit au dernier mois connu, pour les 142 aéronefs
          de la flotte test.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {fleet ? (
          <>
            <KpiCard
              label="Flotte surveillée"
              value={String(fleet.fleet_size)}
              sub="aéronefs"
              icon={PlaneTakeoff}
              accent="#38BDF8"
            />
            <KpiCard
              label="Risque élevé"
              value={String(fleet.n_high)}
              sub={`probabilité ≥ 75 % · ${fleet.n_medium} moyens · ${fleet.n_low} faibles`}
              icon={AlertTriangle}
              accent="#EF4444"
            />
            <KpiCard
              label="Brier (modèle actif)"
              value={formatNumber(metrics?.metrics?.brier ?? null, 4)}
              sub={`baseline 0.2500 · AUC ${formatNumber(metrics?.metrics?.auc ?? null, 3)}`}
              icon={Gauge}
              accent="#0F62FE"
            />
            <KpiCard
              label="Économies potentielles"
              value={savings ? formatUSD(savings) : "—"}
              sub="3 j d'AOG évités / avion à risque (simulateur ROI)"
              icon={PiggyBank}
              accent="#22C55E"
            />
          </>
        ) : (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))
        )}
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>Aéronefs par niveau de risque</CardTitle>
          <Input
            placeholder="Filtrer par identifiant…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-56"
          />
        </CardHeader>
        <CardContent>
          {fleet ? (
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((hg) => (
                  <TableRow key={hg.id}>
                    {hg.headers.map((header) => (
                      <TableHead key={header.id}>
                        <button
                          className="flex items-center gap-1 hover:text-foreground"
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                          <ArrowUpDown className="h-3 w-3 opacity-50" />
                        </button>
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="space-y-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-10" />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
