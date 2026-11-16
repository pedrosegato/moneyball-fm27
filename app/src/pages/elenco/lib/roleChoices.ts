import type { PosName } from "@/engine/positions";
import type { RoleDef, RolePhase } from "@/engine/roles/catalog";
import { rolesFor } from "@/engine/tacticShape";
import type { RolePerf } from "./performance";

export interface RoleChoice {
  role: RoleDef;
  perf: number;
}

export function rankedRoles(position: PosName, phase: RolePhase, perfOf: RolePerf, index: number | null): RoleChoice[] {
  const choices = rolesFor(position, phase).map((role) => ({ role, perf: perfOf(index, role.id) }));
  const scored = choices.filter((c) => Number.isFinite(c.perf)).sort((a, b) => b.perf - a.perf);
  return [...scored, ...choices.filter((c) => !Number.isFinite(c.perf))];
}
