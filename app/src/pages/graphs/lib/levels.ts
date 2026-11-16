import { REFMIN, rankPercentile } from "@/engine/percentiles";
import { i18n } from "@/i18n";
import { qualityTier, TIERS, type Tier } from "@/lib/quality";
import { mean, type PointSet } from "./scatter";

export interface PointLevels {
  pct: Uint8Array;
  tier: Uint8Array;
  counts: Record<Tier, number>;
}

export function zScores(values: ArrayLike<number>, higherIsBetter: boolean): Float64Array {
  const n = values.length;
  const m = mean(values);
  let sq = 0;
  for (let k = 0; k < n; k++) sq += (values[k] - m) ** 2;
  const sd = Math.sqrt(sq / n);
  const out = new Float64Array(n);
  if (!(sd > 0)) return out;
  const scale = (higherIsBetter ? 1 : -1) / sd;
  for (let k = 0; k < n; k++) out[k] = (values[k] - m) * scale;
  return out;
}

export function combinedZ(points: PointSet, xHigh: boolean, yHigh: boolean): Float64Array {
  const zx = zScores(points.x, xHigh);
  const zy = zScores(points.y, yHigh);
  for (let k = 0; k < zx.length; k++) zx[k] += zy[k];
  return zx;
}

function countBelow(sorted: Float64Array, v: number, orEqual: boolean): number {
  let lo = 0;
  let hi = sorted.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (sorted[mid] < v || (orEqual && sorted[mid] === v)) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

const TIER_AT = Uint8Array.from({ length: 101 }, (_, p) => {
  const tier = qualityTier(p);
  return tier === null ? -1 : TIERS.indexOf(tier);
});

const allEqual = (values: ArrayLike<number>) => {
  for (let k = 1; k < values.length; k++) if (values[k] !== values[0]) return false;
  return true;
};

export function pointLevels(points: PointSet, xHigh: boolean, yHigh: boolean): PointLevels | null {
  const n = points.rows.length;
  if (n < REFMIN || (allEqual(points.x) && allEqual(points.y))) return null;
  const z = combinedZ(points, xHigh, yHigh);
  const sorted = Float64Array.from(z).sort();
  const pct = new Uint8Array(n);
  const tier = new Uint8Array(n);
  const perTier = new Uint32Array(TIERS.length);
  for (let k = 0; k < n; k++) {
    const below = countBelow(sorted, z[k], false);
    const p = rankPercentile(below, countBelow(sorted, z[k], true) - below, n);
    pct[k] = p;
    tier[k] = TIER_AT[p];
    perTier[tier[k]]++;
  }
  const counts = Object.fromEntries(TIERS.map((t, i) => [t, perTier[i]])) as Record<Tier, number>;
  return { pct, tier, counts };
}

export const noLevelsReason = (plotted: number): string =>
  plotted < REFMIN ? i18n.t("graphs:levels.tooFewShort", { min: REFMIN }) : i18n.t("graphs:levels.samePointShort");

export const NO_MARK = "none";
type Mark = Tier | typeof NO_MARK;

const MARK_FALLBACK: Record<Mark, string> = {
  elite: "#057c59",
  bom: "#62bcf1",
  mediano: "#f2e751",
  abaixo: "#f38f17",
  ruim: "#c73f15",
  [NO_MARK]: "#9ca5b4",
};

export function markColor(style: Pick<CSSStyleDeclaration, "getPropertyValue">, mark: Mark): string {
  const value = style.getPropertyValue(mark === NO_MARK ? "--text-muted" : `--tier-${mark}`).trim();
  return value || MARK_FALLBACK[mark];
}
