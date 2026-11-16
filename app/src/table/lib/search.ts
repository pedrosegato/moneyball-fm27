import type { PlayerRecord } from "@/data/types";
import { foldText } from "@/lib/text";

const INDEXES = new WeakMap<readonly PlayerRecord[], readonly string[]>();

export function searchIndex(players: readonly PlayerRecord[]): readonly string[] {
  let index = INDEXES.get(players);
  if (!index) {
    index = players.map((r) => foldText(`${r.name ?? ""}\n${r.club ?? ""}`));
    INDEXES.set(players, index);
  }
  return index;
}

export const searchTerms = (query: string): string[] => foldText(query).split(/\s+/).filter(Boolean);

export function searchRows(rows: Uint32Array, terms: readonly string[], players: readonly PlayerRecord[]): Uint32Array {
  if (!terms.length) return rows;
  const index = searchIndex(players);
  return rows.filter((i) => terms.every((t) => index[i].includes(t)));
}
