import { i18n } from "./index";

describe("i18n", () => {
  it("reads pt-BR strings from the common namespace by default", () => {
    expect(i18n.t("clearFilters")).toBe("Limpar filtros");
    expect(i18n.t("stat.percentile", { pct: "91" })).toBe("percentil 91");
  });

  it("counts players in pt-BR, with its own words for zero", () => {
    expect(i18n.t("players", { count: 0 })).toBe("nenhum jogador");
    expect(i18n.t("players", { count: 1 })).toBe("1 jogador");
    expect(i18n.t("players", { count: 2 })).toBe("2 jogadores");
    expect(i18n.t("players", { count: 1500 })).toBe("1.500 jogadores");
    expect(i18n.t("players", { count: 1_000_000 })).toBe("1.000.000 jogadores");
  });

  it("counts months in pt-BR", () => {
    expect(i18n.t("months", { count: 1 })).toBe("1 mês");
    expect(i18n.t("months", { count: 3 })).toBe("3 meses");
    expect(i18n.t("months", { count: 1_000_000 })).toBe("1.000.000 meses");
  });

  it("keeps interpolated text as written instead of escaping it", () => {
    expect(i18n.t("stat.lowerIsBetter", { label: "Erros <críticos> & cia" })).toBe(
      "Erros <críticos> & cia (menor é melhor)",
    );
  });
});
