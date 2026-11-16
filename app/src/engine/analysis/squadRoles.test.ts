import { describe, expect, it } from "vitest";
import { ROLES, roleIndex } from "../roles/catalog";
import { playerRecord } from "../testing/records";
import { squadRolePerf, squadRoles } from "./squadRoles";

const scores = ROLES.map((_, r) => Float32Array.from({ length: 4 }, (_, i) => r * 10 + i));
const records = [5, 5, 9, null].map((club_uid) => playerRecord({ club_uid }));
const everyone = Uint8Array.of(1, 1, 1, 1);

describe("squadRoles", () => {
  it("keeps every role's score for the club's players, in catalogue order", () => {
    const squad = squadRoles(records, scores, 5, everyone);
    expect(Array.from(squad.players)).toEqual([0, 1]);
    expect(squad.perf.length).toBe(2 * ROLES.length);
    expect(squadRolePerf(squad)(1, "ip:29")).toBe(roleIndex("ip:29") * 10 + 1);
  });

  it("has no score under the pool minutes", () => {
    const squad = squadRoles(records, scores, 5, Uint8Array.of(1, 0, 1, 1));
    const perf = squadRolePerf(squad);
    expect(ROLES.every((role) => Number.isNaN(perf(1, role.id)))).toBe(true);
    expect(perf(0, "ip:29")).toBe(roleIndex("ip:29") * 10);
  });

  it("a player outside the squad, or none, has no score", () => {
    const perf = squadRolePerf(squadRoles(records, scores, 5, everyone));
    expect(perf(2, "ip:1")).toBeNaN();
    expect(perf(null, "ip:1")).toBeNaN();
    expect(squadRoles(records, scores, null, everyone).players.length).toBe(0);
  });
});
