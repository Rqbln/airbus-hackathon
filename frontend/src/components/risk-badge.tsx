import { Badge } from "@/components/ui/badge";
import type { RiskTier } from "@/lib/api";
import { TIER_BADGE_CLASSES, TIER_LABELS } from "@/lib/risk";

export function RiskBadge({ tier }: { tier: RiskTier }) {
  return (
    <Badge variant="outline" className={TIER_BADGE_CLASSES[tier]}>
      {TIER_LABELS[tier]}
    </Badge>
  );
}
