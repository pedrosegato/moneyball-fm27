import { useTranslation } from "react-i18next";
import { CountSegmentedControl } from "@/components/CountSegmentedControl";
import { PageToolbar } from "@/components/PageToolbar";
import type { SellKeepOptions } from "@/engine/sellKeep";
import { ALL } from "@/lib/constants";
import { type SquadTeams, teamKey } from "../hooks/useSquadTeams";
import type { SquadVerdictFilter, SquadVerdicts } from "../hooks/useSquadVerdicts";
import { verdictLabel, verdictRule } from "../lib/sellKeepText";

interface SquadToolbarProps {
  teams: SquadTeams;
  verdicts: SquadVerdicts;
  options: SellKeepOptions;
}

export function SquadToolbar({ teams, verdicts, options }: SquadToolbarProps) {
  const { t } = useTranslation(["elenco", "common"]);
  return (
    <PageToolbar>
      {teams.teams.length > 1 && (
        <CountSegmentedControl
          aria-label={t("squad.team")}
          value={teams.team}
          onValueChange={teams.setTeam}
          all={{ value: ALL, count: teams.squad.length }}
          segments={teams.teams.map((option) => ({
            value: teamKey(option.team),
            label: option.label,
            count: option.count,
          }))}
        />
      )}
      {verdicts.present.length > 0 && (
        <CountSegmentedControl<SquadVerdictFilter>
          aria-label={t("common:verdict")}
          value={verdicts.verdict}
          onValueChange={verdicts.setVerdict}
          className="flex-wrap"
          all={{
            value: ALL,
            count: verdicts.total,
            ariaLabel: t("squad.allVerdicts", { total: verdicts.total }),
            hideCount: true,
          }}
          segments={verdicts.present.map(({ verdict, n }) => ({
            value: verdict,
            label: verdictLabel(verdict),
            count: n,
            title: verdictRule(verdict, options),
          }))}
        />
      )}
    </PageToolbar>
  );
}
