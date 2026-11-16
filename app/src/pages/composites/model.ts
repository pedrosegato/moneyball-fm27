import type { Composite } from "@/engine/composites";
import { STATS, type StatDef, type StatKey } from "@/engine/stats/catalog";

export const STAT_DEFS = new Map(STATS.map((d) => [d.key, d]));

export const NEW_ITEM = "nova";

export const blankComposite = (): Composite => ({ id: NEW_ITEM, label: "", kind: "percentileMean", weights: {} });

export function sameWeights(a: Readonly<Record<StatKey, number>>, b: Readonly<Record<StatKey, number>>): boolean {
  const keys = Object.keys(a);
  return keys.length === Object.keys(b).length && keys.every((k) => a[k] === b[k]);
}

export function statOptions(c: Composite): StatDef[] {
  const held = Object.keys(c.weights);
  const defs = held.map((k) => STAT_DEFS.get(k));
  const keepers = c.gkOnly || c.group === "GK" || defs.some((d) => d?.gkOnly);
  const outfield = c.outfieldOnly || (c.group !== undefined && c.group !== "GK") || defs.some((d) => d?.outfieldOnly);
  const taken = new Set(held);
  return STATS.filter(
    (d) =>
      !taken.has(d.key) &&
      (c.kind !== "weightedSum" || d.unit === "per90") &&
      !(keepers && d.outfieldOnly) &&
      !(outfield && d.gkOnly),
  );
}

export function topPlayers(scores: ArrayLike<number>, mask: ArrayLike<number> | null, n: number): number[] {
  const top: number[] = [];
  for (let i = 0; i < scores.length; i++) {
    const v = scores[i];
    if (Number.isNaN(v) || (mask && !mask[i])) continue;
    if (top.length === n && v <= scores[top[n - 1]]) continue;
    let at = top.length;
    while (at > 0 && scores[top[at - 1]] < v) at--;
    top.splice(at, 0, i);
    if (top.length > n) top.pop();
  }
  return top;
}
