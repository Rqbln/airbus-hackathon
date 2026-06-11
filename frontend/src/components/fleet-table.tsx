"use client";

import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FleetRiskItem } from "@/lib/api";
import { RiskBadge } from "@/components/risk-badge";

export function FleetTable({ rows }: { rows: FleetRiskItem[] }) {
  const sorted = [...rows].sort((a, b) => b.calibrated_risk - a.calibrated_risk);

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
      <Table>
        <TableHeader>
          <TableRow className="border-white/10 hover:bg-transparent">
            <TableHead className="text-slate-400">Aéronef</TableHead>
            <TableHead className="text-slate-400">Dernier mois</TableHead>
            <TableHead className="text-slate-400">Risque</TableHead>
            <TableHead className="text-slate-400">Niveau</TableHead>
            <TableHead className="text-right text-slate-400">CEI</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((row) => (
            <TableRow key={row.aircraft_id} className="border-white/10 hover:bg-white/5">
              <TableCell>
                <Link
                  href={`/aeronef/${row.aircraft_id}`}
                  className="font-mono text-[#38BDF8] hover:underline"
                >
                  {row.aircraft_id}
                </Link>
              </TableCell>
              <TableCell className="text-slate-300">{row.latest_year_month}</TableCell>
              <TableCell className="font-semibold">
                {(row.calibrated_risk * 100).toFixed(1)}%
              </TableCell>
              <TableCell>
                <RiskBadge tier={row.risk_tier} />
              </TableCell>
              <TableCell className="text-right font-mono text-slate-400">
                {row.cei_monthly.toExponential(2)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
