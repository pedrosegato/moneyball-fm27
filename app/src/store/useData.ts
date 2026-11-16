import { createContext, useContext } from "react";
import { useShallow } from "zustand/react/shallow";
import { CURRENT_SEASON } from "@/engine/period";
import type { DataController } from "./controller";
import { useAppStore } from "./index";
import { periodSnapshot } from "./periodSnapshot";

export const DataControllerContext = createContext<DataController | null>(null);

export function useDataController(): DataController {
  const controller = useContext(DataControllerContext);
  if (!controller) throw new Error("useData needs a DataControllerContext above it");
  return controller;
}

export function useData() {
  const { reload } = useDataController();
  const data = useAppStore(
    useShallow(({ data: d }) => ({
      snapshot: d.snapshot && periodSnapshot(d.snapshot, d.analysis?.period ?? CURRENT_SEASON),
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

export function usePeriodPending(): boolean {
  return useAppStore(({ data, ui }) => data.analysis !== null && data.analysis.period !== ui.period);
}
