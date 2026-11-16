import { useTranslation } from "react-i18next";
import { ScoreCell } from "@/components/ScoreCell";
import { NO_ROLE, TOP_ROLES } from "@/engine/analysis/roles";
import type { AnalysisResult } from "@/engine/index";
import { ROLE_PHASES, ROLES } from "@/engine/roles/catalog";
import { formatScore } from "@/lib/format";
import { HiddenUnderPool } from "./HiddenUnderPool";

interface RoleFactsProps {
  i: number;
  analysis: AnalysisResult;
}

export function RoleFacts({ i, analysis }: RoleFactsProps) {
  const { t } = useTranslation("player");
  const { t: tRoles } = useTranslation("roles");
  const hidden = !analysis.pool[i];
  const phases = ROLE_PHASES.map((phase, phaseIndex) => {
    const start = (i * ROLE_PHASES.length + phaseIndex) * TOP_ROLES;
    const rows = Array.from({ length: TOP_ROLES }, (_, k) => ({
      role: analysis.roleTop[start + k],
      value: analysis.roleTopPerf[start + k],
    })).filter(({ role }) => role !== NO_ROLE);
    return { phase, label: tRoles(`phase.${phase}`), rows };
  });

  if (phases.every(({ rows }) => rows.length === 0)) return <p className="text-fg-muted">{t("roles.empty")}</p>;

  return (
    <div className="grid grid-cols-1 gap-3 @[24rem]:grid-cols-2">
      {phases.map(({ phase, label, rows }) => (
        <div key={phase} className="flex min-w-0 flex-col gap-1">
          <span aria-hidden="true" className="type-caption text-fg-muted">
            {label}
          </span>
          <ul aria-label={label} className="flex flex-col gap-1">
            {rows.map(({ role, value }) => {
              const def = ROLES[role];
              return (
                <li key={def.id} className="flex items-center justify-between gap-2">
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate text-fg">{def.name}</span>
                    <span className="type-caption truncate text-fg-muted">{def.positions.join(", ")}</span>
                  </span>
                  {hidden ? (
                    <HiddenUnderPool label={def.name} />
                  ) : (
                    <ScoreCell value={value} label={def.name} format={formatScore} />
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}
