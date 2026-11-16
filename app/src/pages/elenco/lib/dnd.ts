import type { Active } from "@dnd-kit/core";
import type { PlayerRecord } from "@/data/types";
import { FIT_RATING, type PosName, positionRating } from "@/engine/positions";
import type { RolePhase } from "@/engine/roles/catalog";
import { FM_SPOTS, moveSlot, type ShapeSlot, type Spot, sameSpot } from "@/engine/tacticShape";
import { clearSlot, type EditableLineup, type Picks, placePlayer, swapSlots } from "./lineupEdits";
import { freeSpots, layoutSpots } from "./pitchView";

export const OFF_PITCH = "off-pitch";
export const PITCH = "pitch";

export interface DragData {
  index: number;
}

export const slotId = (slot: number) => `slot:${slot}`;
export const playerId = (uid: number) => `player:${uid}`;
export const freeSpotId = ({ row, col }: Spot) => `spot:${row}-${col}`;

type Id = string | number | null | undefined;
const SLOT_ID = /^slot:(\d+)$/;
const PLAYER_ID = /^player:(\d+)$/;
const SPOT_ID = /^spot:(\d+)-(\d+)$/;
const matchOf = (pattern: RegExp, id: Id) => (typeof id === "string" ? pattern.exec(id) : null);
const numberIn = (pattern: RegExp, id: Id): number | null => {
  const m = matchOf(pattern, id);
  return m ? Number(m[1]) : null;
};
export const slotOf = (id: Id) => numberIn(SLOT_ID, id);
export const playerOf = (id: Id) => numberIn(PLAYER_ID, id);
export function freeSpotOf(id: Id): Spot | null {
  const m = matchOf(SPOT_ID, id);
  return m ? { row: Number(m[1]), col: Number(m[2]) } : null;
}

function picksEdit(active: string, over: string | null, picks: Picks): Picks | null {
  const from = slotOf(active);
  if (over === OFF_PITCH) return from === null ? null : clearSlot(picks, from);
  const to = slotOf(over);
  if (to === null) return null;
  if (from !== null) return from === to ? null : swapSlots(picks, from, to);
  const uid = playerOf(active);
  return uid === null || picks[String(to)] === uid ? null : placePlayer(picks, to, uid);
}

export function dropEdit(
  active: string,
  over: string | null,
  lineup: EditableLineup,
  phase: RolePhase,
): EditableLineup | null {
  const spot = freeSpotOf(over);
  if (spot) {
    const from = slotOf(active);
    const slots = from === null ? null : moveSlot(lineup.slots, from, phase, spot);
    return slots && { ...lineup, slots };
  }
  const picks = picksEdit(active, over, lineup.picks);
  return picks && { ...lineup, picks };
}

export function landingShape(
  slots: readonly ShapeSlot[],
  slot: number,
  layout: RolePhase,
  over: string | null,
): ShapeSlot {
  const target = slotOf(over);
  if (target !== null) return slots[target] ?? slots[slot];
  const spot = freeSpotOf(over);
  const moved = spot && moveSlot(slots, slot, layout, spot);
  return (moved ?? slots)[slot];
}

export function canMove(active: string, slots: readonly ShapeSlot[]): boolean {
  const from = slotOf(active);
  const slot = from === null ? undefined : slots[from];
  return slot !== undefined && slot.ip.position !== "GK" && slot.oop.position !== "GK";
}

export function dropTargets(active: string, slots: readonly ShapeSlot[], layout: RolePhase): string[] {
  const taken = layoutSpots(slots, layout);
  const free = canMove(active, slots) ? freeSpots(taken) : [];
  return FM_SPOTS.flatMap((spot) => {
    const slot = taken.findIndex((s) => sameSpot(s, spot));
    if (slot >= 0) return [slotId(slot)];
    return free.some((s) => sameSpot(s, spot)) ? [freeSpotId(spot)] : [];
  });
}

export function fitOf(pos: readonly number[], position: PosName): { good: boolean; rating: number } {
  const rating = positionRating(pos, position);
  return { good: rating >= FIT_RATING, rating };
}

export type DropFit = "good" | "poor" | null;

export const carriedIndex = (active: Active) => (active.data.current as DragData | undefined)?.index ?? null;

export function carriedFit(active: Active | null, players: readonly PlayerRecord[], position: PosName): DropFit {
  const index = active && carriedIndex(active);
  if (index === null) return null;
  return fitOf(players[index].pos, position).good ? "good" : "poor";
}

const STEP: Record<string, number> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };

export function keyboardStep(
  order: readonly string[],
  from: string | null,
  code: string,
  start: string,
): string | null {
  const step = STEP[code];
  if (step === undefined) return null;
  const at = from === null ? -1 : order.indexOf(from);
  if (at < 0) return start;
  return order[(at + step + order.length) % order.length];
}
