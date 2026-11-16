import { TIER_CHIP_CLASS, type Tier } from "@/lib/quality";
import { cn } from "@/lib/utils";

export type VerdictTone = "high" | "low" | "mid";

const TONE_TIER: Record<VerdictTone, Tier> = { high: "bom", mid: "mediano", low: "abaixo" };

interface VerdictChipProps {
  label: string;
  tone: VerdictTone;
  title?: string;
  className?: string;
}

export function VerdictChip({ label, tone, title, className }: VerdictChipProps) {
  return (
    <span
      data-slot="verdict"
      data-tone={tone}
      title={title}
      className={cn(
        "inline-flex h-[1.375rem] shrink-0 items-center rounded-md px-2 type-label font-[560] whitespace-nowrap",
        TIER_CHIP_CLASS[TONE_TIER[tone]],
        className,
      )}
    >
      {label}
    </span>
  );
}
