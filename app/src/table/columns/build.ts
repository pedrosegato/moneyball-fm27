import { minutesOf } from "@/engine/club";
import { STATS } from "@/engine/stats/catalog";
import { compositeColumns } from "./composites";
import { chip, fromPlayers } from "./factories";
import { identityColumns } from "./identity";
import { ownGroupAgainst } from "./labels";
import { statSamples } from "./missing";
import type { TableColumn, TableSource } from "./types";

export function buildColumns(source: TableSource): TableColumn[] {
  const { players, analysis } = source;
  const minutes = fromPlayers(players, minutesOf);
  const against = ownGroupAgainst(analysis);
  const stats = STATS.map((d) =>
    chip(
      {
        id: d.key,
        abbr: d.abbr,
        def: d,
        group: d.group,
        value: analysis.cols[d.key],
        pct: analysis.pct[d.key],
        samples: statSamples(d, analysis.cols, minutes),
        against,
      },
      analysis.pool,
    ),
  );
  return [...identityColumns(source, minutes), ...stats, ...compositeColumns(source)];
}
