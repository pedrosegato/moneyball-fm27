import { buildColumns } from "../columns/build";
import { chip } from "../columns/factories";
import type { TableColumn } from "../columns/types";
import { allRows, analyzeFixture, demoPlayer, demoPlayers, ratings } from "../fixtures";
import { toCsv } from "./csv";

const pick = (columns: readonly TableColumn[], ids: string[]) => ids.map((id) => columns.find((c) => c.id === id)!);
const lines = (csv: string) => csv.replace(/^\uFEFF/, "").split("\r\n");

describe("toCsv", () => {
  const source = analyzeFixture(demoPlayers(30).map((p) => ({ ...p, pos: ratings("ST") })));
  const columns = pick(buildColumns(source), ["name", "G/90"]);
  const g90 = source.analysis.cols["G/90"];
  const g90Pct = source.analysis.pct["G/90"];

  it("csv exports percentile when mode is percentile", () => {
    const [header, first, second] = lines(toCsv(Uint32Array.of(3, 4), columns, "percentile"));
    expect(header).toBe("Nome;Clube;G/90 (percentil)");
    expect(Number.isNaN(g90Pct[3])).toBe(false);
    expect(first.split(";")[2]).toBe(String(Math.round(g90Pct[3])));
    expect(second.split(";")[2]).toBe(String(Math.round(g90Pct[4])));
  });

  it("exports the values in value mode, with a comma decimal", () => {
    const [header, first] = lines(toCsv(Uint32Array.of(3), columns, "value"));
    expect(header).toBe("Nome;Clube;G/90");
    const field = first.split(";")[2];
    expect(field).toMatch(/^\d+,\d{1,4}$/);
    expect(Number(field.replace(",", "."))).toBeCloseTo(g90[3], 4);
  });

  it("starts with a BOM, ends lines with CRLF and keeps the rows' order", () => {
    const csv = toCsv(Uint32Array.of(2, 0, 1), columns, "value");
    expect(csv.startsWith("\uFEFFNome;")).toBe(true);
    expect(csv.endsWith("\r\n")).toBe(true);
    const names = lines(csv)
      .slice(1, -1)
      .map((l) => l.split(";")[0]);
    expect(names).toEqual([2, 0, 1].map((i) => source.players[i].name));
  });

  it("leaves a missing value empty instead of writing NaN", () => {
    const unplayed = analyzeFixture([...demoPlayers(25), demoPlayer(99, { minutes: 0, club: null })]);
    const cols = pick(buildColumns(unplayed), ["name", "G/90", "value"]);
    const row = lines(toCsv(Uint32Array.of(25), cols, "percentile"))[1];
    expect(row).toBe(`${unplayed.players[25].name};;;${unplayed.players[25].value}`);
    expect(toCsv(allRows(26), cols, "value")).not.toMatch(/NaN|undefined|null/);
  });

  it("quotes separators and quotes, and defuses text a spreadsheet would run as a formula", () => {
    const odd = analyzeFixture([
      ...demoPlayers(25),
      demoPlayer(1, { name: 'Clube "B"; reservas', club: '=HYPERLINK("x")' }),
    ]);
    const row = lines(toCsv(Uint32Array.of(25), pick(buildColumns(odd), ["name"]), "value"))[1];
    expect(row).toBe('"Clube ""B""; reservas";"\'=HYPERLINK(""x"")"');
  });

  it("writes value and wage in the game's currency, the wage in the game's period, and says so in the header", () => {
    const signed = analyzeFixture([demoPlayer(1, { name: "Negueba", value: 3_576_486, wage: 7_294 })]);
    const euros = { code: "EUR", symbol: "€", name: "Euro", rate: 1.1641011238098145, wagePeriod: "month" } as const;
    const money = ["name", "value", "wage"];
    const [header, row] = lines(
      toCsv(Uint32Array.of(0), pick(buildColumns({ ...signed, money: euros }), money), "value"),
    );
    expect(header).toBe("Nome;Clube;Valor (€);Salário (€/mês)");
    expect(row.split(";").slice(2)).toEqual(["4163391", "36794"]);
    const [inPounds, rowInPounds] = lines(toCsv(Uint32Array.of(0), pick(buildColumns(signed), money), "value"));
    expect(inPounds).toBe("Nome;Clube;Valor (£);Salário (£/sem)");
    expect(rowInPounds.split(";").slice(2)).toEqual(["3576486", "7294"]);
  });

  describe("score chips", () => {
    const score = chip(
      {
        id: "rolePerf",
        abbr: "PF",
        def: { label: "Perf. função", unit: "score", description: "d" },
        group: "compostas",
        value: [110, -16, 55.4],
        pct: [110, -16, 55.4],
        exports: [{ header: "Função", get: () => "Central Pragmático" }],
      },
      [1, 1, 1],
    );

    it("clamps scores to 0-100 in both modes", () => {
      const rows = Uint32Array.of(0, 1, 2);
      expect(
        lines(toCsv(rows, [score], "value"))
          .slice(1, 4)
          .map((l) => l.split(";")[0]),
      ).toEqual(["100", "0", "55,4"]);
      expect(
        lines(toCsv(rows, [score], "percentile"))
          .slice(1, 4)
          .map((l) => l.split(";")[0]),
      ).toEqual(["100", "0", "55"]);
    });

    it("suffixes only the first export header in percentile mode", () => {
      expect(lines(toCsv(Uint32Array.of(0), [score], "percentile"))[0]).toBe("PF (percentil);Função");
    });
  });
});
