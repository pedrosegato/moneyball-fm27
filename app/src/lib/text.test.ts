import { compareLoose, compareNatural, compareText, foldText, sameText } from "./text";

describe("text order", () => {
  it("sorts pt-BR text with accents in place", () => {
    expect(["Óscar", "Otávio", "Nuno"].sort(compareText)).toEqual(["Nuno", "Óscar", "Otávio"]);
  });

  it("can ignore case and accents", () => {
    expect(compareLoose("são paulo", "São Paulo")).toBe(0);
    expect(sameText("Criador", "criador")).toBe(true);
    expect(sameText("Criador", "Criadores")).toBe(false);
  });

  it("orders numbers inside text by value", () => {
    expect(["Sub-20", "Sub-17", "Sub-9"].sort(compareNatural)).toEqual(["Sub-9", "Sub-17", "Sub-20"]);
  });
});

describe("foldText", () => {
  it("drops accents and case so a search matches either way", () => {
    expect(foldText("João Gonçalves")).toBe("joao goncalves");
    expect(foldText("ÉDER")).toBe("eder");
  });
});
