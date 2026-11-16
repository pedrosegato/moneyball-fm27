import type { CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { type PitchLevel, type PitchPosition, SLOT_BASE, SLOT_OFF, SLOT_ON, SLOT_SECONDARY } from "./pitch";

const LEVEL_SLOT: Record<PitchLevel, string> = { natural: SLOT_ON, secundaria: SLOT_SECONDARY };

interface PitchLevelSlotProps {
  pos: PitchPosition;
  position: string;
  level: PitchLevel | undefined;
  place: CSSProperties;
}

export function PitchLevelSlot({ pos, position, level, place }: PitchLevelSlotProps) {
  const { t } = useTranslation();
  return (
    <li
      aria-label={level ? t("pitch.slot", { position, detail: t(`pitch.${level}`) }) : position}
      data-level={level ?? "none"}
      style={place}
      className={cn(SLOT_BASE, level ? LEVEL_SLOT[level] : SLOT_OFF)}
    >
      {pos}
    </li>
  );
}
