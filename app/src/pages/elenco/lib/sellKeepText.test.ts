import { DEFAULT_SELL_KEEP_OPTIONS, SELL_KEEP_VERDICTS, type SellKeepReason } from "@/engine/sellKeep";
import { reasonsText, reasonText, VERDICT_DIRECTION, verdictLabel, verdictRule } from "./sellKeepText";

describe("Sell/Keep in pt-BR", () => {
  it("names every verdict, the ones that keep a player apart from the ones that let him go", () => {
    expect(SELL_KEEP_VERDICTS.map((v) => verdictLabel(v))).toEqual([
      "Manter",
      "Renovar",
      "Vender em alta",
      "Vender já",
      "Excedente",
      "Vender antes da queda",
      "Desenvolver",
      "Emprestar",
      "Dispensar",
      "Poucos dados",
    ]);
    expect(SELL_KEEP_VERDICTS.filter((v) => VERDICT_DIRECTION[v] === "stay")).toEqual(["keep", "renew", "develop"]);
    expect(SELL_KEEP_VERDICTS.filter((v) => VERDICT_DIRECTION[v] === "neutral")).toEqual(["loanOut", "notEnoughData"]);
  });

  it("words each reason", () => {
    const cases: [SellKeepReason, string][] = [
      [{ kind: "starter", pos: "D(C)" }, "Titular: Zagueiro (DC)"],
      [{ kind: "starter", pos: "ST(C)" }, "Titular: Atacante (ST)"],
      [{ kind: "backup", pos: "AM(L)" }, "Reserva imediato: Ponta esquerda (AML)"],
      [{ kind: "noRole" }, "Nem titular nem reserva imediato na formação"],
      [{ kind: "contract", months: 0 }, "Contrato acaba este mês"],
      [{ kind: "contract", months: -2 }, "Contrato encerrado"],
      [{ kind: "contract", months: 1 }, "Contrato acaba em 1 mês"],
      [{ kind: "contract", months: 8 }, "Contrato acaba em 8 meses"],
      [{ kind: "overvalued", ratio: 2.44 }, "Vale 2,4× o valor justo da produção"],
      [{ kind: "undervalued", ratio: 0.456 }, "Vale 46% do valor justo da produção"],
      [{ kind: "pastPeak", age: 31 }, "31 anos: o valor costuma cair daqui em diante"],
      [{ kind: "loanedOut" }, "Emprestado"],
      [
        { kind: "judgedOnAttributes", age: 19, minutes: 1234, vsAge: 103, ability: 12.34 },
        "19 anos e 1.234 min: julgado pelos atributos, Hab./idade 103% (habilidade 12,3)",
      ],
      [{ kind: "tooFewMinutes", minMinutes: 300, ability: 11.25 }, "Menos de 300 min: sem veredito (habilidade 11,3)"],
      [{ kind: "tooFewMinutes", minMinutes: 1500, ability: null }, "Menos de 1.500 min: sem veredito"],
      [{ kind: "tooFewMinutes", minMinutes: 300, ability: Number.NaN }, "Menos de 300 min: sem veredito"],
    ];
    for (const [reason, text] of cases) expect(reasonText(reason)).toBe(text);
  });

  it("says a player with the minutes was left without a verdict for want of a score at his position", () => {
    const reason: SellKeepReason = { kind: "tooFewMinutes", minMinutes: 300, ability: 11.25 };
    expect(reasonText(reason, 120)).toBe("Menos de 300 min: sem veredito (habilidade 11,3)");
    expect(reasonText(reason, 1500)).toBe("Sem Performance na posição: sem veredito (habilidade 11,3)");
    expect(reasonsText([reason, { kind: "loanedOut" }], 1500)).toBe(
      "Sem Performance na posição: sem veredito (habilidade 11,3); Emprestado",
    );
  });

  it("joins the reasons in the engine's order", () => {
    expect(reasonsText([{ kind: "noRole" }, { kind: "contract", months: 3 }, { kind: "loanedOut" }])).toBe(
      "Nem titular nem reserva imediato na formação; Contrato acaba em 3 meses; Emprestado",
    );
    expect(reasonsText([])).toBe("");
  });

  it("agrees the months with a fractional contract threshold", () => {
    const rule = (contractMonths: number) => verdictRule("renew", { ...DEFAULT_SELL_KEEP_OPTIONS, contractMonths });
    expect(rule(1.5)).toBe("Contrato acaba em até 2 meses, e é titular ou reserva imediato");
    expect(rule(0.6)).toBe("Contrato acaba em até 1 mês, e é titular ou reserva imediato");
    expect(rule(0)).toBe("Contrato acaba em até 0 meses, e é titular ou reserva imediato");
  });

  it("explains each verdict with the thresholds in force", () => {
    const opts = { ...DEFAULT_SELL_KEEP_OPTIONS, contractMonths: 6, sellHighRatio: 2.5 };
    expect(verdictRule("renew", opts)).toBe("Contrato acaba em até 6 meses, e é titular ou reserva imediato");
    expect(verdictRule("sellHigh", opts)).toBe(
      "Vale 2,5× o valor justo ou mais (um titular só a partir dos 28 anos; goleiro, 32)",
    );
    expect(verdictRule("develop", opts)).toBe(
      "Até 23 anos, com menos de 300 min ou sem Performance na posição: Hab./idade de 100% ou mais",
    );
    expect(verdictRule("loanOut", opts)).toBe(
      "Até 23 anos, com menos de 300 min ou sem Performance na posição: Hab./idade de 85% a menos de 100%",
    );
    expect(verdictRule("release", opts)).toBe(
      "Até 23 anos, com menos de 300 min ou sem Performance na posição: Hab./idade abaixo de 85%",
    );
    expect(verdictRule("notEnoughData", opts)).toBe(
      "Menos de 300 min ou sem Performance na posição, e acima dos 23 anos ou sem atributos para julgar",
    );
    expect(verdictRule("sellBeforeDecline", opts)).toBe(
      "29 anos ou mais (goleiro, 33), reserva imediato e não titular",
    );
    for (const v of SELL_KEEP_VERDICTS) expect(verdictRule(v, opts)).not.toMatch(/undefined|NaN/);
  });
});
