import { i18n } from "@/i18n";
import { formatCount, formatFixed, formatRounded, formatStat, orEmpty } from "@/lib/format";
import { VALUE_MODE, type ValueMode } from "@/store/ui";
import type { Axis } from "./scatter";

const PERCENT_UNIT = "pct";

export function tickText(v: number, step: number, axis: Axis, mode: ValueMode): string {
  if (mode === VALUE_MODE.percentile) return formatCount(v);
  const decimals = step >= 1 ? 0 : Math.min(3, Math.ceil(-Math.log10(step) - 1e-9));
  const text = formatFixed(v, decimals);
  return axis.unit === PERCENT_UNIT ? `${text}%` : text;
}

export const meanText = (v: number, axis: Axis, mode: ValueMode): string =>
  i18n.t("graphs:axis.mean", {
    value: mode === VALUE_MODE.percentile ? formatRounded(v) : formatStat(v, axis.unit),
  });

export const axisTitle = (axis: Axis, mode: ValueMode): string =>
  [
    axis.abbr,
    mode === VALUE_MODE.percentile && i18n.t("graphs:axis.percentile"),
    mode === VALUE_MODE.value && axis.lowerIsBetter && i18n.t("graphs:axis.inverted"),
  ]
    .filter(Boolean)
    .join(", ");

interface SummaryParts {
  n: number;
  x: Axis;
  y: Axis;
  xMean: string;
  yMean: string;
  leveled: boolean;
}

export function plotSummary({ n, x, y, xMean, yMean, leveled }: SummaryParts): string {
  const players = i18n.t("graphs:summary.players", { count: n });
  return [
    i18n.t("graphs:summary.scatter", { players, x: x.abbr, y: y.abbr }),
    i18n.t("graphs:summary.means", { xMean, x: x.abbr, yMean, y: y.abbr }),
    leveled && i18n.t("graphs:summary.colours"),
    i18n.t("graphs:summary.labeled"),
  ]
    .filter(Boolean)
    .join(" ");
}

export function emptyPlotText(inView: number, pool: string, mode: ValueMode, { x, y }: { x: Axis; y: Axis }): string {
  if (inView === 0) return i18n.t("graphs:empty.noneInView", { pool });
  const facts = { n: formatCount(inView), pool, x: x.abbr, y: y.abbr };
  return mode === VALUE_MODE.percentile
    ? i18n.t("graphs:empty.noPercentile", facts)
    : i18n.t("graphs:empty.noValue", facts);
}

export function shownValue(axis: Axis, i: number, mode: ValueMode): string {
  return mode === VALUE_MODE.percentile
    ? orEmpty(axis.pct[i], formatRounded)
    : orEmpty(axis.value[i], (v) => formatStat(v, axis.unit));
}
