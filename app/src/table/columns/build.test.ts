import { missingText } from "@/components/missing";
import { DEFAULT_ENGINE_SETTINGS } from "@/engine/analysis/input";
import { POOL_HIDDEN_COLUMNS } from "@/engine/columnIds";
import type { Composite } from "@/engine/composites";
import { ATTRIBUTE_NAMES } from "@/engine/data/attributes";
import { runAnalysis } from "@/engine/index";
import { snapshotOf } from "@/engine/testing/records";
import { formatStat } from "@/lib/format";
import { defaultComposites, engineComposites } from "@/store/composites";
import { analyzeFixture, demoPlayer, demoPlayers, ratings } from "../fixtures";
import { buildColumns } from "./build";
import type { ChipColumn, NumberColumn, TableSource } from "./types";

describe("buildColumns", () => {
  it("has one Performance column and no per-group duplicate", () => {
    const source = analyzeFixture(demoPlayers(24));
    const ids = buildColumns(source).map((c) => c.id);
    expect(ids.filter((id) => id.startsWith("perf-") || id === "rolePerf")).toEqual([]);
    expect(ids).toContain("perf");
  });
});

describe('why a percentile is missing, and the "—" under the pool', () => {
  const attrs = (k: number) => ATTRIBUTE_NAMES.map((_, a) => 40 + ((k * 7 + a * 3) % 50));
  const strikers = Array.from({ length: 30 }, (_, k) => demoPlayer(k, { pos: ratings("ST"), attrs: attrs(k) }));
  const benched = demoPlayer(40, { name: "Reserva", pos: ratings("ST"), minutes: 200, attrs: attrs(40) });
  const defenders = Array.from({ length: 5 }, (_, k) => demoPlayer(50 + k, { pos: ratings("DC") }));
  const players = [...strikers, benched, ...defenders];
  const settings = { ...DEFAULT_ENGINE_SETTINGS, fairValue: { ...DEFAULT_ENGINE_SETTINGS.fairValue, minRows: 10 } };
  const mean: Composite = {
    id: "custom-1",
    label: "Gols e chutes",
    kind: "percentileMean",
    weights: { "G/90": 1, "Shots/90": 1 },
  };
  const composites = [...engineComposites(defaultComposites()), mean];
  const analysis = runAnalysis({ snapshot: snapshotOf(players), composites, myClubUid: 1000, settings });
  const source: TableSource = { players, analysis, composites };
  const byId = new Map(buildColumns(source).map((c) => [c.id, c]));
  const chipOf = (id: string) => byId.get(id) as ChipColumn;
  const numberOf = (id: string) => byId.get(id) as NumberColumn;
  const [BENCHED, DEFENDER] = [30, 31];

  it('a player under the pool minutes has no percentile, with the reason "pool", and keeps his raw value', () => {
    const g90 = chipOf("G/90");
    expect(Number.isFinite(g90.value[BENCHED])).toBe(true);
    expect(g90.pct[BENCHED]).toBeNaN();
    expect(g90.missing(BENCHED)).toBe("pool");
    expect(g90.missing(0)).toBeUndefined();
    expect(missingText("pool")).toBe("amostra pequena");
  });

  it('a group with fewer than 20 in the pool has no percentiles, with the reason "group"', () => {
    const g90 = chipOf("G/90");
    expect(Number.isFinite(g90.value[DEFENDER])).toBe(true);
    expect(g90.missing(DEFENDER)).toBe("group");
    expect(missingText("group")).toBe("poucos na posição");
    const actions = chipOf("actions-att");
    expect(actions.missing(BENCHED)).toBe("pool");
    expect(actions.missing(DEFENDER)).toBe("group");
  });

  it("says why a mean of percentiles has none: fewer minutes than the pool, or too few in the group", () => {
    const own = chipOf("custom-1");
    expect([own.value[BENCHED], own.value[DEFENDER]]).toEqual([NaN, NaN]);
    expect(missingText(own.missing(BENCHED)!)).toBe("amostra pequena");
    expect(missingText(own.missing(DEFENDER)!)).toBe("poucos na posição");
    expect(Number.isFinite(own.value[0])).toBe(true);
    expect(own.missing(0)).toBeUndefined();
  });

  it("Performance is the role score, a pool-hidden chip in the composites group", () => {
    const column = chipOf("perf");
    expect([column.kind, column.group]).toEqual(["chip", "compostas"]);
    expect(Number.isFinite(column.value[0])).toBe(true);
    expect(column.missing(0)).toBeUndefined();
    expect([column.value[BENCHED], column.missing(BENCHED)]).toEqual([NaN, "pool"]);
    expect(Number.isFinite(analysis.rolePerf[BENCHED])).toBe(true);
  });

  it("hides every column of the engine's pool-hidden list, the same ones its filters hide", () => {
    const hidden = buildColumns(source)
      .filter((c) => POOL_HIDDEN_COLUMNS.has(c.id))
      .map((c) => c.id);
    expect(hidden.sort()).toEqual([...POOL_HIDDEN_COLUMNS].sort());
    for (const id of hidden) {
      const column = byId.get(id) as ChipColumn | NumberColumn;
      expect(Number.isNaN(column.value[BENCHED]), id).toBe(true);
    }
  });

  it("hides Performance and what is built on it under the pool, while the engine keeps the numbers", () => {
    for (const id of ["perf"]) {
      const column = chipOf(id);
      expect([column.value[BENCHED], column.pct[BENCHED], column.missing(BENCHED)], id).toEqual([NaN, NaN, "pool"]);
      expect(Number.isFinite(column.value[0]), id).toBe(true);
    }
    for (const id of ["fair", "valueRatio", "statsVsAbility"]) {
      const column = numberOf(id);
      expect([column.value[BENCHED], column.emptyReason?.(BENCHED)], id).toEqual([NaN, "pool"]);
      expect([Number.isFinite(column.value[0]), column.emptyReason?.(0)], id).toEqual([true, undefined]);
    }
    const kept = [analysis.perf, analysis.perfIn.ATA, analysis.fair, analysis.valueRatio, analysis.statsVsAbility];
    expect(kept.every((values) => Number.isFinite(values[BENCHED]))).toBe(true);
    expect(chipOf("perf").value[0]).toBe(analysis.perf[0]);
  });

  it("says nothing more where the engine had no number to hide", () => {
    const unplayed = { ...demoPlayer(41, { pos: ratings("ST") }), season: null };
    const blank = analyzeFixture([...strikers, unplayed]);
    const at = strikers.length;
    const perf = buildColumns(blank).find((c) => c.id === "perf") as ChipColumn;
    expect([perf.value[at], perf.missing(at)]).toEqual([NaN, undefined]);
    const fair = buildColumns(blank).find((c) => c.id === "fair") as NumberColumn;
    expect(fair.emptyReason?.(at)).toBeUndefined();
  });
});

