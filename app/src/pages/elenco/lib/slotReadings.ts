import type { PlayerRecord } from "@/data/types";
import { minutesOf } from "@/engine/club";
import { type RoleDef, type RolePhase, roleById } from "@/engine/roles/catalog";
import type { ShapeSlot } from "@/engine/tacticShape";
import { elencoT } from "./elencoT";
import { type RolePerf, rolePerfIn } from "./performance";
import { positionName } from "./slots";

export interface RoleReading {
  role: RoleDef;
  perf: number;
  elsewhere: string | null;
}

export function slotReadings(
  slot: ShapeSlot,
  holder: number | null,
  phases: readonly RolePhase[],
  layout: RolePhase,
  perfOf: RolePerf,
): RoleReading[] {
  return phases.flatMap((phase) => {
    const role = roleById(slot[phase].roleId);
    if (!role) return [];
    const moved = phase !== layout && slot[phase].position !== slot[layout].position;
    return [
      {
        role,
        perf: rolePerfIn(perfOf, holder, slot, phase),
        elsewhere: moved ? positionName(slot[phase].position) : null,
      },
    ];
  });
}

export function noScoreReason(player: PlayerRecord | null, poolMinutes: number): string | undefined {
  if (!player) return undefined;
  return minutesOf(player) < poolMinutes
    ? elencoT("pitch.fewMinutes", { minutes: poolMinutes })
    : elencoT("pitch.noRoleScore");
}
