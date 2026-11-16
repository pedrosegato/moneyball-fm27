import { useMemo } from "react";
import type { PlayerRecord } from "@/data/types";
import type { RolePhase } from "@/engine/roles/catalog";
import type { ShapeSlot } from "@/engine/tacticShape";
import { useAppStore } from "@/store/index";
import { slotNeeds } from "../lib/needs";
import { type RolePerf, weakestRolePerf } from "../lib/performance";

interface SlotNeedsSource {
  players: readonly PlayerRecord[];
  xi: readonly (number | null)[];
  slots: readonly ShapeSlot[];
  phases: readonly RolePhase[];
  perfOf: RolePerf;
}

export function useSlotNeeds({ players, xi, slots, phases, perfOf }: SlotNeedsSource) {
  const poolMinutes = useAppStore((s) => s.settings.engine.poolMinutes);
  const needs = useMemo(
    () => slotNeeds(players, poolMinutes, xi, (slot) => weakestRolePerf(perfOf, xi[slot], slots[slot], phases)),
    [players, poolMinutes, xi, slots, phases, perfOf],
  );
  const needSlots = useMemo(() => new Set(needs.needs.map((n) => n.slot)), [needs]);
  return { needs, needSlots };
}
