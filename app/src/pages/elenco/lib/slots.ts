import { type PitchPosition, POSITION_LABEL } from "@/components/pitch";
import { type PosName, slotCode } from "@/engine/positions";
import { engineSlot } from "@/engine/tacticShape";
import { i18n } from "@/i18n";

export function slotLabel(slot: string): string {
  const code = slotCode(slot);
  return POSITION_LABEL[code as PitchPosition] ?? code;
}

export function slotName(slot: string): string {
  const code = slotCode(slot);
  const label = POSITION_LABEL[code as PitchPosition];
  return label ? i18n.t("pitch.position", { label, code }) : code;
}

export const positionName = (position: PosName): string => slotName(engineSlot(position));

export const PITCH_ROWS = 6;
export const PITCH_COLUMNS = 5;

export interface PitchSpot {
  row: number;
  col: number;
}

export function readingOrder(spots: readonly PitchSpot[]): number[] {
  return spots.map((_, s) => s).sort((a, b) => spots[a].row - spots[b].row || spots[a].col - spots[b].col);
}

export const gridPlace = ({ row, col }: PitchSpot) => ({ gridRow: row, gridColumn: col });
