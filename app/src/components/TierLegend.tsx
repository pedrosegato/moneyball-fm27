import { formatCount } from "@/lib/format";
import { CHIP_SHAPE, TIER_CHIP_CLASS, TIER_CUTS, TIER_NAME, type Tier, type TierScale } from "@/lib/quality";
import { cn } from "@/lib/utils";

interface TierLegendProps {
  scale?: TierScale;
  label?: string;
  counts?: Record<Tier, number>;
  className?: string;
}

export function TierLegend({
  scale = "percentile",
  label = "Níveis de qualidade",
  counts,
  className,
}: TierLegendProps) {
  const tiers = TIER_CUTS[scale];
  return (
    <ul aria-label={label} className={cn("flex flex-wrap items-center gap-x-3 gap-y-1.5", className)}>
      {tiers.map(({ tier, range }) => (
        <li
          key={tier}
          className="flex items-center gap-1.5"
          title={counts && `${TIER_NAME[tier]}: ${scale === "rating" ? "nota" : "percentil"} ${range}`}
        >
          <span className={cn(CHIP_SHAPE, "min-w-0 justify-center px-2", TIER_CHIP_CLASS[tier])}>
            {TIER_NAME[tier]}
          </span>
          {counts ? (
            <span className="type-caption tabular-nums text-fg-secondary">
              {formatCount(counts[tier])}
              <span className="sr-only">{counts[tier] === 1 ? " jogador" : " jogadores"}</span>
            </span>
          ) : (
            <span className="type-caption tabular-nums text-fg-muted">{range}</span>
          )}
        </li>
      ))}
    </ul>
  );
}
