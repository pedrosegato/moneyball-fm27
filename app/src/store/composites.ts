import { analysisColumnIds, PERCENTILE_PREFIX } from "@/engine/columnIds";
import { type Composite, defaultActionsPresets } from "@/engine/composites";
import { STAT_KEYS, type StatKey } from "@/engine/stats/catalog";
import { isRecord } from "@/lib/guards";
import { CUSTOM_RULES, compositeProblem, customComposite, MAX_CUSTOM_COMPOSITES, MAX_WEIGHT } from "./compositeRules";
import { fieldsOf, finiteIn, listOf, oneOf, recordOf, text } from "./sanitize";

export interface CompositesState {
  actions: Composite[];
  custom: Composite[];
}

export const defaultComposites = (): CompositesState => ({
  actions: defaultActionsPresets(),
  custom: [],
});

export const engineComposites = ({ actions, custom }: CompositesState): Composite[] => [...actions, ...custom];

export const allComposites = ({ actions, custom }: CompositesState): Composite[] => [...actions, ...custom];

const KINDS = ["percentileMean", "weightedSum"] as const satisfies readonly Composite["kind"][];
const KNOWN_STATS = new Set(STAT_KEYS);

function restoreWeights(raw: unknown): Record<StatKey, number> | null {
  const weights = recordOf(raw, (w, key) => (KNOWN_STATS.has(key) ? finiteIn(w, 0, MAX_WEIGHT) : null));
  return Object.values(weights).some((w) => w > 0) ? weights : null;
}

function restoreCustom(raw: unknown, taken: Set<string>, named: Composite[]): Composite | null {
  const r = fieldsOf(raw);
  const id = text(r.id, 64);
  const label = text(r.label, 80);
  const kind = oneOf(r.kind, KINDS);
  const weights = restoreWeights(r.weights);
  if (id === null || label === null || kind === null || weights === null) return null;
  if (taken.has(id) || id.startsWith(PERCENTILE_PREFIX)) return null;
  if (compositeProblem({ label, weights }, CUSTOM_RULES, named)) return null;
  taken.add(id);
  const composite = customComposite(id, label, weights, kind);
  named.push(composite);
  return composite;
}

export function restoreComposites(raw: unknown): CompositesState {
  const d = defaultComposites();
  const r = fieldsOf(raw);

  const savedActions = new Map<unknown, unknown>(
    (Array.isArray(r.actions) ? r.actions : []).filter(isRecord).map((a) => [a.id, a.weights]),
  );
  const actions = d.actions.map((preset) => {
    const weights = restoreWeights(savedActions.get(preset.id));
    return weights ? { ...preset, weights } : preset;
  });

  const taken = new Set(analysisColumnIds(actions.map((a) => a.id)));
  const named = [...actions];
  const custom = listOf(r.custom, (c) => restoreCustom(c, taken, named), MAX_CUSTOM_COMPOSITES);
  return { actions, custom };
}
