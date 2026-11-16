import { NO_ROLE } from "@/engine/analysis/roles";
import type { Composite } from "@/engine/composites";
import type { AnalysisResult } from "@/engine/index";
import { GK_INDEX } from "@/engine/positions";
import { ROLES } from "@/engine/roles/catalog";
import { STATS } from "@/engine/stats/catalog";
import { roles } from "@/i18n/pt-BR/roles";
import { customColumn } from "../lib/customColumn";
import { tableText } from "../lib/tableText";
import { OWN_PERFORMANCE, PERFORMANCE_ROLE } from "../presets";
import { chip, number, signedFormat } from "./factories";
import { COLUMN_GROUP, PLAYER_COLUMN } from "./ids";
import { columnCopy, compositeAbbr, ownGroupAgainst, roleAgainst } from "./labels";
import { missingReason, type Reason } from "./missing";
import type { ChipColumn, TableColumn, TableSource } from "./types";

const { composites: group } = COLUMN_GROUP;

const STAT_ABBR = new Map(STATS.map((d) => [d.key, d.abbr]));

export function compositeDescription(c: Composite): string {
  const stats = Object.keys(c.weights)
    .filter((k) => c.weights[k] > 0)
    .map((k) => STAT_ABBR.get(k) ?? k);
  const listed =
    stats.length > 5
      ? tableText("composite.andMore", { listed: stats.slice(0, 4).join(", "), rest: stats.length - 4 })
      : stats.join(", ");
  return tableText(c.kind === "weightedSum" ? "composite.sum" : "composite.mean", { stats: listed });
}

function meanReason(c: Composite, analysis: AnalysisResult, value: ArrayLike<number>, pct: ArrayLike<number>): Reason {
  const { cols, pool, group: groups } = analysis;
  const stats = Object.keys(c.weights).filter((k) => c.weights[k] > 0 && cols[k]);
  const otherSide = (i: number) => (c.gkOnly && groups[i] !== GK_INDEX) || (c.outfieldOnly && groups[i] === GK_INDEX);
  const valued = (k: string, i: number) => !Number.isNaN(cols[k][i]);
  return (i) => {
    if (!Number.isNaN(value[i]) || otherSide(i)) return missingReason(i, value, pct, [], pool);
    if (!pool[i]) return stats.some((k) => valued(k, i)) ? "pool" : undefined;
    return stats.some((k) => valued(k, i) && Number.isNaN(analysis.pct[k][i])) ? "group" : undefined;
  };
}

function ownPerformance(analysis: AnalysisResult): TableColumn[] {
  const own = columnCopy(OWN_PERFORMANCE);
  const { pool, roleShown, poolMinutes } = analysis;
  const roleOf = (i: number) => (roleShown[i] === NO_ROLE ? undefined : ROLES[roleShown[i]]);
  return [
    chip(
      {
        id: own.id,
        abbr: own.abbr,
        def: { label: own.label, unit: "score", description: own.description },
        group,
        value: analysis.rolePerf,
        pct: analysis.rolePerf,
        against: (i) => {
          const role = roleOf(i);
          return role ? roleAgainst(role, poolMinutes) : "";
        },
      },
      pool,
    ),
    {
      ...customColumn({
        ...columnCopy(PERFORMANCE_ROLE),
        width: 156,
        align: "start",
        sortKey: () => Float64Array.from(roleShown, (k) => (k === NO_ROLE ? Number.NaN : k)),
        exports: [{ header: tableText("roleExport"), get: (i) => roleOf(i)?.name ?? null }],
        render: (i) => {
          const role = roleOf(i);
          if (!role) return null;
          return (
            <span
              className="min-w-0 truncate"
              title={tableText("roleCaption", { name: role.name, phase: roles.phase[role.phase] })}
            >
              {role.name}
            </span>
          );
        },
      }),
      group,
    },
    number(
      {
        ...columnCopy(PLAYER_COLUMN.statsVsAbility),
        width: 124,
        value: analysis.statsVsAbility,
        format: signedFormat(0),
        tier: { scale: "delta" },
      },
      group,
      pool,
    ),
  ];
}

function userComposites({ analysis, composites }: TableSource): ChipColumn[] {
  const against = ownGroupAgainst(analysis);
  return composites.flatMap((c) => {
    const value = analysis.composites[c.id];
    const pct = analysis.compositePct[c.id];
    if (!value || !pct) return [];
    const def = {
      label: c.label,
      unit: c.kind === "weightedSum" ? "per90" : "ratio",
      description: compositeDescription(c),
    } as const;
    const reason = c.kind === "percentileMean" ? meanReason(c, analysis, value, pct) : undefined;
    const abbr = compositeAbbr(c.id, c.label);
    return [chip({ id: c.id, abbr, def, group, value, pct, reason, against }, analysis.pool)];
  });
}

export function compositeColumns(source: TableSource): TableColumn[] {
  return [...ownPerformance(source.analysis), ...userComposites(source)];
}
