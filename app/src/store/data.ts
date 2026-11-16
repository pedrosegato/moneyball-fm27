import type { StateCreator } from "zustand";
import type { ClubFinances, GameStatus, LoadProgress, Snapshot } from "@/data/types";
import type { SequencedAnalysis } from "@/engine/client";
import { type FilterTable, perFilterTable } from "./filters";
import type { AppState } from "./index";

export type DataProgress = LoadProgress | { phase: "analyze" };

export const noMasks = (): Record<FilterTable, Uint8Array | null> => perFilterTable(() => null);

export interface DataState {
  snapshot: Snapshot | null;
  analysis: SequencedAnalysis | null;
  visible: Record<FilterTable, Uint8Array | null>;
  loading: boolean;
  analyzing: boolean;
  progress: DataProgress | null;
  error: string | null;
  readAt: number | null;
  status: GameStatus | null;
  gameDate: string | null;
  finances: ClubFinances | null;
}

export interface DataSlice {
  data: DataState;
  setData(patch: Partial<DataState>): void;
}

export const createDataSlice: StateCreator<AppState, [], [], DataSlice> = (set) => ({
  data: {
    snapshot: null,
    analysis: null,
    visible: noMasks(),
    loading: false,
    analyzing: false,
    progress: null,
    error: null,
    readAt: null,
    status: null,
    gameDate: null,
    finances: null,
  },
  setData: (patch) => set((s) => ({ data: { ...s.data, ...patch } })),
});
