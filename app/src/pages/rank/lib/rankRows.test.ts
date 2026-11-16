import { playerRecord } from "@/engine/testing/records";
import { ratings } from "@/table/fixtures";
import { leagueRows, rankColumns, rankEligible, weightsWith } from "./rankRows";

const players = [
  playerRecord({ name: "A", division: "Premier League" }),
  playerRecord({ name: "B", division: "Liga Inventada" }),
  playerRecord({ name: "C", division: "Eredivisie" }),
  playerRecord({ name: "D", division: "Premier League" }),
  playerRecord({ name: "E", division: "Liga Inventada" }),
];
const base = [7.0, 7.9, 7.3, Number.NaN, 7.0];
const everyone = Uint8Array.from(players, () => 1);

describe("Rank", () => {
  it("ranks the eligible scored players plainly, best first, an equal score keeping record order", () => {
    const r = rankColumns(players, base, everyone, {}, false);
    expect([...r.rows]).toEqual([1, 2, 0, 4]);
    expect([...r.position]).toEqual([3, 1, 2, NaN, 4]);
    expect([...r.weighted]).toEqual([NaN, NaN, NaN, NaN, NaN]);
    expect([...r.move]).toEqual([NaN, NaN, NaN, NaN, NaN]);
    expect([...r.weight]).toEqual([1.15, 1, 1.109, 1.15, 1]);
  });

  it("weighs by league, and says how far each player moved", () => {
    const r = rankColumns(players, base, everyone, {}, true);
    expect([...r.rows]).toEqual([2, 0, 1, 4]);
    expect([...r.position]).toEqual([2, 3, 1, NaN, 4]);
    expect(r.weighted[0]).toBeCloseTo(8.05, 10);
    expect([...r.move]).toEqual([1, -2, 1, NaN, 0]);
  });

  it("takes the user's weights by league key, and leaves out who is not eligible", () => {
    const eligible = Uint8Array.from([1, 1, 0, 1, 1]);
    const r = rankColumns(players, base, eligible, { "liga inventada": 1.2 }, true);
    expect([...r.rows]).toEqual([1, 4, 0]);
    expect(r.weight[1]).toBe(1.2);
    expect([...r.position]).toEqual([3, 1, NaN, NaN, 2]);
  });
});

describe("the leagues of the save", () => {
  it("lists each league once under the save's own name, strongest first, those outside the ranking last", () => {
    const save = [
      playerRecord({ division: "Liga Inventada" }),
      playerRecord({ division: "Eredivisie" }),
      playerRecord({ division: "Italian Serie A" }),
      playerRecord({ division: "Serie A Enilive" }),
      playerRecord({ division: null }),
      playerRecord({ division: "Eredivisie" }),
      playerRecord({ division: "Another Cup League" }),
    ];
    const rows = leagueRows(save);
    expect(rows.map((r) => [r.key, r.name, r.rank, r.nation, r.players])).toEqual([
      ["serie a enilive", "Italian Serie A", 3, "Italy", 2],
      ["eredivisie", "Eredivisie", 5, "The Netherlands", 2],
      ["another cup league", "Another Cup League", null, null, 1],
      ["liga inventada", "Liga Inventada", null, null, 1],
    ]);
    expect(rows[0].weight).toBe(1.13);
    expect(rows[2].weight).toBe(1);
  });
});

describe("who is ranked", () => {
  const pool = [
    playerRecord({ name: "Zagueiro", pos: ratings("DC"), minutes: 2000 }),
    playerRecord({ name: "Volante que zagueia", pos: ratings("DM", { DC: 16 }), minutes: 1500 }),
    playerRecord({ name: "Atacante", pos: ratings("ST"), minutes: 2000 }),
    playerRecord({ name: "Zagueiro sem minutos", pos: ratings("DC"), minutes: 120 }),
    playerRecord({ name: "Zagueiro filtrado", pos: ratings("DC"), minutes: 2000 }),
  ];
  const mask = Uint8Array.from([1, 1, 1, 1, 0]);

  it("is the pool that passes the table filters, every position by default", () => {
    expect([...rankEligible(pool, 300, mask, null)]).toEqual([1, 1, 1, 0, 0]);
    expect([...rankEligible(pool, 300, null, null)]).toEqual([1, 1, 1, 0, 1]);
  });

  it("narrows to a position group as the old page did: the main one or any rated 15+", () => {
    expect([...rankEligible(pool, 300, mask, "ZAG")]).toEqual([1, 1, 0, 0, 0]);
    expect([...rankEligible(pool, 300, mask, "ATA")]).toEqual([0, 0, 1, 0, 0]);
  });
});

describe("editing a league weight", () => {
  it("keeps the edit at the precision shown, and drops it when it lands on the default", () => {
    expect(weightsWith({}, "premier league", 1.2, 1.15)).toEqual({ "premier league": 1.2 });
    expect(weightsWith({ eredivisie: 1.2 }, "premier league", 1.23456, 1.15)).toEqual({
      eredivisie: 1.2,
      "premier league": 1.235,
    });
    expect(weightsWith({ "premier league": 1.2 }, "premier league", 1.1500004, 1.15)).toEqual({});
    expect(weightsWith({}, "serie a enilive", 1.13, 1.1300000001)).toEqual({});
  });
});
