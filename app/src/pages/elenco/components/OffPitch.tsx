import { useDroppable } from "@dnd-kit/core";
import type { ReactNode } from "react";
import { OFF_PITCH } from "../lib/dnd";

export function OffPitch({ className, children }: { className?: string; children: ReactNode }) {
  const { setNodeRef } = useDroppable({ id: OFF_PITCH });
  return (
    <div ref={setNodeRef} className={className}>
      {children}
    </div>
  );
}
