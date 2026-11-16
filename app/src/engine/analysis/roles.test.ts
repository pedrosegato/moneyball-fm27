import { describe, expect, it } from "vitest";
import type { PlayerRecord } from "@/data/types";
import { POS_NAMES } from "../positions";
import { ROLES, type RoleId, roleIndex } from "../roles/catalog";
import { playerRecord } from "../testing/records";
import { NO_ROLE, naturalPositionBits, TOP_ROLES, viewRoles } from "./roles";

const ratings = (rated: Partial<Record<(typeof POS_NAMES)[number], number>>) =>
  POS_NAMES.map((name) => rated[name] ?? 1);

const blank = (n: number) => ROLES.map(() => new Float32Array(n).fill(Number.NaN));

function withScores(n: number, set: Partial<Record<RoleId, number[]>>) {
  const scores = blank(n);
  for (const [id, values] of Object.entries(set) as [RoleId, number[]][])
    scores[roleIndex(id)] = Float32Array.from(values);
  return scores;
}

const centreBack = (dm: number): PlayerRecord => playerRecord({ pos: ratings({ DC: 18, DM: dm }) });

describe("naturalPositionBits", () => {
  it("sets the bits of positions rated 15 or more", () => {
    const [bits] = naturalPositionBits([playerRecord({ pos: ratings({ DC: 15, DM: 14, ST: 20 }) })]);
    const set = POS_NAMES.filter((_, k) => bits & (1 << k));
    expect(set).toEqual(["DC", "ST"]);
  });
});

describe("viewRoles", () => {
  it("with no role picked shows the best role of the player's main position group", () => {
    const scores = withScores(2, { "ip:29": [70, 70], "ip:4": [80, 80] });
    const view = viewRoles([centreBack(16), centreBack(16)], ["ZAG", "VOL"], scores, null);
    expect(Array.from(view.rolePerf)).toEqual([70, 80]);
    expect(ROLES[view.roleShown[0]].id).toBe("ip:29");
    expect(ROLES[view.roleShown[1]].id).toBe("ip:4");
    expect(view.roleChoice).toBeNull();
  });

  it("a picked role shows that role for everyone, natural or not", () => {
    const striker = playerRecord({ pos: ratings({ ST: 20 }) });
    const scores = withScores(2, { "ip:29": [70, 55], "ip:4": [80, 90] });
    const view = viewRoles([centreBack(16), striker], ["ZAG", "ATA"], scores, "ip:29");
    expect(Array.from(view.rolePerf)).toEqual([70, 55]);
    expect(Array.from(view.roleShown)).toEqual([roleIndex("ip:29"), roleIndex("ip:29")]);
    expect(view.roleChoice).toBe("ip:29");
  });

  it("keeps the 3 best roles per phase, best first", () => {
    const scores = withScores(1, {
      "ip:1": [60],
      "ip:14": [75],
      "ip:24": [65],
      "ip:29": [70],
      "oop:3": [50],
      "oop:6": [90],
    });
    const view = viewRoles([playerRecord({ pos: ratings({ DC: 18 }) })], ["ZAG"], scores, null);
    const slots = 2 * TOP_ROLES;
    const ids = Array.from(view.roleTop.slice(0, slots), (k) => (k === NO_ROLE ? null : ROLES[k].id));
    expect(ids).toEqual(["ip:14", "ip:29", "ip:24", "oop:6", "oop:3", null]);
    expect(Array.from(view.roleTopPerf.slice(0, TOP_ROLES))).toEqual([75, 70, 65]);
    expect(Number.isNaN(view.roleTopPerf[slots - 1])).toBe(true);
  });

  it("a player with no score in his group's roles has no score and NO_ROLE; no natural role, no top roles", () => {
    const player = playerRecord({ pos: ratings({}).map(() => 10) });
    const view = viewRoles([player], ["ATA"], withScores(1, { "ip:1": [60] }), null);
    expect(Number.isNaN(view.rolePerf[0])).toBe(true);
    expect(view.roleShown[0]).toBe(NO_ROLE);
    expect(Array.from(view.roleTop)).toEqual(new Array(2 * TOP_ROLES).fill(NO_ROLE));
  });

  it("outfielders never get a keeper role", () => {
    const cb = playerRecord({ pos: ratings({ DC: 18, GK: 15 }) });
    const scores = withScores(1, { "ip:0": [99], "ip:1": [60] });
    const view = viewRoles([cb], ["ZAG"], scores, null);
    expect(view.rolePerf[0]).toBe(60);
    expect(ROLES[view.roleShown[0]].id).toBe("ip:1");
  });
});
