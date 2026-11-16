import { useTranslation } from "react-i18next";
import { useShallow } from "zustand/react/shallow";
import { Page } from "@/components/Page";
import { ToggleChip } from "@/components/ToggleChip";
import { FILTER_TABLE } from "@/store/filters";
import { useAppStore } from "@/store/index";
import { useData } from "@/store/useData";
import { usePlayerColumns } from "@/table/hooks/usePlayerColumns";
import { PlayerTable } from "@/table/PlayerTable";
import { PLAYER_ACTIONS } from "@/table/playerActions";
import { MoneyballCriteria } from "./scout/components/MoneyballCriteria";
import { useScoutRows } from "./scout/hooks/useScoutRows";
import { MONEYBALL_COLUMNS, MONEYBALL_SORT } from "./scout/lib/moneyball";

export function Scout() {
  const { t } = useTranslation("scout");
  const { snapshot, analysis } = useData();
  const { undervaluedOnly, setMoneyball } = useAppStore(
    useShallow((s) => ({ undervaluedOnly: s.ui.moneyball, setMoneyball: s.setMoneyball })),
  );
  const players = snapshot?.players;
  const { composites, columns } = usePlayerColumns(players, analysis);
  const rows = useScoutRows(analysis, players?.length ?? 0, undervaluedOnly);

  if (!snapshot || !analysis || !columns || !players) return null;

  return (
    <Page>
      <PlayerTable
        key={undervaluedOnly ? "moneyball" : "all"}
        table={FILTER_TABLE.scout}
        rows={rows}
        players={players}
        analysis={analysis}
        composites={composites}
        columns={columns}
        fixed={undervaluedOnly ? MONEYBALL_COLUMNS : undefined}
        defaultSort={undervaluedOnly ? MONEYBALL_SORT : undefined}
        selectionActions={PLAYER_ACTIONS}
        chips={
          <ToggleChip label={t("onlyUndervalued", { ns: "common" })} on={undervaluedOnly} onChange={setMoneyball} />
        }
        criteria={undervaluedOnly && <MoneyballCriteria />}
        emptyActions={[undervaluedOnly && { label: t("showAll"), onClick: () => setMoneyball(false) }]}
        emptyDescription={undervaluedOnly ? t("emptyMoneyball") : undefined}
      />
    </Page>
  );
}
