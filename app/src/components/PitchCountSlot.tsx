import type { CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatCount } from "@/lib/format";
import { cn } from "@/lib/utils";
import { keyedByText, type PitchPosition, SLOT_BASE, SLOT_OFF, SLOT_ON } from "./pitch";

interface PitchCountSlotProps {
  pos: PitchPosition;
  position: string;
  count: number;
  names: readonly string[];
  place: CSSProperties;
}

export function PitchCountSlot({ pos, position, count, names, place }: PitchCountSlotProps) {
  const { t } = useTranslation();
  const players = t("players", { count });
  const content = (
    <>
      <span className={count > 0 ? "opacity-75" : undefined}>{pos}</span>
      <span className="type-label font-semibold">{formatCount(count)}</span>
    </>
  );
  if (!names.length) {
    return (
      <li
        aria-label={t("pitch.slot", { position, detail: players })}
        style={place}
        className={cn(SLOT_BASE, count > 0 ? SLOT_ON : SLOT_OFF)}
      >
        {content}
      </li>
    );
  }
  return (
    <li style={place} className="flex">
      <Tooltip>
        <TooltipTrigger
          render={
            <button
              type="button"
              aria-label={t("pitch.slotWithNames", { position, players, names: names.join(", ") })}
              className={cn(SLOT_BASE, SLOT_ON, "w-full focus-ring")}
            />
          }
        >
          {content}
        </TooltipTrigger>
        <TooltipContent side="left" className="flex-col items-start gap-0.5">
          {keyedByText(names).map(({ key, text }) => (
            <span key={key} className="max-w-60 truncate">
              {text}
            </span>
          ))}
        </TooltipContent>
      </Tooltip>
    </li>
  );
}
