import type { PlayerRecord } from "@/data/types";
import { playsFor } from "../club";
import { ROLES, type RoleId, roleIndex } from "../roles/catalog";
import type { RoleScores } from "../roles/score";

export interface SquadRoles {
  players: Int32Array;
  perf: Float32Array;
}

export interface SquadRoleAnalysis {
  squadRoles: SquadRoles;
}

export function squadRoles(
  records: readonly PlayerRecord[],
  scores: RoleScores,
  clubUid: number | null,
  pool: Uint8Array,
): SquadRoles {
  const players = Int32Array.from(records.flatMap((r, i) => (playsFor(r, clubUid) ? [i] : [])));
  const perf = new Float32Array(players.length * ROLES.length).fill(Number.NaN);
  players.forEach((i, k) => {
    if (!pool[i]) return;
    for (let r = 0; r < ROLES.length; r++) perf[k * ROLES.length + r] = scores[r][i];
  });
  return { players, perf };
}

export function squadRolePerf({ players, perf }: SquadRoles): (index: number | null, role: RoleId) => number {
  const slotOf = new Map(Array.from(players, (index, k) => [index, k] as const));
  return (index, role) => {
    const k = index === null ? undefined : slotOf.get(index);
    return k === undefined ? Number.NaN : perf[k * ROLES.length + roleIndex(role)];
  };
}
