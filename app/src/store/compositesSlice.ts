import type { StateCreator } from "zustand";
import { analysisColumnIds, percentileColumn } from "@/engine/columnIds";
import { ACTIONS_PRESETS, type Composite, defaultActionsPresets } from "@/engine/composites";
import type { StatKey } from "@/engine/stats/catalog";
import { CUSTOM_RULES, compositeProblem, customComposite, MAX_CUSTOM_COMPOSITES } from "./compositeRules";
import { allComposites, type CompositesState, defaultComposites } from "./composites";
import { mapFilters } from "./filters";
import type { AppState } from "./index";

export interface CompositesSlice {
  composites: CompositesState;
  setCompositeWeights(id: string, weights: Record<StatKey, number>): void;
  resetComposite(id: string): void;
  resetCompositePresets(): void;
  addCustomComposite(label: string, weights: Record<StatKey, number>): string | null;
  updateCustomComposite(id: string, patch: { label?: string; weights?: Record<StatKey, number> }): void;
  removeCustomComposite(id: string): void;
}

function newCustomId(taken: ReadonlySet<string>): string {
  for (let n = 1; ; n++) {
    const id = `custom-${n}`;
    if (!taken.has(id)) return id;
  }
}

function withPreset(state: CompositesState, id: string, edit: (c: Composite) => Composite): CompositesState {
  if (!ACTIONS_PRESETS.some((c) => c.id === id)) return state;
  return { ...state, actions: state.actions.map((c) => (c.id === id ? edit(c) : c)) };
}

export const createCompositesSlice: StateCreator<AppState, [], [], CompositesSlice> = (set, get) => ({
  composites: defaultComposites(),

  setCompositeWeights: (id, weights) =>
    set((s) => ({ composites: withPreset(s.composites, id, (c) => ({ ...c, weights: { ...weights } })) })),

  resetComposite: (id) =>
    set((s) => {
      const fresh = defaultActionsPresets().find((c) => c.id === id);
      return fresh ? { composites: withPreset(s.composites, id, () => fresh) } : {};
    }),

  resetCompositePresets: () => set((s) => ({ composites: { ...defaultComposites(), custom: s.composites.custom } })),

  addCustomComposite: (label, weights) => {
    const { composites } = get();
    if (composites.custom.length >= MAX_CUSTOM_COMPOSITES) return null;
    if (compositeProblem({ label, weights }, CUSTOM_RULES, allComposites(composites))) return null;
    const taken = new Set([...analysisColumnIds([]), ...allComposites(composites).map((c) => c.id)]);
    const id = newCustomId(taken);
    set((s) => ({
      composites: { ...s.composites, custom: [...s.composites.custom, customComposite(id, label, { ...weights })] },
    }));
    return id;
  },

  updateCustomComposite: (id, patch) =>
    set((s) => ({
      composites: {
        ...s.composites,
        custom: s.composites.custom.map((c) =>
          c.id === id ? customComposite(id, patch.label ?? c.label, { ...(patch.weights ?? c.weights) }, c.kind) : c,
        ),
      },
    })),

  removeCustomComposite: (id) =>
    set((s) => ({
      composites: { ...s.composites, custom: s.composites.custom.filter((c) => c.id !== id) },
      filters: mapFilters(s.filters, (list) => list.filter((f) => f.col !== id && f.col !== percentileColumn(id))),
    })),
});
