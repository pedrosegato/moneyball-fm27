import type { LineupSlot, Tactic, TacticSide } from "@/data/types";
import type { PosName } from "../positions";

type Half = [PosName, TacticSide, number];

const SAMPLE_SLOTS: readonly [Half, Half][] = [
  [
    ["GK", "C", 53],
    ["GK", "C", 0],
  ],
  [
    ["DR", "R", 2],
    ["DR", "R", 9],
  ],
  [
    ["DC", "R", 1],
    ["DC", "R", 3],
  ],
  [
    ["DC", "L", 1],
    ["DC", "L", 3],
  ],
  [
    ["DL", "L", 2],
    ["DL", "L", 9],
  ],
  [
    ["AML", "L", 7],
    ["ML", "L", 37],
  ],
  [
    ["MC", "R", 5],
    ["DM", "C", 15],
  ],
  [
    ["MC", "L", 17],
    ["MC", "R", 28],
  ],
  [
    ["MC", "C", 9],
    ["MC", "L", 27],
  ],
  [
    ["AMR", "R", 7],
    ["MR", "R", 37],
  ],
  [
    ["ST", "C", 11],
    ["ST", "C", 44],
  ],
];

export function sampleTactic(
  playerIds: readonly (number | null)[] = Array.from({ length: 11 }, (_, k) => k + 1),
  subs: readonly number[] = Array.from({ length: 12 }, (_, k) => k + 12),
): Tactic {
  const slots: LineupSlot[] = SAMPLE_SLOTS.map(([ip, oop], k) => ({
    ip: { position: ip[0], side: ip[1], roleId: `ip:${ip[2]}` },
    oop: { position: oop[0], side: oop[1], roleId: `oop:${oop[2]}` },
    playerId: playerIds[k] ?? null,
  }));
  return {
    name: "4-3-3 Com Extremos Cauteloso - Contra-Ataque Directo",
    style: "Contra-Ataque Directo",
    slots,
    subs: [...subs],
  };
}
