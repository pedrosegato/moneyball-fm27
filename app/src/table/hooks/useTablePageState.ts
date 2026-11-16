import { useShallow } from "zustand/react/shallow";
import { useAppStore } from "@/store/index";
import { useColumnActions } from "./useColumnActions";

export function useTablePageState() {
  const state = useAppStore(
    useShallow((s) => ({
      mode: s.ui.mode,
      setMode: s.setMode,
      selectedUid: s.ui.selectedUid,
      selectPlayer: s.selectPlayer,
      columns: s.columns,
    })),
  );
  const columnActions = useColumnActions();
  return { ...state, columnActions };
}