describe("Performance with the league weight and league strength columns", () => {
  const players = [
    ...demoPlayers(24).map((p) => ({ ...p, pos: ratings("ST") })),
    demoPlayer(50, { name: "Zagueiro", pos: ratings("DC") }),
  ];
  const source = analyzeFixture(players, 1000);
  const columns = buildColumns(source);
  const column = <T>(id: string) => columns.find((c) => c.id === id) as T;
  const { analysis } = source;

  it("has no separate Perf. aj. column: Performance itself carries the league weight", () => {
    const ids = columns.map((c) => c.id);
    expect(ids.filter((id) => id.startsWith("perfAdj"))).toEqual([]);
    expect(column<ChipColumn>("perf").value[24]).toBe(analysis.rolePerf[24]);
  });

  it("shows Performance on the 0 to 100 scale, however far the league weight pushes it", () => {
    const own = column<ChipColumn>("perf");
    expect(own.def.unit).toBe("score");
    expect(formatStat(116.4, own.def.unit)).toBe("100");
    expect(formatStat(-14.2, own.def.unit)).toBe("0");
    expect(formatStat(63.6, own.def.unit)).toBe("64");
  });

  it("shows the league's strength after the league, in whole CA points", () => {
    const strength = column<NumberColumn>("leagueStrength");
    expect(strength.value).toBe(analysis.leagueStrength);
    expect([strength.abbr, strength.group, strength.format(122.08)]).toEqual(["Força da liga", "identidade", "122"]);
    expect(strength.label).toBe("Força da liga: CA média dos titulares (450+ min)");
    const ids = columns.map((c) => c.id);
    expect(ids.indexOf("leagueStrength")).toBe(ids.indexOf("division") + 1);
  });
});

