import { createSnapshotSource } from "./snapshotSource";
import { createTauriSource } from "./tauriSource";
import type { ClubFinances, ClubRef, GameStatus, LoadProgress, Scope, Snapshot } from "./types";

export interface DataSource {
  status(): Promise<GameStatus>;
  loadPlayers(scope: Scope, rescan: boolean, onProgress?: (p: LoadProgress) => void): Promise<Snapshot>;
  myClubs(): Promise<ClubRef[]>;
  finances(): Promise<ClubFinances | null>;
  onGameDate(cb: (date: string) => void): () => void;
  setPollSeconds(seconds: number): Promise<void>;
}

export function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

let cached: DataSource | null = null;

export function getDataSource(): DataSource {
  if (!cached) {
    const devSnapshot = import.meta.env.DEV && (import.meta.env.VITE_DATA_SOURCE === "snapshot" || !isTauri());
    cached = devSnapshot ? createSnapshotSource() : createTauriSource();
  }
  return cached;
}
