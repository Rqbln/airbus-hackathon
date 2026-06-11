import { Badge } from "@/components/ui/badge";

export function RiskBadge({ tier }: { tier: string }) {
  const styles: Record<string, string> = {
    Faible: "bg-[#22C55E]/20 text-[#22C55E] border-[#22C55E]/30",
    Moyen: "bg-[#F59E0B]/20 text-[#F59E0B] border-[#F59E0B]/30",
    Élevé: "bg-[#EF4444]/20 text-[#EF4444] border-[#EF4444]/30",
  };
  return (
    <Badge variant="outline" className={styles[tier] ?? "border-white/20 text-slate-300"}>
      {tier}
    </Badge>
  );
}
