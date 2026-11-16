import { Download } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { ValueModeControl } from "@/components/ValueModeControl";
import { COLUMN } from "@/engine/columnIds";
import { PeriodFilter } from "@/filters/PeriodFilter";
import type { SearchKey, ValueMode } from "@/store/ui";
import type { TableColumn, TableColumnState } from "../columns/types";
import { visibleColumnIds } from "../columns/visibility";
import type { ColumnActions } from "../lib/columnActions";
import { ColumnGroups } from "./ColumnGroups";
import { ColumnsMenu } from "./ColumnsMenu";
import { PlayerCount } from "./PlayerCount";
import { PlayerSearch } from "./PlayerSearch";
import { RolePicker } from "./RolePicker";
import { TableBusyBar } from "./TableBusyBar";

interface TableToolbarProps {
  searchKey: SearchKey;
  listed: number;
  of: number;
  columns: readonly TableColumn[];
  columnState: TableColumnState;
  columnActions: ColumnActions;
  mode: ValueMode;
  onModeChange(mode: ValueMode): void;
  onExport(): void;
  position?: ReactNode;
  filtersPanel?: ReactNode;
  chips?: ReactNode;
  filterBar?: ReactNode;
  criteria?: ReactNode;
}

const rolePicked = (columns: readonly TableColumn[], state: TableColumnState) =>
  columns.some((c) => c.id === COLUMN.perf && !c.local) && visibleColumnIds(columns, state).includes(COLUMN.perf);

export function TableToolbar({
  searchKey,
  listed,
  of,
  columns,
  columnState,
  columnActions,
  mode,
  onModeChange,
  onExport,
  position,
  filtersPanel,
  chips,
  filterBar,
  criteria,
}: TableToolbarProps) {
  const { t } = useTranslation("table");
  return (
    <div className="relative shrink-0 border-b border-line-subtle">
      <fieldset aria-label={t("view.who")} className="flex min-h-11 items-start gap-3 px-4 py-1.5">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1">
          <PlayerSearch searchKey={searchKey} />
          <PeriodFilter />
          {position}
          {filtersPanel}
          {chips}
          {filterBar}
        </div>
        <PlayerCount listed={listed} of={of} />
      </fieldset>
      <fieldset aria-label={t("view.how")} className="flex flex-wrap items-start gap-x-3 pr-4">
        <ColumnGroups state={columnState} actions={columnActions} />
        <div className="ml-auto flex min-h-10 min-w-0 flex-wrap items-center justify-end gap-x-2 gap-y-1 py-1">
          {rolePicked(columns, columnState) && <RolePicker />}
          <ValueModeControl mode={mode} onChange={onModeChange} />
          <ColumnsMenu columns={columns} state={columnState} actions={columnActions} />
          {criteria}
          <Button variant="ghost" onClick={onExport} disabled={listed === 0}>
            <Download data-icon="inline-start" />
            {t("view.csv")}
          </Button>
        </div>
      </fieldset>
      <TableBusyBar />
    </div>
  );
}
