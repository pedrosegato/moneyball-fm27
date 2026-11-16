import type { RoleDef, RolePhase } from "@/engine/roles/catalog";
import { formatScore } from "@/lib/format";
import { elencoT } from "./elencoT";
import type { RoleReading } from "./slotReadings";

const phaseName = (phase: RolePhase) => elencoT(`pitch.phase.${phase}`);

function roleText({ role, perf, elsewhere }: RoleReading, withPhase: boolean): string {
  const values = { role: role.name, perf: Number.isNaN(perf) ? elencoT("pitch.noScore") : formatScore(perf) };
  if (!withPhase) return elencoT("pitch.role", values);
  const at = elsewhere ? elencoT("pitch.at", { slot: elsewhere }) : "";
  return elencoT("pitch.phaseRole", { ...values, phase: phaseName(role.phase) }) + at;
}

export function slotAriaLabel(slot: string, name: string | null, roles: readonly RoleReading[], need: boolean): string {
  const withPhase = roles.length > 1;
  return [
    elencoT("pitch.slot", { slot, name: name ?? elencoT("pitch.emptyName") }),
    ...(name === null ? [] : roles.map((reading) => roleText(reading, withPhase))),
    need ? elencoT("pitch.slotNeed") : "",
  ].join("");
}

export const slotTitle = (name: string | null, need: boolean): string =>
  [name ?? elencoT("pitch.empty"), need && elencoT("pitch.need")].filter(Boolean).join(", ");

export const roleTitle = (role: RoleDef): string =>
  elencoT("pitch.roleTitle", { role: role.name, phase: phaseName(role.phase) });
