import type { Composite } from "@/engine/composites";
import { type CompositeRules, CUSTOM_RULES, PRESET_RULES } from "@/store/compositeRules";

export const COMPOSITE_ROLE = { actions: "actions", custom: "custom" } as const;
export type Role = (typeof COMPOSITE_ROLE)[keyof typeof COMPOSITE_ROLE];

export interface Entry {
  role: Role;
  composite: Composite;
  name: string;
  preset?: Composite;
}

export const RULES: Readonly<Record<Role, CompositeRules>> = {
  [COMPOSITE_ROLE.actions]: PRESET_RULES,
  [COMPOSITE_ROLE.custom]: CUSTOM_RULES,
};
