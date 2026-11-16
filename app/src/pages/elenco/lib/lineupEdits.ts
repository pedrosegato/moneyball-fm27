import type { Lineup } from "@/engine/tacticalFit";
import type { ShapeSlot } from "@/engine/tacticShape";

export type Picks = Record<string, number | null>;

export interface EditableLineup {
  slots: readonly ShapeSlot[];
  picks: Picks;
}

const SLOT_COUNT = 11;

export function frozenPicks(xi: readonly (number | null)[]): Picks {
  return Object.fromEntries(Array.from({ length: SLOT_COUNT }, (_, s) => [String(s), xi[s] ?? null]));
}

export function placePlayer(picks: Picks, slot: number, uid: number): Picks {
  const next = { ...picks };
  const from = Object.keys(picks).find((key) => picks[key] === uid);
  if (from !== undefined) next[from] = picks[String(slot)] ?? null;
  next[String(slot)] = uid;
  return next;
}

export function swapSlots(picks: Picks, a: number, b: number): Picks {
  return { ...picks, [a]: picks[String(b)] ?? null, [b]: picks[String(a)] ?? null };
}

export function clearSlot(picks: Picks, slot: number): Picks {
  return { ...picks, [slot]: null };
}

export function namesEverySlot(picks: Readonly<Picks>, slotCount: number): boolean {
  return Array.from({ length: slotCount }, (_, s) => String(s) in picks).every(Boolean);
}

export const sameSlots = (a: readonly string[], b: readonly string[]): boolean =>
  a.length === b.length && a.every((slot, k) => slot === b[k]);

export function carriedOver(from: Lineup, slots: readonly string[]): (number | null)[] {
  const taken = new Set<number>();
  return slots.map((slot) => {
    const k = from.slots.findIndex((s, j) => s === slot && from.xi[j] !== null && !taken.has(j));
    if (k < 0) return null;
    taken.add(k);
    return from.xi[k];
  });
}
