import { ACTIONS_PRESETS } from "@/engine/composites";
import { useAppStore } from "@/store/index";
import { COMPOSITE_ROLE, type Entry } from "./entries";

export function useCompositeEntries(): Entry[] {
  const composites = useAppStore((s) => s.composites);
  return [
    ...composites.actions.map(
      (c): Entry => ({
        role: COMPOSITE_ROLE.actions,
        composite: c,
        name: c.label,
        preset: ACTIONS_PRESETS.find((p) => p.id === c.id),
      }),
    ),
    ...composites.custom.map((c): Entry => ({ role: COMPOSITE_ROLE.custom, composite: c, name: c.label })),
  ];
}
