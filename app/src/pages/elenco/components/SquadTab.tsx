import { useTranslation } from "react-i18next";
import type { PlayerRecord } from "@/data/types";
import { COLUMN } from "@/engine/columnIds";
import type { AnalysisResult } from "@/engine/index";
import { slotGroup } from "@/engine/positions";
import { FILTER_TABLE } from "@/store/filters";
import { PlayerTable } from "@/table/PlayerTable";
import { usePlaceAction } from "../hooks/usePlaceAction";
import { useSellKeepOptions } from "../hooks/useSellKeepOptions";
import { useSquadColumns } from "../hooks/useSquadColumns";
import { useSquadNameCell } from "../hooks/useSquadNameCell";
import { useSquadTeams } from "../hooks/useSquadTeams";
import { useSquadVerdicts } from "../hooks/useSquadVerdicts";
import { SLOT_COLUMN } from "../lib/slotColumns";
import { SQUAD_FIXED } from "../lib/squadColumns";
import { SellKeepCriteria } from "./SellKeepCriteria";
import { SquadToolbar } from "./SquadToolbar";

const SQUAD_TAB_FIXED = [COLUMN.perf, SLOT_COLUMN.xiSlot, ...SQUAD_FIXED];
const SQUAD_TAB_SORT = { id: COLUMN.perf, desc: true } as const;

interface SquadTabProps {
  players: readonly PlayerRecord[];
  analysis: AnalysisResult;
  xi: readonly (number | null)[];
  bench: readonly number[];
  club: number;
  formation: string;
  slot: number;
  slotRole: string | null;
  placeBlocked: string | null;
  onPlace(uid: number): void;
}

export function SquadTab({
  players,
  analysis,
  xi,
  bench,
  club,
  formation,
  slot,
  slotRole,
  placeBlocked,
  onPlace,
}: SquadTabProps) {
  const { t } = useTranslation("elenco");
  const options = useSellKeepOptions();
  const teams = useSquadTeams(players, club);
  const verdicts = useSquadVerdicts(players, analysis, teams.inTeam);
  const { composites, columns } = useSquadColumns({ players, analysis, club, slot, slotRole, xi, bench, options });
  const { slots } = analysis.lineup;
  const group = slotGroup(slots[slot]);
  const selectionActions = usePlaceAction({ players, club, slots, slot, xi, placeBlocked, onPlace });
  const nameCell = useSquadNameCell(players, teams.squad, club);

  return (
    <>
      <SquadToolbar teams={teams} verdicts={verdicts} options={options} />
      <PlayerTable
        key={slot}
        table={FILTER_TABLE.squad}
        rows={verdicts.rows}
        total={teams.squad.length}
        players={players}
        analysis={analysis}
        composites={composites}
        columns={columns}
        group={group}
        fixed={SQUAD_TAB_FIXED}
        defaultSort={SQUAD_TAB_SORT}
        selectionActions={selectionActions}
        nameCell={nameCell}
        criteria={<SellKeepCriteria formation={formation} />}
        emptyDescription={teams.squad.length ? t("squad.empty") : t("squad.noSquad")}
      />
    </>
  );
}
