import type { LineupSlot, Tactic, TacticSide, TacticSlot } from "@/data/types";
import { POS_NAMES, type PosName, slotCode } from "./positions";
import { ROLES, type RoleDef, type RoleId, type RolePhase, roleById } from "./roles/catalog";
import { DEFAULT_FORMATION, FORMATIONS } from "./tacticalFit";

export type ShapeSlot = Omit<LineupSlot, "playerId">;
export interface Spot {
  row: number;
  col: number;
}
type Placement = Pick<TacticSlot, "position" | "side">;

export const SHAPE_SLOTS = 11;
export const FIT_RATING = 15;

const PHASES: readonly RolePhase[] = ["ip", "oop"];
const SIDES: readonly TacticSide[] = ["L", "C", "R"];
const CENTRE_COL: Record<TacticSide, number> = { L: 2, C: 3, R: 4 };
const GK_ROW = 6;

const CENTRAL_ROW: Partial<Record<PosName, number>> = { ST: 1, AMC: 2, MC: 3, DM: 4, DC: 5 };
const FLANK_ROW: Partial<Record<PosName, number>> = {
  AML: 2,
  AMR: 2,
  ML: 3,
  MR: 3,
  WBL: 4,
  WBR: 4,
  DL: 5,
  DR: 5,
};
const FLANK_SIDE: Partial<Record<PosName, TacticSide>> = {
  AML: "L",
  ML: "L",
  WBL: "L",
  DL: "L",
  AMR: "R",
  MR: "R",
  WBR: "R",
  DR: "R",
};

export function spotOf({ position, side }: Placement): Spot {
  if (position === "GK") return { row: GK_ROW, col: 3 };
  const flankRow = FLANK_ROW[position];
  if (flankRow) return { row: flankRow, col: FLANK_SIDE[position] === "L" ? 1 : 5 };
  const centralRow = CENTRAL_ROW[position];
  if (!centralRow) throw new Error(`No spot for position ${position}`);
  return { row: centralRow, col: CENTRE_COL[side] };
}

const CENTRAL_BY_ROW = new Map(Object.entries(CENTRAL_ROW).map(([position, row]) => [row, position as PosName]));
const FLANKS_BY_ROW = new Map<number, PosName[]>();
for (const [position, row] of Object.entries(FLANK_ROW)) {
  FLANKS_BY_ROW.set(row, [...(FLANKS_BY_ROW.get(row) ?? []), position as PosName]);
}

function spotsOfRow(row: number): Spot[] {
  if (row === GK_ROW) return [{ row, col: 3 }];
  const spots: Spot[] = [];
  if (FLANKS_BY_ROW.has(row)) spots.push({ row, col: 1 });
  for (const side of SIDES) spots.push({ row, col: CENTRE_COL[side] });
  if (FLANKS_BY_ROW.has(row)) spots.push({ row, col: 5 });
  return spots;
}

export const FM_SPOTS: readonly Spot[] = [1, 2, 3, 4, 5, GK_ROW].flatMap(spotsOfRow);

export const sameSpot = (a: Spot, b: Spot): boolean => a.row === b.row && a.col === b.col;

export function positionAt({ row, col }: Spot): Placement | null {
  if (!FM_SPOTS.some((s) => sameSpot(s, { row, col }))) return null;
  if (row === GK_ROW) return { position: "GK", side: "C" };
  if (col === 1 || col === 5) {
    const side: TacticSide = col === 1 ? "L" : "R";
    const position = FLANKS_BY_ROW.get(row)?.find((p) => FLANK_SIDE[p] === side);
    return position ? { position, side } : null;
  }
  const position = CENTRAL_BY_ROW.get(row);
  const side = SIDES.find((s) => CENTRE_COL[s] === col);
  return position && side ? { position, side } : null;
}

export function engineSlot(position: PosName): string {
  if (position === "GK" || position === "DM") return position;
  if (position === "ST") return "ST(C)";
  return `${position.slice(0, -1)}(${position.slice(-1)})`;
}

export const engineSlots = (slots: readonly ShapeSlot[]): string[] => slots.map((s) => engineSlot(s.ip.position));

export const DEFAULT_ROLE: Readonly<Record<RolePhase, Readonly<Partial<Record<PosName, RoleId>>>>> = {
  ip: {
    GK: "ip:0",
    DC: "ip:1",
    DL: "ip:2",
    DR: "ip:2",
    WBL: "ip:3",
    WBR: "ip:3",
    DM: "ip:4",
    MC: "ip:5",
    ML: "ip:6",
    MR: "ip:6",
    AML: "ip:7",
    AMR: "ip:7",
    AMC: "ip:9",
    ST: "ip:11",
  },
  oop: {
    GK: "oop:0",
    DC: "oop:3",
    DL: "oop:9",
    DR: "oop:9",
    WBL: "oop:12",
    WBR: "oop:12",
    DM: "oop:15",
    MC: "oop:20",
    ML: "oop:35",
    MR: "oop:35",
    AML: "oop:38",
    AMR: "oop:38",
    AMC: "oop:30",
    ST: "oop:42",
  },
};

