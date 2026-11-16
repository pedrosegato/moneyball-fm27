import { describe, expect, it } from "vitest";
import { POS_NAMES, type PosGroup, type PosName } from "../positions";
import { ROLES, roleById, roleIndex } from "./catalog";
import { PROFILE_ITEMS, ROLE_ITEM_KEYS } from "./items";
import { bestRoleInGroup, groupBest, type RoleScoringInput, roleWeights, scoreRoles } from "./score";

const role = (id: string) => roleById(id)!;

const rated = (ratings: Partial<Record<PosName, number>>) => POS_NAMES.map((name) => ratings[name] ?? 1);
const NATURAL: Partial<Record<PosGroup, PosName>> = { ZAG: "DC", VOL: "DM", GK: "GK" };

interface Build {
  cbs?: number;
  dms?: number;
  keepers?: number;
  dmBase?: number;
}

function population({ cbs = 25, dms = 0, keepers = 0, dmBase = 100 }: Build): RoleScoringInput {
  const groups: PosGroup[] = [
    ...Array.from({ length: cbs }, (): PosGroup => "ZAG"),
    ...Array.from({ length: dms }, (): PosGroup => "VOL"),
    ...Array.from({ length: keepers }, (): PosGroup => "GK"),
  ];
  const n = groups.length;
  const value = (i: number) => (groups[i] === "ZAG" ? i : groups[i] === "VOL" ? dmBase + i : i);
  const lowerIsBetter = new Set<string>(["defErrors90"]);
  const keys = [...ROLE_ITEM_KEYS, ...new Set(ROLES.flatMap((r) => r.pdf))];
  const items: Record<string, Float64Array> = {};
  for (const key of keys) {
    items[key] = Float64Array.from({ length: n }, (_, i) => (lowerIsBetter.has(key) ? -value(i) : value(i)));
  }
  return {
    groups,
    isGk: Uint8Array.from(groups, (g) => (g === "GK" ? 1 : 0)),
    pool: new Uint8Array(n).fill(1),
    items,
    lowerIsBetter,
    ratings: groups.map((g) => rated({ [NATURAL[g] ?? "DC"]: 20 })),
  };
}

const cbScores = (input: RoleScoringInput, id: "ip:1" | "ip:29" | "oop:3") =>
  Array.from(scoreRoles(input)[roleIndex(id)]).slice(0, input.groups.filter((g) => g === "ZAG").length);

describe("roleWeights", () => {
  it("splits the weight between the base and the role's PDF stats", () => {
    const w = roleWeights(role("ip:29"));
    expect(Object.keys(w)).toHaveLength(12);
    expect(w.cbDefEfficiency).toBeCloseTo(0.0625);
    expect(w["Hdr%"]).toBeCloseTo(0.125);
  });

  it("gives base-only roles the whole weight", () => {
    expect(roleWeights(role("ip:1")).aerialDominance).toBeCloseTo(0.125);
  });

  it("shares the PDF half over Central de Construção's 3 stats", () => {
    expect(roleWeights(role("ip:24"))["Pas%"]).toBeCloseTo(1 / 6);
  });
});

describe("scoreRoles", () => {
  it("ranks a role against the players whose main group plays its positions", () => {
    const alone = population({ cbs: 25 });
    const before = cbScores(alone, "ip:1");
    expect(Math.max(...before)).toBeGreaterThanOrEqual(95);
    const built = population({ cbs: 25, dms: 10 });
    const mixed = { ...built, ratings: built.ratings.map((r, i) => (i < 25 ? r : rated({ DM: 20, DC: 15 }))) };
    expect(cbScores(mixed, "ip:1")).toEqual(before);
    const dmScores = Array.from(scoreRoles(mixed)[roleIndex("ip:1")]).slice(25);
    expect(dmScores.every((v) => Number.isFinite(v) && v >= 95)).toBe(true);
  });

  it("scores keepers only for keeper roles and outfielders only for outfield roles", () => {
    const input = population({ cbs: 25, keepers: 25 });
    const scores = scoreRoles(input);
    expect(Number.isNaN(scores[roleIndex("oop:0")][0])).toBe(true);
    expect(Number.isNaN(scores[roleIndex("ip:1")][30])).toBe(true);
    expect(Number.isFinite(scores[roleIndex("oop:0")][30])).toBe(true);
    expect(Number.isFinite(scores[roleIndex("ip:1")][0])).toBe(true);
  });

  it("needs 60% of the role's weight", () => {
    const input = population({ cbs: 25 });
    const base = new Set<string>(PROFILE_ITEMS.zagueiros);
    const items = Object.fromEntries(
      Object.entries(input.items).map(([key, col]) => [
        key,
        base.has(key) ? new Float64Array(col.length).fill(Number.NaN) : col,
      ]),
    );
    expect(Number.isNaN(scoreRoles({ ...input, items })[roleIndex("ip:29")][24])).toBe(true);
  });

  it("fewer than 20 players in the ruler leave the role empty", () => {
    const scores = scoreRoles(population({ cbs: 19 }))[roleIndex("ip:1")];
    expect(Array.from(scores).every(Number.isNaN)).toBe(true);
  });

  it("gives roles with the same ruler and weights the same array", () => {
    const scores = scoreRoles(population({ cbs: 25 }));
    expect(scores[roleIndex("ip:1")]).toBe(scores[roleIndex("oop:3")]);
  });
});

describe("groupBest", () => {
  it("is each player's best role among the roles of a group", () => {
    const scores = scoreRoles(population({ cbs: 25, dms: 25 }));
    const best = groupBest(scores);
    const cb = bestRoleInGroup(scores, "ZAG", 3);
    expect(cb).toBeGreaterThanOrEqual(0);
    expect(ROLES[cb].positions).toContain("DC");
    expect(best.ZAG[3]).toBe(scores[cb][3]);
    for (const k of ROLES.keys()) {
      if (ROLES[k].positions.includes("DC") && !Number.isNaN(scores[k][3]))
        expect(scores[k][3]).toBeLessThanOrEqual(best.ZAG[3]);
    }
  });

  it("is empty for a group none of whose roles has a score", () => {
    const scores = scoreRoles(population({ cbs: 25 }));
    expect(Number.isNaN(groupBest(scores).GK[0])).toBe(true);
    expect(bestRoleInGroup(scores, "GK", 0)).toBe(-1);
  });
});

describe("who gets a role score", () => {
  it("scores a role only for players rated 15 or more in one of its positions, or in their own best positions", () => {
    const input = population({ cbs: 25, dms: 3 });
    const ratings = [...input.ratings];
    ratings[0] = rated({ DC: 12 });
    ratings[25] = rated({ DM: 20, DC: 15 });
    ratings[26] = rated({ DM: 20, DC: 14 });
    const centreBack = scoreRoles({ ...input, ratings })[roleIndex("ip:1")];
    expect(centreBack[0]).not.toBeNaN();
    expect(centreBack[25]).not.toBeNaN();
    expect(centreBack[26]).toBeNaN();
    expect(centreBack[27]).toBeNaN();
  });
});
