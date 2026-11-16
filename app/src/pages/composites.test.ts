import { type Composite, defaultActionsPresets } from "@/engine/composites";
import { STATS } from "@/engine/stats/catalog";
import {
  CUSTOM_RULES,
  compositeProblem,
  customComposite,
  MAX_CUSTOM_COMPOSITES,
  PRESET_RULES,
} from "@/store/compositeRules";
import { restoreComposites } from "@/store/composites";
import { createAppStore } from "@/store/index";
import { statOptions, topPlayers } from "./composites/model";

const def = (key: string) => STATS.find((d) => d.key === key)!;
const CREATOR = { "xA/90": 1, "KP/90": 1, "CCC/90": 2 };

describe("restoreComposites (sanitize on load)", () => {
  it("drops the stats a saved custom composite names that the catalog no longer has", () => {
    const { custom } = restoreComposites({
      custom: [{ id: "c1", label: "Criador", kind: "percentileMean", weights: { ...CREATOR, "Nope/90": 3 } }],
    });
    expect(custom).toEqual([{ id: "c1", label: "Criador", kind: "percentileMean", weights: CREATOR }]);
  });

  it("drops a custom composite left with fewer than 3 stats, or saved with more than 12", () => {
    const many = Object.fromEntries(
      STATS.filter((d) => d.unit === "per90" && !d.gkOnly)
        .slice(0, 13)
        .map((d) => [d.key, 1]),
    );
    const { custom } = restoreComposites({
      custom: [
        { id: "c1", label: "Quase", kind: "percentileMean", weights: { "xA/90": 1, "KP/90": 1, "Old/90": 1 } },
        { id: "c2", label: "Demais", kind: "percentileMean", weights: many },
        { id: "c3", label: "Criador", kind: "percentileMean", weights: CREATOR },
      ],
    });
    expect(custom.map((c) => c.label)).toEqual(["Criador"]);
  });

  it("takes the keeper flags from the stats rather than the file, and drops one that mixes keeper and outfield stats", () => {
    const { custom } = restoreComposites({
      custom: [
        {
          id: "c1",
          label: "Paredão",
          kind: "percentileMean",
          gkOnly: false,
          outfieldOnly: true,
          weights: { "Sv%": 1, "xSv%": 1, "Pas%": 1 },
        },
        { id: "c2", label: "Misturado", kind: "percentileMean", weights: { "Sv%": 1, "TckWon/90": 1, "Pas%": 1 } },
        { id: "c3", label: "Criador", kind: "percentileMean", gkOnly: true, weights: CREATOR },
      ],
    });
    expect(custom).toEqual([
      { id: "c1", label: "Paredão", kind: "percentileMean", gkOnly: true, weights: { "Sv%": 1, "xSv%": 1, "Pas%": 1 } },
      { id: "c3", label: "Criador", kind: "percentileMean", weights: CREATOR },
    ]);
  });

  it("drops a custom composite named like one before it", () => {
    const { custom } = restoreComposites({
      custom: [
        { id: "c1", label: "Criador", kind: "percentileMean", weights: CREATOR },
        { id: "c2", label: " criador ", kind: "percentileMean", weights: CREATOR },
        { id: "c3", label: "Ações defensivas/90", kind: "percentileMean", weights: CREATOR },
      ],
    });
    expect(custom.map((c) => c.id)).toEqual(["c1"]);
  });
});

describe("compositeProblem", () => {
  const others = [customComposite("c1", "Criador", CREATOR)];

  it("accepts a named composite of 3 to 12 stats with some weight", () => {
    expect(
      compositeProblem(
        { label: "Finalizador", weights: { "npG/90": 2, "xG/Shot": 1, "SoT%": 0 } },
        CUSTOM_RULES,
        others,
      ),
    ).toBeNull();
  });

  it("says what to fix, in pt-BR", () => {
    const problem = (label: string, weights: Record<string, number>) =>
      compositeProblem({ label, weights }, CUSTOM_RULES, others);
    expect(problem("  ", CREATOR)).toBe("Dê um nome à composta.");
    expect(problem("x".repeat(33), CREATOR)).toBe("Use um nome de até 32 caracteres.");
    expect(problem("CRIADOR", CREATOR)).toBe("Já existe uma composta com esse nome.");
    expect(problem("Dupla", { "npG/90": 1, "xA/90": 1 })).toBe("Escolha pelo menos 3 stats.");
    const thirteen = Object.fromEntries(
      STATS.filter((d) => !d.gkOnly)
        .slice(0, 13)
        .map((d) => [d.key, 1]),
    );
    expect(problem("Treze", thirteen)).toBe("Use no máximo 12 stats.");
    expect(problem("Zerada", { "npG/90": 0, "xA/90": 0, "KP/90": 0 })).toBe(
      "Dê peso acima de 0 a pelo menos uma stat.",
    );
    expect(problem("Misturada", { "Sv%": 1, "TckWon/90": 1, "Pas%": 1 })).toBe(
      "Stats só de goleiro não se misturam com stats só de jogador de linha.",
    );
  });

  it("lets a preset keep a single stat but never lose its weight, and ignores its fixed name", () => {
    expect(compositeProblem({ label: "Performance (Atacante)", weights: { "npG/90": 1 } }, PRESET_RULES)).toBeNull();
    expect(compositeProblem({ label: "Performance (Atacante)", weights: { "npG/90": 0 } }, PRESET_RULES)).toBe(
      "Dê peso acima de 0 a pelo menos uma stat.",
    );
  });
});

