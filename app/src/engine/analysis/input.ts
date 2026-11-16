import type { Snapshot } from "@/data/types";
import type { Composite } from "../composites";
import { DEFAULT_VALUE_MODEL_OPTIONS, type ValueModelOptions } from "../fairValue";
import { DEFAULT_MONEYBALL_OPTIONS, type MoneyballOptions } from "../moneyball";
import type { Period } from "../period";
import type { RoleId } from "../roles/catalog";
import { DEFAULT_SELL_KEEP_OPTIONS, type SellKeepOptions } from "../sellKeep";
import { DEFAULT_FIT_OPTIONS, type FitOptions, type LineupChoice } from "../tacticalFit";

type Pooled<T> = Omit<T, "poolMinutes">;

export interface EngineSettings {
  poolMinutes: number;
  leagueAdjustment: number;
  fairValue: Pooled<ValueModelOptions>;
  moneyball: Omit<MoneyballOptions, "poolMinutes" | "excludeClubUid">;
  sellKeep: Pooled<SellKeepOptions>;
  fit: Pooled<FitOptions>;
  leagueWeights: Readonly<Record<string, number>>;
}

export const DEFAULT_LEAGUE_ADJUSTMENT = 1;

const { poolMinutes: POOL_MINUTES, ...fairValueDefaults } = DEFAULT_VALUE_MODEL_OPTIONS;
const { poolMinutes: _moneyballPool, excludeClubUid: _excluded, ...moneyballDefaults } = DEFAULT_MONEYBALL_OPTIONS;
const { poolMinutes: _sellKeepPool, ...sellKeepDefaults } = DEFAULT_SELL_KEEP_OPTIONS;
const { poolMinutes: _fitPool, ...fitDefaults } = DEFAULT_FIT_OPTIONS;

export const DEFAULT_ENGINE_SETTINGS: Readonly<EngineSettings> = Object.freeze<EngineSettings>({
  poolMinutes: POOL_MINUTES,
  leagueAdjustment: DEFAULT_LEAGUE_ADJUSTMENT,
  fairValue: Object.freeze(fairValueDefaults),
  moneyball: Object.freeze(moneyballDefaults),
  sellKeep: Object.freeze(sellKeepDefaults),
  fit: Object.freeze(fitDefaults),
  leagueWeights: Object.freeze({}),
});

export interface LineupInput extends LineupChoice {
  formation?: string;
  roles?: readonly string[];
}

export interface AnalysisInput {
  snapshot: Snapshot;
  composites: readonly Composite[];
  myClubUid: number | null;
  settings: EngineSettings;
  lineup?: LineupInput;
  role?: RoleId | null;
  period?: Period;
}
