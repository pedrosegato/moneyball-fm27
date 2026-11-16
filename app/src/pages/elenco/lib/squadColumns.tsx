import { EmptyCell } from "@/components/EmptyCell";
import { VerdictChip } from "@/components/VerdictChip";
import type { PlayerRecord } from "@/data/types";
import { minutesOf } from "@/engine/club";
import { COLUMN } from "@/engine/columnIds";
import type { AnalysisResult } from "@/engine/index";
import type { SellKeepOptions } from "@/engine/sellKeep";
import { i18n } from "@/i18n";
import { NAME_COLUMN } from "@/table/columns/ids";
import type { CustomColumn, TableColumn } from "@/table/columns/types";
import { customColumn } from "@/table/lib/customColumn";
import { elencoT } from "./elencoT";
import { reasonsText, VERDICT_DIRECTION, verdictLabel, verdictRule } from "./sellKeepText";
import { squadCaption, verdictOrder } from "./squadRows";

const TONE = { stay: "high", leave: "low", neutral: "mid" } as const;

export const SELL_KEEP_COLUMN = "sellKeep";
export const SQUAD_FIXED = [SELL_KEEP_COLUMN, COLUMN.perf, COLUMN.fair, COLUMN.monthsLeft] as const;

interface SquadSource {
  players: readonly PlayerRecord[];
  analysis: AnalysisResult;
  clubUid: number | null;
  options: SellKeepOptions;
}

function sellKeepColumn({ players, analysis, options }: SquadSource): CustomColumn {
  const verdictOf = (i: number) => analysis.sellKeep[players[i].uid] ?? null;
  const reasonsOf = (i: number) => {
    const v = verdictOf(i);
    return v ? reasonsText(v.reasons, minutesOf(players[i])) : null;
  };
  const order = Float64Array.from(players, (_, i) => verdictOrder(verdictOf(i)?.verdict ?? null, analysis.perf[i]));
  return customColumn({
    id: SELL_KEEP_COLUMN,
    abbr: elencoT("sellKeep.column.abbr"),
    label: elencoT("sellKeep.column.label"),
    description: elencoT("sellKeep.column.description"),
    width: 440,
    align: "start",
    sortKey: () => order,
    exports: [
      {
        header: i18n.t("verdict"),
        get: (i) => {
          const v = verdictOf(i);
          return v ? verdictLabel(v.verdict) : null;
        },
      },
      { header: elencoT("sellKeep.column.reasons"), get: reasonsOf },
    ],
    render(i) {
      const v = verdictOf(i);
      if (!v) return <EmptyCell title={elencoT("sellKeep.column.noVerdict")} />;
      const why = reasonsOf(i) ?? "";
      return (
        <>
          <VerdictChip
            label={verdictLabel(v.verdict)}
            tone={TONE[VERDICT_DIRECTION[v.verdict]]}
            title={verdictRule(v.verdict, options)}
          />
          <span className="min-w-0 truncate type-label text-fg-muted" title={why}>
            {why}
          </span>
        </>
      );
    },
  });
}

export function squadColumns(base: readonly TableColumn[], source: SquadSource): TableColumn[] {
  const { players, clubUid } = source;
  const named = base.map((c) =>
    c.id === NAME_COLUMN && c.kind === "text" ? { ...c, caption: (i: number) => squadCaption(players[i], clubUid) } : c,
  );
  return [...named, sellKeepColumn(source)];
}
