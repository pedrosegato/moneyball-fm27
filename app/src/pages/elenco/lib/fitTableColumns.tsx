import { EmptyCell } from "@/components/EmptyCell";
import { VerdictChip } from "@/components/VerdictChip";
import { COLUMN } from "@/engine/columnIds";
import type { PosGroup } from "@/engine/positions";
import { fitVerdict } from "@/engine/tacticalFit";
import { i18n } from "@/i18n";
import { formatCount, formatFixed, formatSigned } from "@/lib/format";
import { pageNumber } from "@/table/columns/factories";
import type { TableColumn } from "@/table/columns/types";
import { customColumn } from "@/table/lib/customColumn";
import { elencoT } from "./elencoT";
import type { FitColumns } from "./fitRows";
import { FIT_TONE, fitLabel, fitRule, marginPoints } from "./fitText";
import { withSlotPerformance } from "./slotPerformance";

interface FitSource {
  cols: FitColumns;
  group: PosGroup;
  lvl: number;
  pool: ArrayLike<number>;
}

export const FIT_COLUMN = {
  verdict: "fitVerdict",
  diff: "fitDiff",
  style: "fitStyle",
  ability: "fitAbility",
  abilityDiff: "fitAbilityDiff",
} as const;

export const FIT_FIXED = [
  FIT_COLUMN.verdict,
  COLUMN.perf,
  FIT_COLUMN.diff,
  FIT_COLUMN.style,
  FIT_COLUMN.ability,
  FIT_COLUMN.abilityDiff,
];
export const FIT_SORT = { id: FIT_COLUMN.verdict, desc: false } as const;

function verdictColumn({ cols, lvl }: FitSource) {
  const verdictAt = (i: number) => fitVerdict(cols.diff[i], lvl);
  const verdict = i18n.t("verdict");
  return customColumn({
    id: FIT_COLUMN.verdict,
    abbr: verdict,
    label: elencoT("fitColumns.verdictLabel", { points: marginPoints(lvl) }),
    description: elencoT("fitColumns.verdictDescription", { points: marginPoints(lvl) }),
    width: 116,
    align: "start",
    sortKey: () => cols.order,
    exports: [
      {
        header: verdict,
        get: (i) => {
          const v = verdictAt(i);
          return v ? fitLabel(v) : null;
        },
      },
    ],
    render(i) {
      const v = verdictAt(i);
      if (!v) return <EmptyCell title={elencoT("fitColumns.noMine")} />;
      return <VerdictChip label={fitLabel(v)} tone={FIT_TONE[v]} title={fitRule(v, lvl)} />;
    },
  });
}

export function fitTableColumns(base: readonly TableColumn[], source: FitSource): TableColumn[] {
  const { cols, pool } = source;
  return [
    ...withSlotPerformance(base, cols.perf, pool),
    verdictColumn(source),
    pageNumber({
      id: FIT_COLUMN.diff,
      abbr: elencoT("fitColumns.diff.abbr"),
      label: elencoT("fitColumns.diff.label"),
      description: elencoT("fitColumns.diff.description"),
      width: 64,
      value: cols.diff,
      format: (v) => formatSigned(v, 0),
      tier: { scale: "delta" },
    }),
    pageNumber({
      id: FIT_COLUMN.style,
      abbr: elencoT("fitColumns.style.abbr"),
      label: elencoT("fitColumns.style.label"),
      description: elencoT("fitColumns.style.description"),
      width: 64,
      value: cols.style,
      format: (v) => `${formatCount(v)}%`,
      tier: { scale: "score" },
    }),
    pageNumber({
      id: FIT_COLUMN.ability,
      abbr: elencoT("fitColumns.ability.abbr"),
      label: elencoT("fitColumns.ability.label"),
      description: elencoT("fitColumns.ability.description"),
      width: 76,
      value: cols.ability,
      format: (v) => formatFixed(v, 1),
      tier: { scale: "score", basis: cols.abilityPct, missing: "group" },
    }),
    pageNumber({
      id: FIT_COLUMN.abilityDiff,
      abbr: elencoT("fitColumns.abilityDiff.abbr"),
      label: elencoT("fitColumns.abilityDiff.label"),
      description: elencoT("fitColumns.abilityDiff.description"),
      width: 84,
      value: cols.abilityDiff,
      format: (v) => formatSigned(v, 1),
      tier: { scale: "delta", basis: cols.abilityPctDiff },
    }),
  ];
}
