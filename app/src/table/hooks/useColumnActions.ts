import { useShallow } from "zustand/react/shallow";
import { useAppStore } from "@/store/index";
import type { ColumnActions } from "../lib/columnActions";

export function useColumnActions(): ColumnActions {
  return useAppStore(
    useShallow((s) => ({
      setColumnPreset: s.setColumnPreset,
      resetColumnPreset: s.resetColumnPreset,
      setColumnGroups: s.setColumnGroups,
    })),
  );
}
