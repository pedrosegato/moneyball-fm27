import { useState } from "react";
import type { Composite } from "@/engine/composites";
import { type CompositeRules, compositeProblem } from "@/store/compositeRules";

export function useCompositeEdit(
  stored: Composite,
  rules: CompositeRules,
  others: readonly Composite[],
  save: (c: Composite) => void,
) {
  const [draft, setDraft] = useState<{ base: Composite; value: Composite } | null>(null);
  const value = draft?.base === stored ? draft.value : stored;
  const change = (next: Composite) => {
    if (compositeProblem(next, rules, others)) setDraft({ base: stored, value: next });
    else {
      setDraft(null);
      save(next);
    }
  };
  return { value, problem: compositeProblem(value, rules, others), change };
}
