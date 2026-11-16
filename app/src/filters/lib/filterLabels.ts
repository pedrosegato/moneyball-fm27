import { COLUMN } from "@/engine/columnIds";
import type { FilterSpec } from "@/engine/universe";
import { i18n } from "@/i18n";
import { EMPTY_VALUE } from "@/lib/constants";
import { formatCount, formatDate, formatStat } from "@/lib/format";
import { PLAYER_COLUMN } from "@/table/columns/ids";
import { footName } from "@/table/columns/labels";
import { filtersText } from "./filtersText";
import type { FilterTarget } from "./targets";

const FEMININE: ReadonlySet<string> = new Set([PLAYER_COLUMN.division, COLUMN.naturalPositions]);

function noValue(col: string): string {
  switch (col) {
    case PLAYER_COLUMN.club:
      return i18n.t("noClub");
    case PLAYER_COLUMN.division:
    case PLAYER_COLUMN.nation:
    case PLAYER_COLUMN.foot:
    case COLUMN.naturalPositions:
      return filtersText(`noValue.${col}`);
    default:
      return EMPTY_VALUE;
  }
}

export function optionLabel(col: string, value: string): string {
  if (value === "") return noValue(col);
  return col === PLAYER_COLUMN.foot ? (footName(value) ?? value) : value;
}

function numberText(target: FilterTarget | undefined, v: number): string {
  if (!target) return String(v);
  const { column, percentile } = target;
  if (percentile) return formatCount(v);
  if (column.kind === "number") return column.format(v);
  if (column.kind === "chip") return formatStat(v, column.def.unit);
  return String(v);
}

export const filterName = (filter: FilterSpec, target: FilterTarget | undefined): string =>
  target
    ? target.percentile
      ? filtersText("label.named", { abbr: target.column.abbr })
      : target.column.abbr
    : filter.col;

export function filterSummary(filter: FilterSpec, target: FilterTarget | undefined): string {
  switch (filter.kind) {
    case "range": {
      const { min, max } = filter;
      const at = (v: number) => numberText(target, v);
      if (min != null && max != null) return filtersText("summary.between", { min: at(min), max: at(max) });
      if (max != null) return filtersText("summary.atMost", { max: at(max) });
      return filtersText("summary.atLeast", { min: at(min ?? NaN) });
    }
    case "set": {
      const { values } = filter;
      if (values.length <= 2) return values.map((v) => optionLabel(filter.col, v)).join(", ");
      const key = FEMININE.has(filter.col) ? "summary.selectedFeminine" : "summary.selected";
      return filtersText(key, { total: values.length });
    }
    case "dateRange": {
      const { from, to } = filter;
      if (from && to) return filtersText("summary.between", { min: formatDate(from), max: formatDate(to) });
      if (to) return filtersText("summary.until", { to: formatDate(to) });
      return filtersText("summary.since", { from: formatDate(from ?? "") });
    }
  }
}

export const filterLabel = (filter: FilterSpec, target: FilterTarget | undefined): string =>
  filtersText(filter.kind === "set" ? "label.list" : "label.spaced", {
    name: filterName(filter, target),
    summary: filterSummary(filter, target),
  });
