import { useDroppable } from "@dnd-kit/core";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { PITCH_VIEW, type PitchView } from "@/store/ui";
import { PITCH } from "../lib/dnd";
import { viewPhases } from "../lib/pitchView";
import { ShapeLinks } from "./ShapeLinks";
import { TacticPitch, type TacticPitchProps } from "./TacticPitch";

const PANORAMA = [viewPhases(PITCH_VIEW.ip), viewPhases(PITCH_VIEW.oop)];
const PANORAMA_LABEL = { ip: "pitch.labelIp", oop: "pitch.labelOop" } as const;

interface PitchPanelProps extends Omit<TacticPitchProps, "layout" | "shown" | "editable" | "label" | "children"> {
  view: PitchView;
}

export function PitchPanel({ view, className, ...pitch }: PitchPanelProps) {
  const { t } = useTranslation("elenco");
  const { t: tRoles } = useTranslation("roles");
  const overview = view === PITCH_VIEW.overview;
  const { setNodeRef } = useDroppable({ id: PITCH, disabled: overview });
  if (overview) {
    return (
      <div ref={setNodeRef} className={cn("flex gap-3", className)}>
        {PANORAMA.map(({ layout, shown }) => (
          <div key={layout} className="flex min-w-0 flex-1 flex-col gap-1">
            <p className="type-caption text-fg-muted">{tRoles(`phase.${layout}`)}</p>
            <TacticPitch
              {...pitch}
              layout={layout}
              shown={shown}
              editable={false}
              label={t(PANORAMA_LABEL[layout])}
              className="min-h-0 flex-1"
            />
          </div>
        ))}
      </div>
    );
  }
  const { layout, shown } = viewPhases(view);
  return (
    <div ref={setNodeRef} className={cn("flex", className)}>
      <TacticPitch
        {...pitch}
        layout={layout}
        shown={shown}
        editable
        label={t("pitch.label")}
        className="min-w-0 flex-1"
      >
        {view === PITCH_VIEW.both && <ShapeLinks slots={pitch.slots} />}
      </TacticPitch>
    </div>
  );
}
