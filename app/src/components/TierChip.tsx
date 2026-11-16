import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { EMPTY_VALUE } from "@/lib/constants";
import { CHIP_SHAPE, NO_TIER_CHIP_CLASS, TIER_CHIP_CLASS, type Tier } from "@/lib/quality";
import { cn } from "@/lib/utils";

export interface TierChipProps {
  shown: string | null;
  tier: Tier | null;
  label: string;
  tip: string | null;
  title?: string;
  className?: string;
}

export function TierChip({ shown, tier, label, tip, title, className }: TierChipProps) {
  const chip = (
    <span
      data-slot="stat-cell"
      data-tier={tier ?? undefined}
      title={title}
      className={cn(
        CHIP_SHAPE,
        tier ? TIER_CHIP_CLASS[tier] : NO_TIER_CHIP_CLASS,
        !tier && shown != null && "text-fg-secondary",
        className,
      )}
    >
      <span aria-hidden="true">{shown ?? EMPTY_VALUE}</span>
      <span className="sr-only">{label}</span>
    </span>
  );
  if (!tip) return chip;
  return (
    <Tooltip>
      <TooltipTrigger render={chip} />
      <TooltipContent>{tip}</TooltipContent>
    </Tooltip>
  );
}
