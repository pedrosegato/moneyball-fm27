import { type Composite, rankedPercentileMean } from "../composites";
import { percentiles } from "../percentiles";
import { POS_GROUPS, type PosGroup, playsAny } from "../positions";
import { ROLES, type RoleDef, roleGroups } from "./catalog";
import { PROFILE_ITEMS } from "./items";

export interface RoleScoringInput {
  groups: readonly PosGroup[];
  isGk: Uint8Array;
  pool: Uint8Array;
  items: Readonly<Record<string, Float64Array>>;
  lowerIsBetter: ReadonlySet<string>;
  ratings: readonly (readonly number[])[];
}

export type RoleScores = readonly Float32Array[];

export function roleWeights(role: RoleDef): Record<string, number> {
  const base = PROFILE_ITEMS[role.profile];
  const baseShare = role.pdf.length === 0 ? 1 : 0.5;
  const weights: Record<string, number> = {};
  for (const key of base) weights[key] = baseShare / base.length;
  for (const key of role.pdf) weights[key] = 0.5 / role.pdf.length;
  return weights;
}

export const rulerKey = (role: RoleDef): string => roleGroups(role).join("|");

export function rulerFor(role: RoleDef, groups: readonly PosGroup[], pool: Uint8Array): Uint8Array {
  const allowed = new Set<PosGroup>(roleGroups(role));
  return Uint8Array.from(groups, (g, i) => (pool[i] && allowed.has(g) ? 1 : 0));
}

export function scoreRoles(input: RoleScoringInput, roles: readonly RoleDef[] = ROLES): RoleScores {
  const { groups, isGk, pool, items, lowerIsBetter, ratings } = input;
  const n = groups.length;
  const scores = new Map<RoleDef, Float32Array>();
  const playable = new Map<string, Uint8Array>();
  const playersOf = (role: RoleDef): Uint8Array => {
    const key = role.positions.join("|");
    let flags = playable.get(key);
    if (!flags) {
      flags = Uint8Array.from(ratings, (pos) => (playsAny(pos, role.positions) ? 1 : 0));
      playable.set(key, flags);
    }
    return flags;
  };
  const rulers = new Map<string, RoleDef[]>();
  for (const role of roles) {
    const key = rulerKey(role);
    const members = rulers.get(key);
    if (members) members.push(role);
    else rulers.set(key, [role]);
  }

  for (const members of rulers.values()) {
    const ruler = rulerFor(members[0], groups, pool);
    const keys = [...new Set(members.flatMap((r) => Object.keys(roleWeights(r))))];
    const ranked = percentiles(
      keys.map((k) => items[k]),
      ruler,
      keys.map((k) => ({ lowerIsBetter: lowerIsBetter.has(k) })),
      new Uint8Array(n),
      { sides: 1 },
    );
    const pct = Object.fromEntries(keys.map((k, j) => [k, ranked[j]]));
    const cache = new Map<string, Float32Array>();
    const shown = new Map<string, Float32Array>();

    for (const role of members) {
      const weights = roleWeights(role);
      const cacheKey = JSON.stringify(weights);
      let out = cache.get(cacheKey);
      if (!out) {
        const composite: Composite = { id: role.id, label: role.name, kind: "percentileMean", weights };
        const raw = rankedPercentileMean(composite, pct, ruler);
        const wantKeeper = role.profile === "goleiros" ? 1 : 0;
        out = Float32Array.from(raw, (p, i) => (isGk[i] === wantKeeper ? p : Number.NaN));
        cache.set(cacheKey, out);
      }
      const shownKey = `${cacheKey}|${role.positions.join("|")}`;
      let forRole = shown.get(shownKey);
      if (!forRole) {
        const plays = playersOf(role);
        forRole = Float32Array.from(out, (p, i) => (plays[i] ? p : Number.NaN));
        shown.set(shownKey, forRole);
      }
      scores.set(role, forRole);
    }
  }
  return roles.map((r) => scores.get(r) as Float32Array);
}

const ROLES_OF_GROUP: Readonly<Record<PosGroup, readonly number[]>> = Object.fromEntries(
  POS_GROUPS.map((g) => [g, ROLES.flatMap((role, k) => (roleGroups(role).includes(g) ? [k] : []))]),
) as Record<PosGroup, number[]>;

export function bestRoleInGroup(scores: RoleScores, group: PosGroup, i: number): number {
  let best = -1;
  let value = Number.NaN;
  for (const k of ROLES_OF_GROUP[group]) {
    const v = scores[k][i];
    if (!Number.isNaN(v) && !(v <= value)) {
      value = v;
      best = k;
    }
  }
  return best;
}

export function groupBest(scores: RoleScores): Record<PosGroup, Float32Array> {
  const n = scores[0]?.length ?? 0;
  return Object.fromEntries(
    POS_GROUPS.map((g) => [
      g,
      Float32Array.from({ length: n }, (_, i) => {
        const k = bestRoleInGroup(scores, g, i);
        return k < 0 ? Number.NaN : scores[k][i];
      }),
    ]),
  ) as Record<PosGroup, Float32Array>;
}
