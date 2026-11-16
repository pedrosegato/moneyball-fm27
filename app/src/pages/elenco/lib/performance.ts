import { isRoleId, type RoleId, type RolePhase } from "@/engine/roles/catalog";
import type { ShapeSlot } from "@/engine/tacticShape";

export type RolePerf = (index: number | null, role: RoleId) => number;

export function rolePerfIn(perfOf: RolePerf, index: number | null, slot: ShapeSlot, phase: RolePhase): number {
  const role = slot[phase].roleId;
  return isRoleId(role) ? perfOf(index, role) : NaN;
}

export function weakestRolePerf(
  perfOf: RolePerf,
  index: number | null,
  slot: ShapeSlot,
  phases: readonly RolePhase[],
): number {
  const scores = phases.map((phase) => rolePerfIn(perfOf, index, slot, phase)).filter(Number.isFinite);
  return scores.length === 0 ? NaN : Math.min(...scores);
}
