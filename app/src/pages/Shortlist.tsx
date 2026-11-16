import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { COLUMN } from "@/engine/columnIds";
import { appStore, useAppStore } from "@/store/index";
import { SEARCH_KEY } from "@/store/ui";
import { useData } from "@/store/useData";
import type { TableColumnState } from "@/table/columns/types";
import { usePlayerColumns } from "@/table/hooks/usePlayerColumns";
import { useTablePageState } from "@/table/hooks/useTablePageState";
import { PlayerTable } from "@/table/PlayerTable";
import { FolderList } from "./cart/components/FolderList";
import { MissingNote } from "./cart/components/MissingNote";
import { useShortlistActions } from "./cart/hooks/useShortlistActions";
import { useShortlistFolder } from "./cart/hooks/useShortlistFolder";

const SHORTLIST_FIXED = [COLUMN.perf, COLUMN.fair, "value", "wage", COLUMN.monthsLeft] as const;

export function Shortlist() {
  const { t } = useTranslation("cart");
  const { snapshot, analysis } = useData();
  const folders = useAppStore((s) => s.shortlist.folders);
  const page = useTablePageState();
  const players = snapshot?.players;
  const { folder, choose, rows, missing } = useShortlistFolder(folders, players);
  const { composites, columns } = usePlayerColumns(players, analysis);
  const columnState = useMemo<TableColumnState>(
    () => ({ group: null, ...page.columns, fixed: SHORTLIST_FIXED }),
    [page.columns],
  );
  const actions = useShortlistActions(folder.id, folders);

  if (!snapshot || !analysis || !columns || !players) return null;

  return (
    <div className="flex min-h-0 flex-1">
      <FolderList folders={folders} selectedId={folder.id} onSelect={choose} />
      <div className="flex min-w-0 flex-1 flex-col">
        {missing.length > 0 && (
          <MissingNote
            text={t("shortlistPage.missing", { count: missing.length })}
            action={t("shortlistPage.remove")}
            onAction={() => appStore.getState().removeFromFolder(missing, folder.id)}
          />
        )}
        <PlayerTable
          key={folder.id}
          rows={rows}
          players={players}
          analysis={analysis}
          composites={composites}
          columns={columns}
          mode={page.mode}
          onModeChange={page.setMode}
          columnState={columnState}
          columnActions={page.columnActions}
          onOpenPlayer={page.selectPlayer}
          selectedUid={page.selectedUid}
          selectionActions={actions}
          searchKey={SEARCH_KEY.shortlist}
          emptyDescription={missing.length ? t("shortlistPage.allMissing") : t("shortlistPage.empty")}
        />
      </div>
    </div>
  );
}
