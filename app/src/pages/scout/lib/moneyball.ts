import type { EngineSettings } from "@/engine/analysis/input";
import { COLUMN } from "@/engine/columnIds";
import { OWN_PERFORMANCE } from "@/table/presets";

export type MoneyballThresholds = EngineSettings["moneyball"];

export const MONEYBALL_SORT = { id: COLUMN.valueRatio, desc: true } as const;

export const MONEYBALL_COLUMNS = [
  COLUMN.fair,
  COLUMN.valueRatio,
  OWN_PERFORMANCE,
  COLUMN.statsVsAbility,
  COLUMN.monthsLeft,
];

export const MILLION = 1_000_000;

export const sameCriteria = (a: MoneyballThresholds, b: MoneyballThresholds): boolean =>
  a.minRatio === b.minRatio && a.minPerf === b.minPerf && a.minFair === b.minFair;
