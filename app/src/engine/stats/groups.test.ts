import { stats } from "@/i18n/pt-BR/stats";
import { groupByStatGroup, STAT_GROUP_IDS, STAT_GROUPS } from "./groups";

describe("groupByStatGroup", () => {
  it("keeps the catalog's group order and drops the groups left empty", () => {
    const items = [
      { key: "a", group: "passe" },
      { key: "b", group: "gols" },
      { key: "c", group: "passe" },
    ] as const;
    const groups = groupByStatGroup(items, (item) => item.group);
    expect(groups.map((g) => [g.id, g.items.map((i) => i.key)])).toEqual([
      ["gols", ["b"]],
      ["passe", ["a", "c"]],
    ]);
  });

  it("lists every group id in catalog order", () => {
    expect(STAT_GROUP_IDS).toEqual(STAT_GROUPS.map((g) => g.id));
  });
});

describe("STAT_GROUPS", () => {
  it("names each group from the stats copy", () => {
    expect(STAT_GROUPS[1]).toEqual({ id: "finalizacao", label: "Finalização", short: "Final." });
    expect(Object.keys(stats.group)).toEqual([...STAT_GROUP_IDS]);
  });
});
