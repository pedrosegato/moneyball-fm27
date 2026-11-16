import type { PlayerRecord } from "@/data/types";

export type HeaderCheck = "all" | "some" | "none";

export function toggled(selected: ReadonlySet<number>, uid: number): Set<number> {
  const next = new Set(selected);
  if (next.has(uid)) next.delete(uid);
  else next.add(uid);
  return next;
}

export function selectRange(
  selected: ReadonlySet<number>,
  shown: ArrayLike<number>,
  anchor: number | null,
  target: number,
): Set<number> {
  const at = anchor === null ? -1 : indexIn(shown, anchor);
  const to = indexIn(shown, target);
  if (at < 0 || to < 0) return toggled(selected, target);
  const on = !selected.has(target);
  const next = new Set(selected);
  for (let k = Math.min(at, to); k <= Math.max(at, to); k++) {
    if (on) next.add(shown[k]);
    else next.delete(shown[k]);
  }
  return next;
}

export function selectedAmong(selected: ReadonlySet<number>, shown: ArrayLike<number>): number {
  if (selected.size === 0) return 0;
  let count = 0;
  for (let k = 0; k < shown.length; k++) if (selected.has(shown[k])) count++;
  return count;
}

export const checkOf = (count: number, total: number): HeaderCheck =>
  count === 0 ? "none" : count === total ? "all" : "some";

export const headerCheck = (selected: ReadonlySet<number>, shown: ArrayLike<number>): HeaderCheck =>
  checkOf(selectedAmong(selected, shown), shown.length);

export function toggledVisible(selected: ReadonlySet<number>, shown: ArrayLike<number>): Set<number> {
  const clear = headerCheck(selected, shown) === "all";
  const next = new Set(selected);
  for (let k = 0; k < shown.length; k++) {
    if (clear) next.delete(shown[k]);
    else next.add(shown[k]);
  }
  return next;
}

function indexIn(shown: ArrayLike<number>, uid: number): number {
  for (let k = 0; k < shown.length; k++) if (shown[k] === uid) return k;
  return -1;
}

const INDEX_OF = new WeakMap<readonly PlayerRecord[], Map<number, number>>();
export function uidIndex(players: readonly PlayerRecord[]): Map<number, number> {
  let index = INDEX_OF.get(players);
  if (!index) {
    index = new Map(players.map((p, i) => [p.uid, i]));
    INDEX_OF.set(players, index);
  }
  return index;
}

export function keptIn(selected: ReadonlySet<number>, players: readonly PlayerRecord[]): ReadonlySet<number> {
  const index = uidIndex(players);
  for (const uid of selected) {
    if (!index.has(uid)) return new Set([...selected].filter((u) => index.has(u)));
  }
  return selected;
}
