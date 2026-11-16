import { ROLE_PHASES, ROLE_PROFILES, ROLES, type RoleId } from "@/engine/roles/catalog";
import { roles } from "@/i18n/pt-BR/roles";

export interface RoleOption {
  id: RoleId;
  name: string;
  positions: string;
  search: string;
}

export interface RoleOptionGroup {
  key: string;
  heading: string;
  items: readonly RoleOption[];
}

export function roleOptionGroups(): readonly RoleOptionGroup[] {
  return ROLE_PHASES.flatMap((phase) =>
    ROLE_PROFILES.map((profile) => ({
      key: `${phase}:${profile}`,
      heading: `${roles.profile[profile]} ${roles.phase[phase].toLowerCase()}`,
      items: ROLES.filter((r) => r.phase === phase && r.profile === profile)
        .map((r) => {
          const positions = r.positions.join(", ");
          return {
            id: r.id,
            name: r.name,
            positions,
            search: `${r.name} ${roles.phase[r.phase]} ${positions} ${r.shortName}`,
          };
        })
        .sort((a, b) => a.name.localeCompare(b.name, "pt")),
    })),
  );
}
