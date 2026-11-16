import { memo } from "react";
import type { StatDef } from "@/engine/stats/catalog";
import { i18n } from "@/i18n";
import { clampScore, formatStat } from "@/lib/format";
import { qualityTier, ratingTier } from "@/lib/quality";
import { type MissingReason, missingText } from "./missing";
import { percentileText, readingOf } from "./statReading";
import { TierChip } from "./TierChip";

export type DisplayMode = "value" | "percentile";

export interface StatCellProps {
  value: number;
  pct: number;
  mode: DisplayMode;
  def: Pick<StatDef, "label" | "unit" | "lowerIsBetter">;
  missing?: MissingReason;
  scale?: "percentile" | "rating";
  against?: string;
  againstAsTitle?: boolean;
  className?: string;
}

const SPARED_BY_FIXED_SCALE: MissingReason = "group";

function statChip({ value, pct, mode, def, missing, scale, against, againstAsTitle }: StatCellProps) {
  const valueText = Number.isNaN(value) ? null : formatStat(value, def.unit);
  const pctText = Number.isNaN(pct) ? null : String(clampScore(Math.round(pct)));
  const spared = scale === "rating" && mode === "value" && missing === SPARED_BY_FIXED_SCALE;
  const why = pctText == null && missing && !spared ? missingText(missing) : null;
  const percentile = pctText == null ? null : [percentileText(pctText), against].filter(Boolean).join(" ");
  const name = def.lowerIsBetter ? i18n.t("stat.lowerIsBetter", { label: def.label }) : def.label;
  const againstTip = why == null && against ? percentile : null;
  return {
    shown: mode === "percentile" ? pctText : valueText,
    label: readingOf(name, [valueText, percentile ?? why]),
    tip: why ?? (againstAsTitle ? null : againstTip),
    title: (againstAsTitle && againstTip) || undefined,
  };
}

export const StatCell = memo(function StatCell(props: StatCellProps) {
  const { scale, value, pct, missing } = props;
  const tier = scale === "rating" ? (missing === "pool" ? null : ratingTier(value)) : qualityTier(pct);
  return <TierChip {...statChip(props)} tier={tier} className={props.className} />;
});
