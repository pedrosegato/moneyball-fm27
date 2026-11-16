import { useCallback, useState } from "react";
import type { PointSet } from "../lib/scatter";

const SOURCE = { pointer: "pointer", list: "list" } as const;
type HoverSource = (typeof SOURCE)[keyof typeof SOURCE];

interface Hover {
  k: number;
  from: HoverSource;
  points: PointSet;
}

export function usePointHover(points: PointSet) {
  const [hover, setHover] = useState<Hover | null>(null);
  const active = hover?.points === points ? hover.k : -1;
  const track = useCallback(
    (from: HoverSource, k: number) =>
      setHover((prev) => (k >= 0 ? { k, from, points } : prev?.from === from ? null : prev)),
    [points],
  );
  const onHover = useCallback((k: number) => track(SOURCE.pointer, k), [track]);
  const onFocusPoint = useCallback((k: number) => track(SOURCE.list, k), [track]);
  return { active, onHover, onFocusPoint };
}
