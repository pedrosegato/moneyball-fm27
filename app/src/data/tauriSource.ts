import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import type { DataSource } from "./source";
import type { ClubFinances, ClubRef, GameStatus, LoadProgress, Snapshot } from "./types";

export function createTauriSource(): DataSource {
  return {
    status: () => invoke<GameStatus>("game_status"),

    async loadPlayers(scope, rescan, onProgress) {
      const unlisten = onProgress ? await listen<LoadProgress>("load-progress", (e) => onProgress(e.payload)) : null;
      try {
        return await invoke<Snapshot>("load_players", { scope, rescan });
      } finally {
        unlisten?.();
      }
    },

    myClubs: () => invoke<ClubRef[]>("my_clubs"),
    finances: () => invoke<ClubFinances | null>("club_finances"),

    setPollSeconds: (n) => invoke<void>("set_poll_seconds", { n }),

    onGameDate(cb) {
      const pending = listen<{ date: string }>("game-date", (e) => cb(e.payload.date));
      return () => void pending.then((unlisten) => unlisten()).catch(() => {});
    },
  };
}