describe("Moneyball columns", () => {
  const source = analyzeFixture(demoPlayers(3));
  const columns = buildColumns(source);
  const column = (id: string) => columns.find((c) => c.id === id) as NumberColumn;

  it("read the engine's ratio, Stats vs ability and months of contract left", () => {
    expect(Array.from(column("valueRatio").value)).toEqual(Array.from(source.analysis.valueRatio));
    expect(Array.from(column("statsVsAbility").value)).toEqual(Array.from(source.analysis.statsVsAbility));
    expect(column("monthsLeft").value).toBe(source.analysis.monthsLeft);
    expect(columns.filter((c) => ["valueRatio", "monthsLeft"].includes(c.id)).map((c) => c.group)).toEqual([
      "contrato",
      "contrato",
    ]);
  });

  it("write the ratio as a multiple, Stats vs ability signed and the contract in months", () => {
    expect([2.345, 12].map(column("valueRatio").format)).toEqual(["×2,3", "×12,0"]);
    expect([12.4, -5.2, -0.4, 0].map(column("statsVsAbility").format)).toEqual(["+12", "-5", "0", "0"]);
    expect([1, 8, 0, -3].map(column("monthsLeft").format)).toEqual(["1 mês", "8 meses", "Este mês", "Encerrado"]);
  });
});

describe("column descriptions", () => {
  it("every column the table can show explains itself for the header tooltip", () => {
    const source = analyzeFixture(demoPlayers(24));
    const silent = buildColumns(source)
      .filter((c) => !c.description?.trim())
      .map((c) => c.id);
    expect(silent).toEqual([]);
  });
});

describe("money columns", () => {
  const source = analyzeFixture([demoPlayer(1, { name: "Negueba", value: 3_576_486, wage: 7_294 })]);
  const euros = { code: "EUR", symbol: "€", name: "Euro", rate: 1.1641011238098145, wagePeriod: "month" } as const;

  it("shows value and wage in the game's currency, the wage in the game's period", () => {
    const byId = new Map(buildColumns({ ...source, money: euros }).map((c) => [c.id, c]));
    const value = byId.get("value") as NumberColumn;
    const wage = byId.get("wage") as NumberColumn;
    expect(value.format(value.value[0])).toBe("€4,2M");
    expect(wage.format(wage.value[0])).toBe("€37 mil");
    expect(wage.label).toBe("Salário por mês");
    expect(wage.description).toContain("por mês");
    expect(value.moneyScale).toBe(euros.rate);
    expect(wage.moneyScale).toBeCloseTo((euros.rate * 52) / 12);
  });

  it("keeps pounds and weekly wages when the game's money was not read", () => {
    const wage = buildColumns(source).find((c) => c.id === "wage") as NumberColumn;
    expect(wage.label).toBe("Salário por semana");
    expect(wage.format(7_294)).toBe("£7 mil");
    expect(wage.moneyScale).toBe(1);
  });
});

describe("derived columns on the quality tiers", () => {
  const source = analyzeFixture(demoPlayers(30));
  const byId = new Map(buildColumns(source).map((c) => [c.id, c]));

  it("paints Habilidade by its percentile and Stats vs ability on the diverging scale", () => {
    const ability = byId.get("ability") as NumberColumn;
    expect(ability.tier).toEqual({ scale: "score", basis: source.analysis.abilityPct, missing: "group" });
    expect((byId.get("statsVsAbility") as NumberColumn).tier).toEqual({ scale: "delta" });
  });

  it("leaves plain facts unpainted", () => {
    for (const id of ["age", "minutes", "value", "wage", "fair", "valueRatio", "monthsLeft", "ca", "pa", "height"]) {
      expect((byId.get(id) as NumberColumn).tier, id).toBeUndefined();
    }
  });
});
