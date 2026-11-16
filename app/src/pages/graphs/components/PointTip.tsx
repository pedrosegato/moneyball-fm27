import type { ReactNode } from "react";
import { tipFlips, tipShift } from "../lib/layout";

interface PointTipProps {
  x: number;
  y: number;
  width: number;
  height: number;
  children: ReactNode;
}

export function PointTip({ x, y, width, height, children }: PointTipProps) {
  return (
    <div
      role="tooltip"
      className="pointer-events-none absolute z-10 w-max max-w-64 rounded-lg bg-popover px-2.5 py-2 text-popover-foreground shadow-md ring-1 ring-line"
      style={{
        left: x,
        top: y,
        transform: `translate(${tipFlips(x, width) ? "calc(-100% - 14px)" : "14px"}, ${tipShift(y, height)})`,
      }}
    >
      {children}
    </div>
  );
}