describe("composites slice", () => {
  it("has no Performance preset to edit: Performance is the role score", () => {
    const store = createAppStore();
    const before = store.getState().composites;
    store.getState().setCompositeWeights("perf-ATA", { "npG/90": 5 });
    expect(store.getState().composites).toBe(before);
    expect(Object.keys(before).sort()).toEqual(["actions", "custom"]);
  });

  it("edits and restores an Actions/90 preset", () => {
    const store = createAppStore();
    store.getState().setCompositeWeights("actions-def", { "Int/90": 4 });
    expect(store.getState().composites.actions.find((c) => c.id === "actions-def")?.weights).toEqual({ "Int/90": 4 });
    store.getState().resetComposite("actions-def");
    expect(store.getState().composites.actions).toEqual(defaultActionsPresets());
  });

  it("creates up to 6 custom composites with ids no column has", () => {
    const store = createAppStore();
    const ids = Array.from({ length: MAX_CUSTOM_COMPOSITES + 1 }, (_, k) =>
      store.getState().addCustomComposite(`Criador ${k + 1}`, CREATOR),
    );
    expect(ids.slice(0, MAX_CUSTOM_COMPOSITES).every((id) => typeof id === "string")).toBe(true);
    expect(ids[MAX_CUSTOM_COMPOSITES]).toBeNull();
    const custom = store.getState().composites.custom;
    expect(custom).toHaveLength(MAX_CUSTOM_COMPOSITES);
    expect(new Set(custom.map((c) => c.id)).size).toBe(MAX_CUSTOM_COMPOSITES);
    for (const c of custom) expect(STATS.some((d) => d.key === c.id)).toBe(false);
    expect(custom[0]).toMatchObject({ label: "Criador 1", kind: "percentileMean", weights: CREATOR });
  });

  it("renames a custom composite, re-deriving its keeper flag from the stats", () => {
    const store = createAppStore();
    const id = store.getState().addCustomComposite("Criador", CREATOR)!;
    store.getState().updateCustomComposite(id, { label: "Paredão", weights: { "Sv%": 1, "xSv%": 1, "Pas%": 1 } });
    expect(store.getState().composites.custom).toEqual([
      { id, label: "Paredão", kind: "percentileMean", gkOnly: true, weights: { "Sv%": 1, "xSv%": 1, "Pas%": 1 } },
    ]);
  });

  it("deletes a custom composite with the table filters on it", () => {
    const store = createAppStore();
    const id = store.getState().addCustomComposite("Criador", CREATOR)!;
    store.getState().setFilter("scout", { col: id, kind: "range", min: 60 });
    store.getState().setFilter("scout", { col: `pct:${id}`, kind: "range", min: 80 });
    store.getState().setFilter("scout", { col: "age", kind: "range", max: 23 });
    store.getState().removeCustomComposite(id);
    expect(store.getState().composites.custom).toEqual([]);
    expect(store.getState().filters.scout).toEqual([{ col: "age", kind: "range", max: 23 }]);
  });

  it("restores every preset at once and keeps the user's own composites", () => {
    const store = createAppStore();
    const id = store.getState().addCustomComposite("Criador", CREATOR)!;
    store.getState().setCompositeWeights("actions-gk", { "Svh/90": 2 });
    store.getState().resetCompositePresets();
    const { actions, custom } = store.getState().composites;
    expect(actions).toEqual(defaultActionsPresets());
    expect(custom.map((c) => c.id)).toEqual([id]);
  });
});

describe("statOptions", () => {
  const keys = (c: Composite) => new Set(statOptions(c).map((d) => d.key));

  const scorer: Composite = { id: "c", label: "Gols", kind: "percentileMean", weights: { "npG/90": 1, "xG/Shot": 1 } };
  const keeper: Composite = { id: "k", label: "Goleiro", kind: "percentileMean", gkOnly: true, weights: { "Sv%": 1 } };
  const defender: Composite = {
    id: "d",
    label: "Zagueiro",
    kind: "percentileMean",
    outfieldOnly: true,
    weights: { "TckWon/90": 1 },
  };

  it("leaves out the stats already in the composite", () => {
    expect(keys(scorer).has("npG/90")).toBe(false);
    expect(keys(scorer).has("Ast/90")).toBe(true);
  });

  it("offers a keeper's preset no outfield-only stat, and an outfield preset no keeper stat", () => {
    expect(keys(keeper).has("TckWon/90")).toBe(false);
    expect(keys(keeper).has("Svh/90")).toBe(true);
    expect(keys(defender).has("Svh/90")).toBe(false);
    expect(def("Svh/90").gkOnly).toBe(true);
  });

  it("offers a weighted sum only per-90 counts", () => {
    const actions = defaultActionsPresets().find((c) => c.id === "actions-att")!;
    const offered = statOptions(actions);
    expect(offered.length).toBeGreaterThan(10);
    expect(offered.every((d) => d.unit === "per90" && !d.gkOnly)).toBe(true);
  });

  it("follows a custom composite's stats: once a keeper stat is in, no outfield-only one", () => {
    expect(keys(customComposite("c1", "Livre", { "Pas%": 1 })).has("TckWon/90")).toBe(true);
    expect(keys(customComposite("c1", "Goleiro", { "Sv%": 1 })).has("TckWon/90")).toBe(false);
    expect(keys(customComposite("c1", "Linha", { "TckWon/90": 1 })).has("Sv%")).toBe(false);
  });
});

describe("topPlayers", () => {
  it("ranks the players the mask keeps by score, skipping blanks", () => {
    const scores = Float32Array.from([10, NaN, 80, 55, 99, 70, 30]);
    const mask = Uint8Array.from([1, 1, 1, 1, 0, 1, 1]);
    expect(topPlayers(scores, mask, 3)).toEqual([2, 5, 3]);
    expect(topPlayers(scores, mask, 10)).toEqual([2, 5, 3, 6, 0]);
    expect(topPlayers(scores, null, 2)).toEqual([4, 2]);
  });
});
