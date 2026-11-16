import type { PlayerRecord } from "@/data/types";
import { poolFlags } from "../club";
import type { PosGroup } from "../positions";
import { POS_NAMES } from "../positions";
import { ROLES, type RoleId, roleIndex } from "../roles/catalog";
import { ROLE_ITEMS, roleItemColumns } from "../roles/items";
import { bestRoleInGroup, type RoleScores, type RoleScoringInput } from "../roles/score";
import { STATS, statIndex } from "../stats/catalog";
import { keeperFlags } from "../universe";
import type { PreparedSnapshot } from "./prepare";

export const NO_ROLE = 255;
export const TOP_ROLES = 3;
const NATURAL_RATING = 15;
const PHASE_SLOTS = 2 * TOP_ROLES;

export interface RoleAnalysis {
  roleChoice: RoleId | null;
  rolePerf: Float32Array;
  roleShown: Uint8Array;
  roleTop: Uint8Array;
  roleTopPerf: Float32Array;
}

export function naturalPositionBits(records: readonly PlayerRecord[]): Uint16Array {
  return Uint16Array.from(records, (r) =>
    POS_NAMES.reduce((bits, _, k) => ((r.pos[k] ?? 0) >= NATURAL_RATING ? bits | (1 << k) : bits), 0),
  );
}

const ROLE_POSITION_BITS = ROLES.map((role) =>
  role.positions.reduce((bits, name) => bits | (1 << POS_NAMES.indexOf(name)), 0),
);
const IS_KEEPER_ROLE = ROLES.map((role) => role.profile === "goleiros");
const PDF_KEYS = [...new Set(ROLES.flatMap((role) => role.pdf))];

export function roleScoringInput(prepared: PreparedSnapshot, poolMinutes: number): RoleScoringInput {
  const { records, groups, derived } = prepared;
  const items: Record<string, Float64Array> = { ...roleItemColumns(records) };
  for (const key of PDF_KEYS) items[key] = derived[statIndex(key)];
  const lowerIsBetter = new Set<string>([
    ...ROLE_ITEMS.filter((item) => item.lowerIsBetter).map((item) => item.key),
    ...PDF_KEYS.filter((key) => STATS[statIndex(key)].lowerIsBetter),
  ]);
  return {
    groups,
    isGk: keeperFlags(records),
    pool: poolFlags(records, poolMinutes),
    items,
    lowerIsBetter,
    ratings: records.map((r) => r.pos),
  };
}

export function viewRoles(
  records: readonly PlayerRecord[],
  groups: readonly PosGroup[],
  scores: RoleScores,
  choice: RoleId | null,
): RoleAnalysis {
  const n = records.length;
  const natural = naturalPositionBits(records);
  const keeper = keeperFlags(records);
  const chosen = choice === null ? null : roleIndex(choice);
  const rolePerf = new Float32Array(n).fill(Number.NaN);
  const roleShown = new Uint8Array(n).fill(chosen ?? NO_ROLE);
  const roleTop = new Uint8Array(n * PHASE_SLOTS).fill(NO_ROLE);
  const roleTopPerf = new Float32Array(n * PHASE_SLOTS).fill(Number.NaN);

  ROLES.forEach((role, k) => {
    const values = scores[k];
    const slot = role.phase === "ip" ? 0 : TOP_ROLES;
    const wantKeeper = IS_KEEPER_ROLE[k] ? 1 : 0;
    for (let i = 0; i < n; i++) {
      const v = values[i];
      if (keeper[i] !== wantKeeper || Number.isNaN(v)) continue;
      if (k === chosen) rolePerf[i] = v;
      if (!(natural[i] & ROLE_POSITION_BITS[k])) continue;
      const base = i * PHASE_SLOTS + slot;
      let at = base + TOP_ROLES - 1;
      if (roleTopPerf[at] >= v) continue;
      while (at > base && !(roleTopPerf[at - 1] >= v)) {
        roleTop[at] = roleTop[at - 1];
        roleTopPerf[at] = roleTopPerf[at - 1];
        at--;
      }
      roleTop[at] = k;
      roleTopPerf[at] = v;
    }
  });

  if (chosen === null) {
    for (let i = 0; i < n; i++) {
      const best = bestRoleInGroup(scores, groups[i], i);
      if (best < 0) continue;
      roleShown[i] = best;
      rolePerf[i] = scores[best][i];
    }
  }
  return { roleChoice: choice, rolePerf, roleShown, roleTop, roleTopPerf };
}
