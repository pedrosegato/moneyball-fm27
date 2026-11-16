import { createContext, useContext } from "react";
import { useShallow } from "zustand/react/shallow";
import type { Snapshot } from "@/data/types";
import { applyPeriod, type Period } from "@/engine/period";
import type { DataController } from "./controller";
import { useAppStore } from "./index";

export const DataControllerContext = createContext<DataController | null>(null);

export function useDataController(): DataController {
  const controller = useContext(DataControllerContext);
  if (!controller) throw new Error("useData needs a DataControllerContext above it");
  return controller;
}

const byPeriod = new WeakMap<Snapshot, Map<Period, Snapshot>>();

export function periodSnapshot(snapshot: Snapshot, period: Period): Snapshot {
  let periods = byPeriod.get(snapshot);
  if (!periods) {
    periods = new Map();
    byPeriod.set(snapshot, periods);
  }
  let shown = periods.get(period);
  if (!shown) {
    shown = applyPeriod(snapshot, period);
    periods.set(period, shown);
  }
  return shown;
}

export function useData() {
  const { reload } = useDataController();
  const data = useAppStore(
    useShallow(({ data: d, ui }) => ({
      snapshot: d.snapshot && periodSnapshot(d.snapshot, ui.period),
      analysis: d.analysis,
      visible: d.visible,
      error: d.error,
    })),
  );
  return { ...data, reload };
}

export function useLoadProgress() {
  return useAppStore(useShallow(({ data: d }) => ({ loading: d.loading, progress: d.progress })));
}

export function useAnalyzing(): boolean {
  return useAppStore((s) => s.data.analyzing);
}
