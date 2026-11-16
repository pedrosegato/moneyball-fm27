import type { Composite } from "@/engine/composites";
import { STATS, type StatDef, type StatKey } from "@/engine/stats/catalog";
import { i18n } from "@/i18n";
import { sameText } from "@/lib/text";

export const MAX_CUSTOM_COMPOSITES = 6;
export const MAX_WEIGHT = 10;
export const MAX_COMPOSITE_LABEL = 32;

export interface CompositeRules {
  minStats: number;
  maxStats: number;
  named: boolean;
}

export const CUSTOM_RULES: CompositeRules = { minStats: 3, maxStats: 12, named: true };
export const PRESET_RULES: CompositeRules = { minStats: 1, maxStats: 20, named: false };

const STAT_DEFS = new Map<StatKey, StatDef>(STATS.map((d) => [d.key, d]));

function keeperScope(weights: Readonly<Record<StatKey, number>>): Pick<Composite, "gkOnly" | "outfieldOnly"> | null {
  const defs = Object.keys(weights).map((k) => STAT_DEFS.get(k));
  const gkOnly = defs.some((d) => d?.gkOnly);
  const outfieldOnly = defs.some((d) => d?.outfieldOnly);
  if (gkOnly && outfieldOnly) return null;
  return gkOnly ? { gkOnly: true } : outfieldOnly ? { outfieldOnly: true } : {};
}

export function nameProblem(label: string, others: readonly Pick<Composite, "label">[]): string | null {
  const name = label.trim();
  if (!name) return i18n.t("store:composite.nameMissing");
  if (name.length > MAX_COMPOSITE_LABEL) return i18n.t("store:composite.nameTooLong", { max: MAX_COMPOSITE_LABEL });
  if (others.some((c) => sameText(c.label.trim(), name))) return i18n.t("store:composite.nameTaken");
  return null;
}

export function compositeProblem(
  { label, weights }: Pick<Composite, "label" | "weights">,
  rules: CompositeRules,
  others: readonly Pick<Composite, "label">[] = [],
): string | null {
  const named = rules.named ? nameProblem(label, others) : null;
  if (named) return named;
  const stats = Object.keys(weights).length;
  if (stats < rules.minStats) return i18n.t("store:composite.tooFewStats", { min: rules.minStats });
  if (stats > rules.maxStats) return i18n.t("store:composite.tooManyStats", { max: rules.maxStats });
  if (!Object.values(weights).some((w) => w > 0)) return i18n.t("store:composite.noWeight");
  if (!keeperScope(weights)) return i18n.t("store:composite.mixedKeepers");
  return null;
}

export function customComposite(
  id: string,
  label: string,
  weights: Record<StatKey, number>,
  kind: Composite["kind"] = "percentileMean",
): Composite {
  return { id, label: label.trim(), kind, weights, ...keeperScope(weights) };
}
