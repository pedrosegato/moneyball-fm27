import { groupCaption } from "./captions";

describe("column group captions", () => {
  it("writes the group's name when its run of columns has room for it", () => {
    expect(groupCaption("finalizacao", 300)).toBe("Finalização");
    expect(groupCaption("gols", 56)).toBe("Gols");
  });

  it("falls back to the short name over a run too narrow for the whole one, rather than cutting it", () => {
    expect(groupCaption("finalizacao", 56)).toBe("Final.");
    expect(groupCaption("cruzamento", 56)).toBe("Cruz.");
    expect(groupCaption("compostas", 56)).toBe("Comp.");
  });

  it("captions only the stat groups: the player's own facts read without one", () => {
    expect(groupCaption("identidade", 300)).toBeUndefined();
    expect(groupCaption("contrato", 300)).toBeUndefined();
    expect(groupCaption("atributos", 300)).toBeUndefined();
  });
});
