import type { PlayerRecord } from "@/data/types";
import { STATS, statIndex } from "./catalog";
import { LEGACY_STAT_KEYS } from "./legacyKeys";

export interface DeriveOptions {
  applyMinSample?: boolean;
}

const MINUTES = -1;
const LEGACY = new Set(LEGACY_STAT_KEYS);
const SAMPLED = STATS.flatMap((def, j) => {
  const rules = (def.minSample ?? []).map((m) => ({ col: m.of === "minutes" ? MINUTES : statIndex(m.of), min: m.min }));
  return rules.length ? [{ j, legacy: LEGACY.has(def.key), rules }] : [];
});

export function deriveAll(
  records: readonly PlayerRecord[],
  { applyMinSample = true }: DeriveOptions = {},
): Float64Array[] {
  const n = records.length;
  const cols = STATS.map(() => new Float64Array(n));
  for (let i = 0; i < n; i++) {
    const r = records[i];
    for (let j = 0; j < STATS.length; j++) cols[j][i] = STATS[j].compute(r) ?? NaN;
  }

  let minutes: Float64Array | undefined;
  const minutesCol = () => (minutes ??= Float64Array.from(records, (r) => r.season?.minutes ?? 0));
  for (const { j, legacy, rules } of SAMPLED) {
    if (legacy && !applyMinSample) continue;
    const col = cols[j];
    for (const { col: of, min } of rules) {
      const sample = of === MINUTES ? minutesCol() : cols[of];
      for (let i = 0; i < n; i++) if (!(sample[i] >= min)) col[i] = NaN;
    }
  }
  return cols;
}