export const rolesFor = (position: PosName, phase: RolePhase): RoleDef[] =>
  ROLES.filter((r) => r.phase === phase && r.positions.includes(position));

export function fitsRole(roleId: string, position: PosName, phase: RolePhase): boolean {
  const role = roleById(roleId);
  return role !== undefined && role.phase === phase && role.positions.includes(position);
}

function placementIsDrawable({ position, side }: Placement): boolean {
  if (position === "GK") return side === "C";
  const flankSide = FLANK_SIDE[position];
  if (flankSide) return side === flankSide;
  return position in CENTRAL_ROW;
}

function phaseIsValid(slots: readonly ShapeSlot[], phase: RolePhase): boolean {
  const taken = new Set<string>();
  for (const slot of slots) {
    const half = slot[phase];
    if (!placementIsDrawable(half) || !fitsRole(half.roleId, half.position, phase)) return false;
    const { row, col } = spotOf(half);
    taken.add(`${row},${col}`);
  }
  return taken.size === slots.length;
}

export function isValidShape(slots: readonly ShapeSlot[]): boolean {
  if (slots.length !== SHAPE_SLOTS) return false;
  const keepers = slots.filter((s) => s.ip.position === "GK");
  if (keepers.length !== 1 || slots.filter((s) => s.oop.position === "GK").length !== 1) return false;
  if (keepers[0].oop.position !== "GK") return false;
  return PHASES.every((phase) => phaseIsValid(slots, phase));
}

const withFittingRole = (half: TacticSlot, phase: RolePhase): TacticSlot =>
  fitsRole(half.roleId, half.position, phase)
    ? { ...half }
    : { ...half, roleId: DEFAULT_ROLE[phase][half.position] ?? half.roleId };

export function shapeFromTactic(tactic: Tactic): ShapeSlot[] | null {
  const slots = tactic.slots.map(({ ip, oop }) => ({
    ip: withFittingRole(ip, "ip"),
    oop: withFittingRole(oop, "oop"),
  }));
  return isValidShape(slots) ? slots : null;
}

const LANES: Record<number, readonly TacticSide[]> = { 1: ["C"], 2: ["L", "R"], 3: ["L", "C", "R"] };

export function shapeFromFormation(formation: string): ShapeSlot[] {
  const codes = (FORMATIONS[formation] ?? FORMATIONS[DEFAULT_FORMATION]).map(slotCode) as PosName[];
  const seen = new Map<PosName, number>();
  return codes.map((position) => {
    const central = position in CENTRAL_ROW;
    const count = codes.filter((c) => c === position).length;
    const k = seen.get(position) ?? 0;
    seen.set(position, k + 1);
    const side: TacticSide =
      position === "GK" ? "C" : central ? (LANES[count] ?? LANES[3])[k] : (FLANK_SIDE[position] ?? "C");
    const half = { position, side };
    return {
      ip: { ...half, roleId: DEFAULT_ROLE.ip[position] ?? "ip:0" },
      oop: { ...half, roleId: DEFAULT_ROLE.oop[position] ?? "oop:0" },
    };
  });
}

function replaceHalf(slots: readonly ShapeSlot[], slot: number, phase: RolePhase, half: TacticSlot): ShapeSlot[] {
  return slots.map((s, k) => (k === slot ? { ...s, [phase]: half } : { ...s }));
}

export function moveSlot(slots: readonly ShapeSlot[], slot: number, phase: RolePhase, to: Spot): ShapeSlot[] | null {
  const current = slots[slot];
  const target = positionAt(to);
  if (!current || !target || target.position === "GK") return null;
  if (current.ip.position === "GK" || current.oop.position === "GK") return null;
  if (slots.some((s, k) => k !== slot && sameSpot(spotOf(s[phase]), to))) return null;
  const moved = withFittingRole({ ...target, roleId: current[phase].roleId }, phase);
  return replaceHalf(slots, slot, phase, moved);
}

export function setSlotRole(
  slots: readonly ShapeSlot[],
  slot: number,
  phase: RolePhase,
  role: RoleId,
): ShapeSlot[] | null {
  const current = slots[slot]?.[phase];
  if (!current || !fitsRole(role, current.position, phase)) return null;
  return replaceHalf(slots, slot, phase, { ...current, roleId: role });
}

export const tacticKey = (tactic: Tactic): string => JSON.stringify([tactic.name, tactic.slots]);

export const positionRating = (pos: readonly number[], position: PosName): number =>
  pos[POS_NAMES.indexOf(position)] ?? 0;
