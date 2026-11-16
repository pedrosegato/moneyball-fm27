import type { PlayerRecord } from "@/data/types";
import { minutesOf } from "@/engine/club";
import { qualityTier, type Tier } from "@/lib/quality";

export interface SlotNeeds {
  needs: { slot: number; perf: number | null }[];
  noData: { slot: number; minutes: number }[];
}

const WEAK: ReadonlySet<Tier> = new Set(["abaixo", "ruim"]);

export function slotNeeds(
  players: readonly PlayerRecord[],
  poolMinutes: number,
  xi: readonly (number | null)[],
  perfOfSlot: (slot: number) => number,
): SlotNeeds {
  const empty: SlotNeeds["needs"] = [];
  const weak: { slot: number; perf: number }[] = [];
  const noData: SlotNeeds["noData"] = [];
  xi.forEach((i, slot) => {
    if (i === null) {
      empty.push({ slot, perf: null });
      return;
    }
    const perf = perfOfSlot(slot);
    if (Number.isNaN(perf)) {
      const minutes = minutesOf(players[i]);
      if (minutes < poolMinutes) noData.push({ slot, minutes });
      return;
    }
    const tier = qualityTier(perf);
    if (tier && WEAK.has(tier)) weak.push({ slot, perf });
  });
  weak.sort((a, b) => a.perf - b.perf || a.slot - b.slot);
  return { needs: [...empty, ...weak], noData };
}
