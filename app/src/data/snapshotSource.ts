import type { DataSource } from "./source";
import type { GameStatus, Snapshot } from "./types";

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`${path}: ${res.status} ${await res.text()}`);
  return (await res.json()) as T;
}

export function createSnapshotSource(): DataSource {
  let snapshot: Promise<Snapshot> | null = null;
  const load = () =>
    (snapshot ??= getJson<Snapshot>("/__dev/snapshot").catch((e) => {
      snapshot = null;
      throw e;
    }));

  return {
    status: () => getJson<GameStatus>("/__dev/status"),

    async loadPlayers(_scope, _rescan, onProgress) {
      const result = await load();
      onProgress?.({ phase: "read", done: 1, total: 1 });
      return result;
    },

    async myClubs() {
      return (await load()).my_clubs;
    },

    finances: async () => null,

    onGameDate: () => () => {},
    setPollSeconds: async () => {},
  };
}
