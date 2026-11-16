import type { Snapshot } from "@/data/types";
import { applyPeriod, type Period } from "@/engine/period";

const byPeriod = new WeakMap<Snapshot, Map<Period, Snapshot>>();

export function periodSnapshot(snapshot: Snapshot, period: Period): Snapshot {
  let periods = byPeriod.get(snapshot);
  if (!periods) {
    periods = new Map();
    byPeriod.set(snapshot, periods);
  }
  let shown = periods.get(period);
  if (!shown) {
    shown = applyPeriod(snapshot, period);
    periods.set(period, shown);
  }
  return shown;
}
