import { customColumn } from "./customColumn";

describe("customColumn", () => {
  const spec = {
    id: "sellKeep",
    abbr: "Sell/Keep",
    label: "Veredito",
    description: "o que fazer com o jogador.",
    width: 120,
    align: "start",
    sortKey: () => new Float64Array(),
    exports: [],
    render: () => null,
  } as const;

  it("builds a page column in the player's group, sorted ascending first", () => {
    const column = customColumn(spec);
    expect(column).toMatchObject({ kind: "custom", group: "identidade", local: true, id: "sellKeep" });
    expect(column.descFirst("value")).toBe(false);
  });

  it("can sort descending first", () => {
    expect(customColumn({ ...spec, descFirst: true }).descFirst("percentile")).toBe(true);
  });
});
