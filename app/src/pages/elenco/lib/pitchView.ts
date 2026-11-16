import type { RolePhase } from "@/engine/roles/catalog";
import { engineSlot, FM_SPOTS, positionAt, type ShapeSlot, type Spot, sameSpot, spotOf } from "@/engine/tacticShape";
import { PITCH_VIEW, type PitchView } from "@/store/ui";

export interface ViewPhases {
  layout: RolePhase;
  shown: readonly RolePhase[];
}

const BOTH: readonly RolePhase[] = ["ip", "oop"];

const PHASES: Readonly<Record<PitchView, ViewPhases>> = {
  [PITCH_VIEW.overview]: { layout: "ip", shown: BOTH },
  [PITCH_VIEW.ip]: { layout: "ip", shown: ["ip"] },
  [PITCH_VIEW.oop]: { layout: "oop", shown: ["oop"] },
  [PITCH_VIEW.both]: { layout: "ip", shown: BOTH },
};

export const viewPhases = (view: PitchView): ViewPhases => PHASES[view];

export const layoutSlots = (slots: readonly ShapeSlot[], layout: RolePhase): string[] =>
  slots.map((s) => engineSlot(s[layout].position));

export const layoutSpots = (slots: readonly ShapeSlot[], layout: RolePhase): Spot[] =>
  slots.map((s) => spotOf(s[layout]));

export const freeSpots = (taken: readonly Spot[]): Spot[] =>
  FM_SPOTS.filter((spot) => positionAt(spot)?.position !== "GK" && !taken.some((s) => sameSpot(s, spot)));
