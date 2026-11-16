import type { PlayerRecord } from "@/data/types";
import type { PosGroup } from "@/engine/positions";
import type { StatLine } from "@/player/lib/profile";

export interface Compared {
  uid: number;
  slot: number;
  i: number;
  player: PlayerRecord;
  group: PosGroup;
  keeper: boolean;
  lines: StatLine[];
}

export interface Located {
  uid: number;
  i: number;
}
