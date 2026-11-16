import { playerRecord } from "@/engine/testing/records";
import { searchRows, searchTerms } from "./search";

const list = (a: ArrayLike<number>) => Array.from(a);

describe("name search", () => {
  const players = [
    playerRecord({ name: "Negueba", club: "MFC" }),
    playerRecord({ name: "Bruno Negueba", club: "Passo Fundo" }),
    playerRecord({ name: "Rəşad Abdullayev", club: "Qarabağ FK" }),
    playerRecord({ name: "Erik Lindqvist", club: "BK Häcken" }),
    playerRecord({ name: "Tifany Hoyos", club: null }),
  ];
  const found = (query: string) => list(searchRows(Uint32Array.of(0, 1, 2, 3, 4), searchTerms(query), players));

  it("finds the name or the club, whatever the case and accents", () => {
    expect(found("negueba")).toEqual([0, 1]);
    expect(found("HACKEN")).toEqual([3]);
    expect(found("qarabag")).toEqual([2]);
    expect(found("Rəşad")).toEqual([2]);
  });

  it("needs every word typed, in any order, in the name or the club", () => {
    expect(found("mfc negueba")).toEqual([0]);
    expect(found("negueba fundo")).toEqual([1]);
    expect(found("  ")).toEqual([0, 1, 2, 3, 4]);
    const rows = Uint32Array.of(4, 2);
    expect(searchRows(rows, searchTerms(" "), players)).toBe(rows);
    expect(found("ninguém")).toEqual([]);
  });

  it("never matches a player without a club on the word 'null'", () => {
    expect(found("null")).toEqual([]);
  });
});
