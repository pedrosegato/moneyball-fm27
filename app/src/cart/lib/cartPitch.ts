import type { PitchPosition } from "@/components/pitch";
import type { PlayerRecord } from "@/data/types";
import { naturalPositions, POS_NAMES } from "@/engine/positions";
import { CART_KIND, CART_STATUS } from "@/store/cart";
import type { ReconciledItem } from "./reconcile";

export interface CartPitchData {
  counts: Partial<Record<PitchPosition, number>>;
  names: Partial<Record<PitchPosition, string[]>>;
  arrivals: number;
}

function pitchSpotsOf(pos: readonly number[]): PitchPosition[] {
  const natural = naturalPositions(pos as number[]);
  if (natural.length) return natural;
  let best = -1;
  POS_NAMES.forEach((_, i) => {
    if ((pos[i] ?? 0) > (pos[best] ?? 0)) best = i;
  });
  return best >= 0 ? [POS_NAMES[best]] : [];
}

const arrives = (line: ReconciledItem) =>
  line.kind === CART_KIND.buy && (line.status === CART_STATUS.planned || line.status === CART_STATUS.signed);

export function cartPitch(lines: readonly ReconciledItem[], players: readonly PlayerRecord[]): CartPitchData {
  const arriving = new Map<number, PlayerRecord | null>();
  for (const line of lines) if (arrives(line)) arriving.set(line.uid, null);
  for (const p of players) if (arriving.has(p.uid)) arriving.set(p.uid, p);
  const counts: CartPitchData["counts"] = {};
  const names: CartPitchData["names"] = {};
  let arrivals = 0;
  for (const p of arriving.values()) {
    if (!p) continue;
    arrivals++;
    for (const spot of pitchSpotsOf(p.pos ?? [])) {
      counts[spot] = (counts[spot] ?? 0) + 1;
      const spotNames = names[spot] ?? [];
      spotNames.push(p.name);
      names[spot] = spotNames;
    }
  }
  return { counts, names, arrivals };
}
