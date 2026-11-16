import { playerName, playerSurname } from "./playerName";

describe("playerName", () => {
  it("names a player the save left without a name", () => {
    expect(playerName({ name: "Zé Roberto" })).toBe("Zé Roberto");
    expect(playerName({ name: null })).toBe("Sem nome");
  });
});

describe("playerSurname", () => {
  it("is the last word of the name", () => {
    expect(playerSurname({ name: "Tarsi Aguado" })).toBe("Aguado");
    expect(playerSurname({ name: "Willian Machado" })).toBe("Machado");
    expect(playerSurname({ name: " Matheus  Gonçalves " })).toBe("Gonçalves");
    expect(playerSurname({ name: "João Henrique Gonçalves de Albuquerque Júnior" })).toBe("Júnior");
  });

  it("keeps a one-word name whole, and names a player the save left without a name", () => {
    expect(playerSurname({ name: "Patrick" })).toBe("Patrick");
    expect(playerSurname({ name: null })).toBe("Sem nome");
    expect(playerSurname({ name: "  " })).toBe("Sem nome");
  });
});
