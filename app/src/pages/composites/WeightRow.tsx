import { X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Threshold } from "@/components/Threshold";
import { Button } from "@/components/ui/button";
import type { StatKey } from "@/engine/stats/catalog";
import { formatDecimal } from "@/lib/format";
import { cn } from "@/lib/utils";
import { MAX_WEIGHT } from "@/store/compositeRules";
import { STAT_DEFS } from "./model";
import { WEIGHTS_CELL } from "./weightsTableStyles";

interface WeightRowProps {
  statKey: StatKey;
  weight: number;
  share: number;
  showShare: boolean;
  removable: boolean;
  minStats: number;
  onWeight(weight: number): void;
  onRemove(): void;
}

export function WeightRow({
  statKey,
  weight,
  share,
  showShare,
  removable,
  minStats,
  onWeight,
  onRemove,
}: WeightRowProps) {
  const { t } = useTranslation("settings");
  const def = STAT_DEFS.get(statKey);
  const abbr = def?.abbr ?? statKey;
  return (
    <tr className="border-b border-line-subtle">
      <th scope="row" className={cn(WEIGHTS_CELL, "text-left font-normal")}>
        <span className="flex min-w-0 items-baseline gap-2">
          <span className="shrink-0 font-[550] tabular-nums text-fg">{abbr}</span>
          <span className="min-w-0 truncate type-caption text-fg-muted" title={def?.label}>
            {def?.label}
          </span>
        </span>
      </th>
      <td className={WEIGHTS_CELL}>
        <Threshold
          name={t("composites.weights.weightOf", { abbr })}
          value={weight}
          max={MAX_WEIGHT}
          decimals={1}
          fixed
          className={cn(weight === 0 && "opacity-60")}
          onCommit={onWeight}
        />
      </td>
      {showShare && (
        <td className={WEIGHTS_CELL}>
          <span className="flex items-center gap-2" title={weight > 0 ? undefined : t("composites.weights.zeroWeight")}>
            <span aria-hidden className="h-1 w-10 overflow-hidden rounded-full bg-surface-control">
              <span className="block h-full rounded-full bg-fg-secondary" style={{ width: `${share * 100}%` }} />
            </span>
            <span className="type-caption tabular-nums text-fg-muted">{`${formatDecimal(share * 100, 0)}%`}</span>
          </span>
        </td>
      )}
      <td className={cn(WEIGHTS_CELL, "text-right")}>
        <Button
          variant="ghost"
          size="icon-xs"
          className="text-fg-muted"
          aria-label={t("composites.weights.removeOf", { abbr })}
          title={
            removable
              ? t("composites.weights.removeOf", { abbr })
              : t("composites.weights.minStats", { count: minStats })
          }
          disabled={!removable}
          onClick={onRemove}
        >
          <X />
        </Button>
      </td>
    </tr>
  );
}
