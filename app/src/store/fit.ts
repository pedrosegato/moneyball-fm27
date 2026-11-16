import type { StateCreator } from "zustand";
import type { Tactic } from "@/data/types";
import type { LineupInput } from "@/engine/analysis/input";
import { POS_NAMES } from "@/engine/positions";
import { DEFAULT_FORMATION, FORMATIONS } from "@/engine/tacticalFit";
import {
  engineSlots,
  isValidShape,
  type ShapeSlot,
  shapeFromFormation,
  shapeFromTactic,
  tacticKey,
} from "@/engine/tacticShape";
import type { AppState } from "./index";
import { CLUB_UID, fieldsOf, listOf, oneOf, positiveInt, recordOf, text } from "./sanitize";

export interface StoredShape {
  base: string | null;
  name: string | null;
  slots: ShapeSlot[];
}

export interface LineupState {
  formation: string;
  picks: Record<string, number | null>;
  shape?: StoredShape;
}

export type LineupSource = "app" | "game" | "formation";

export interface EffectiveLineup {
  source: LineupSource;
  name: string | null;
  base: string | null;
  slots: readonly ShapeSlot[];
  picks: Readonly<Record<string, number | null>>;
  gameChanged: boolean;
}

export interface FitState {
  lineups: Record<string, LineupState>;
}

export interface FitSlice {
  fit: FitState;
  setFormation(clubUid: number, formation: string): void;
  editLineup(clubUid: number, shape: StoredShape, picks: LineupState["picks"]): void;
  resetLineup(clubUid: number): void;
}

const FORMATION_NAMES = Object.keys(FORMATIONS);
const SLOTS = Math.max(...Object.values(FORMATIONS).map((f) => f.length));
const MAX_CLUBS = 50;
const MAX_SHAPE_SLOTS = 12;

const emptyLineup = (): LineupState => ({ formation: DEFAULT_FORMATION, picks: {} });

function updateLineup(
  s: AppState,
  clubUid: number,
  change: (lineup: LineupState) => LineupState,
): Pick<AppState, "fit"> {
  const key = String(clubUid);
  const lineup = s.fit.lineups[key] ?? emptyLineup();
  return { fit: { lineups: { ...s.fit.lineups, [key]: change(lineup) } } };
}

export const createFitSlice: StateCreator<AppState, [], [], FitSlice> = (set) => ({
  fit: { lineups: {} },
  setFormation: (clubUid, formation) => set((s) => updateLineup(s, clubUid, () => ({ ...emptyLineup(), formation }))),
  editLineup: (clubUid, shape, picks) => set((s) => updateLineup(s, clubUid, (l) => ({ ...l, shape, picks }))),
  resetLineup: (clubUid) => set((s) => updateLineup(s, clubUid, (l) => ({ formation: l.formation, picks: {} }))),
});

const DEFAULT_LINEUP: LineupState = Object.freeze({ ...emptyLineup(), picks: Object.freeze({}) });

export const lineupOf = (fit: FitState, clubUid: number): LineupState => fit.lineups[String(clubUid)] ?? DEFAULT_LINEUP;

export function effectiveLineup(lineup: LineupState, tactic: Tactic | null): EffectiveLineup {
  const gameSlots = tactic ? shapeFromTactic(tactic) : null;
  const gameKey = tactic && gameSlots ? tacticKey(tactic) : null;
  if (lineup.shape) {
    const { name, base, slots } = lineup.shape;
    return { source: "app", name, base, slots, picks: lineup.picks, gameChanged: gameKey !== null && gameKey !== base };
  }
  if (tactic && gameSlots) {
    const picks = Object.fromEntries(tactic.slots.map((s, i) => [String(i), s.playerId]));
    return { source: "game", name: tactic.name, base: gameKey, slots: gameSlots, picks, gameChanged: false };
  }
  return {
    source: "formation",
    name: null,
    base: null,
    slots: shapeFromFormation(lineup.formation),
    picks: lineup.picks,
    gameChanged: false,
  };
}

export function lineupFor(fit: FitState, clubUid: number | null, tactic: Tactic | null): LineupInput | undefined {
  if (clubUid === null) return undefined;
  const lineup = lineupOf(fit, clubUid);
  const effective = effectiveLineup(lineup, tactic);
  const roles = effective.slots.map((s) => s.ip.roleId);
  if (effective.source === "formation") return { formation: lineup.formation, picks: lineup.picks, roles };
  return { formation: lineup.formation, picks: effective.picks, slots: engineSlots(effective.slots), roles };
}

const SLOT_KEY = /^(?:0|[1-9]\d?)$/;
const isSlot = (key: string) => SLOT_KEY.test(key) && Number(key) < SLOTS;

function restorePicks(raw: unknown): LineupState["picks"] {
  const picks: LineupState["picks"] = {};
  for (const [slot, v] of Object.entries(fieldsOf(raw))) {
    if (!isSlot(slot)) continue;
    if (v === null) picks[slot] = null;
    else {
      const uid = positiveInt(v);
      if (uid !== null) picks[slot] = uid;
    }
  }
  return picks;
}

const SIDES = ["L", "C", "R"] as const;

function restoreHalf(raw: unknown) {
  const r = fieldsOf(raw);
  const position = oneOf(r.position, POS_NAMES);
  const side = oneOf(r.side, SIDES);
  if (!position || !side || typeof r.roleId !== "string") return null;
  return { position, side, roleId: r.roleId };
}

function restoreSlot(raw: unknown): ShapeSlot | null {
  const r = fieldsOf(raw);
  const ip = restoreHalf(r.ip);
  const oop = restoreHalf(r.oop);
  return ip && oop ? { ip, oop } : null;
}

function restoreShape(raw: unknown): StoredShape | null {
  const r = fieldsOf(raw);
  const slots = listOf(r.slots, restoreSlot, MAX_SHAPE_SLOTS);
  const base = text(r.base, 8000);
  const name = text(r.name, 200);
  const wellFormed = (raw: unknown, kept: string | null) => raw == null || kept !== null;
  if (!isValidShape(slots) || !wellFormed(r.base, base) || !wellFormed(r.name, name)) return null;
  return { base, name, slots };
}

function restoreLineup(raw: unknown, clubUid: string): LineupState | null {
  if (!CLUB_UID.test(clubUid)) return null;
  const r = fieldsOf(raw);
  const shape = restoreShape(r.shape);
  return {
    formation: oneOf(r.formation, FORMATION_NAMES) ?? DEFAULT_FORMATION,
    picks: restorePicks(r.picks),
    ...(shape ? { shape } : {}),
  };
}

export function restoreFit(raw: unknown): FitState {
  return { lineups: recordOf(fieldsOf(raw).lineups, restoreLineup, MAX_CLUBS) };
}
