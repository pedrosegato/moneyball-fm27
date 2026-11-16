import { DndContext, DragOverlay } from "@dnd-kit/core";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { type LineupDndOptions, useLineupDnd } from "../hooks/useLineupDnd";
import { LineupLock } from "../lib/lineupLock";
import type { RolePerf } from "../lib/performance";
import { CarriedCopy } from "./CarriedCopy";
import { OffPitch } from "./OffPitch";

interface LineupDndProps extends LineupDndOptions {
  perfOf: RolePerf;
  disabled: boolean;
  className?: string;
  children: ReactNode;
}

export function LineupDnd({ perfOf, disabled, className, children, ...options }: LineupDndProps) {
  const { carried, over, dropAnimation, context } = useLineupDnd(options);
  return (
    <LineupLock value={disabled}>
      <DndContext {...context} autoScroll={false}>
        <OffPitch className={className}>{children}</OffPitch>
        {createPortal(
          <DragOverlay dropAnimation={dropAnimation}>
            {carried && !carried.keyboard && (
              <CarriedCopy
                carried={carried}
                players={options.players}
                slots={options.slots}
                layout={options.layout}
                perfOf={perfOf}
                over={over}
              />
            )}
          </DragOverlay>,
          document.body,
        )}
      </DndContext>
    </LineupLock>
  );
}
