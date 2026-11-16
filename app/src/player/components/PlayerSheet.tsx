import { useId } from "react";
import { cn } from "@/lib/utils";
import { useData } from "@/store/useData";
import { usePlayerMinutes } from "../hooks/usePlayerMinutes";
import { usePlayerSheet } from "../hooks/usePlayerSheet";
import { isEnding, isStarting } from "../hooks/useSheetPresence";
import { PlayerProfile } from "./PlayerProfile";

const flag = (on: boolean) => (on ? "" : undefined);

export function PlayerSheet() {
  const { snapshot, analysis } = useData();
  const { panel, shown, close } = usePlayerSheet(analysis);
  const titleId = useId();
  const players = snapshot?.players;
  const minutes = usePlayerMinutes(players);
  const i = shown && analysis ? analysis.uids.indexOf(shown.uid) : -1;
  const player = i >= 0 && players && players[i]?.uid === shown?.uid ? players[i] : null;

  if (!shown || !player || !analysis || !minutes) return null;
  return (
    <dialog
      ref={panel}
      open
      aria-labelledby={titleId}
      tabIndex={-1}
      data-slot="player-sheet"
      data-side="right"
      data-starting-style={flag(isStarting(shown))}
      data-ending-style={flag(isEnding(shown))}
      data-instant={flag(shown.instant)}
      inert={isEnding(shown)}
      className={cn(
        "absolute inset-y-0 right-0 left-auto z-30 flex h-auto w-(--panel-width) max-w-full flex-col border-l border-line bg-surface-raised text-sm text-inherit shadow-lg outline-none",
        "motion-wipe [--wipe-exit:var(--duration-panel)]",
        "xl:static xl:z-auto xl:shadow-none",
      )}
    >
      <PlayerProfile player={player} i={i} analysis={analysis} minutes={minutes} titleId={titleId} onClose={close} />
    </dialog>
  );
}
