import { useState } from "react";
import { NAME_COLUMN } from "../columns/ids";
import type { TableColumn } from "../columns/types";
import { FIRST_STOP, type HeaderStop, SELECT_COLUMN } from "../lib/tableModel";

export function useHeaderStop(rest: readonly TableColumn[], selectable: boolean) {
  const [headerStop, setHeaderStop] = useState<HeaderStop>(FIRST_STOP);
  const stopIndex = rest.findIndex((c) => c.id === headerStop.col);
  const kept = stopIndex >= 0 || headerStop.col === NAME_COLUMN || (selectable && headerStop.col === SELECT_COLUMN);
  return { stop: kept ? headerStop : FIRST_STOP, stopIndex, setHeaderStop };
}
