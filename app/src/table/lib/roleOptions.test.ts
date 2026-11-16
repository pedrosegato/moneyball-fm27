import { roleById } from "@/engine/roles/catalog";
import { roleOptionGroups } from "./roleOptions";

describe("roleOptionGroups", () => {
  const groups = roleOptionGroups();
  const group = (key: string) => groups.find((g) => g.key === key)!;

  it("groups roles by phase, then profile", () => {
    expect(groups).toHaveLength(14);
    expect(groups[0].heading).toBe("Goleiros com bola");
    expect(groups.at(-1)!.heading).toBe("Avançados sem bola");
    expect(groups.reduce((n, g) => n + g.items.length, 0)).toBe(79);
  });

  it("sorts each group by name", () => {
    const names = group("ip:zagueiros").items.map((o) => o.name);
    expect(names.slice(0, 2)).toEqual(["Central Aberto", "Central de Construção"]);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, "pt")));
  });

  it("shows positions as the app writes them", () => {
    const wingBack = group("ip:laterais").items.find((o) => o.name === "Ala")!;
    expect(wingBack.positions).toBe("DR, DL, WBR, WBL");
  });

  it("gives all 79 roles a distinct search text that matches by phase, short name and positions", () => {
    const all = groups.flatMap((g) => g.items);
    expect(new Set(all.map((o) => o.search)).size).toBe(79);
    const twin = all.filter((o) => o.name === "Defesa Central");
    expect(twin.map((o) => o.search.includes("Sem bola"))).toEqual([false, true]);
    const wingBack = all.find((o) => o.name === "Ala")!;
    expect(wingBack.search).toContain("DR, DL, WBR, WBL");
    expect(wingBack.search).toContain(roleById(wingBack.id)!.shortName);
  });
});
