import { describe, expect, it } from "vitest";
import type { RoleId } from "@/engine/roles/catalog";
import { rolesFor } from "@/engine/tacticShape";
import { rankedRoles } from "./roleChoices";

describe("rankedRoles", () => {
  it("puts the player's best role first and the roles without a score last, in catalogue order", () => {
    const catalogue = rolesFor("DC", "ip").map((r) => r.id);
    const scores: Partial<Record<RoleId, number>> = { [catalogue[1]]: 40, [catalogue[3]]: 72, [catalogue[4]]: 40 };
    const ranked = rankedRoles("DC", "ip", (_, role) => scores[role] ?? Number.NaN, 0);
    expect(ranked.map((c) => c.role.id)).toEqual([
      catalogue[3],
      catalogue[1],
      catalogue[4],
      catalogue[0],
      catalogue[2],
      catalogue[5],
    ]);
    expect(ranked[0].perf).toBe(72);
    expect(ranked.at(-1)?.perf).toBeNaN();
  });

  it("an empty slot lists the roles in catalogue order", () => {
    const ranked = rankedRoles("ST", "oop", () => Number.NaN, null);
    expect(ranked.map((c) => c.role.id)).toEqual(rolesFor("ST", "oop").map((r) => r.id));
  });
});
