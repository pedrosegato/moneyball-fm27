import { useTranslation } from "react-i18next";
import { POS_NAMES } from "@/engine/positions";
import { cn } from "@/lib/utils";
import { PitchCountSlot } from "./PitchCountSlot";
import { PitchLevelSlot } from "./PitchLevelSlot";
import { PitchMarkings } from "./PitchMarkings";
import { PITCH_SLOT, type PitchLevel, type PitchPosition, POSITION_LABEL } from "./pitch";

type PitchMapProps = { label?: string; className?: string } & (
  | {
      mode: "counts";
      counts: Partial<Record<PitchPosition, number>>;
      names?: Partial<Record<PitchPosition, readonly string[]>>;
    }
  | { mode: "highlight"; levels: Partial<Record<PitchPosition, PitchLevel>> }
);

const NO_NAMES: readonly string[] = [];

export function PitchMap(props: PitchMapProps) {
  const { t } = useTranslation();
  const { label = t("pitch.label"), className } = props;
  return (
    <div className={cn("relative w-fit rounded-xl border border-line bg-surface-raised px-3 py-2.5", className)}>
      <PitchMarkings />
      <ul
        aria-label={label}
        className="relative grid grid-cols-[repeat(3,3.25rem)] grid-rows-[repeat(7,1.5rem)] gap-x-2 gap-y-1.5"
      >
        {POS_NAMES.map((pos) => {
          const [col, row] = PITCH_SLOT[pos];
          const position = t("pitch.position", { label: POSITION_LABEL[pos], code: pos });
          const place = { gridColumn: col, gridRow: row };
          return props.mode === "counts" ? (
            <PitchCountSlot
              key={pos}
              pos={pos}
              position={position}
              count={props.counts[pos] ?? 0}
              names={props.names?.[pos] ?? NO_NAMES}
              place={place}
            />
          ) : (
            <PitchLevelSlot key={pos} pos={pos} position={position} level={props.levels[pos]} place={place} />
          );
        })}
      </ul>
    </div>
  );
}
