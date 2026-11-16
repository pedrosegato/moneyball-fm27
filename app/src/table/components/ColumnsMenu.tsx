import { Columns3, SlidersHorizontal } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { GROUP_LABELS } from "@/engine/data/groups";
import { hrefOf } from "@/shell/Router";
import { CONFIG_SECTION, PAGE } from "@/shell/routeIds";
import { COLUMN_GROUP, NAME_COLUMN } from "../columns/ids";
import type { TableColumn, TableColumnState } from "../columns/types";
import { viewColumns } from "../columns/visibility";
import { type ColumnActions, columnGroups, setColumnShown } from "../lib/columnActions";
import { defaultColumnsFor, presetKeyOf } from "../presets";

interface ColumnsMenuProps {
  columns: readonly TableColumn[];
  state: TableColumnState;
  actions: ColumnActions;
}

const editComposites = () => {
  window.location.hash = hrefOf({ page: PAGE.config, section: CONFIG_SECTION.composites });
};

export function ColumnsMenu({ columns, state, actions }: ColumnsMenuProps) {
  const { t } = useTranslation("table");
  const key = presetKeyOf(state.group);
  const preset = state.presets[key] ?? defaultColumnsFor(state.group);
  const inPreset = new Set(preset);
  const fixed = viewColumns(state);
  const presetName = state.group ? GROUP_LABELS[state.group] : t("columns.general");

  const toggle = (id: string, checked: boolean) => {
    if (state.groups.length) actions.setColumnGroups([]);
    setColumnShown(state, actions, id, checked);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost">
            <Columns3 data-icon="inline-start" />
            {t("columns.trigger")}
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="max-h-[min(70vh,34rem)] w-80">
        <DropdownMenuItem disabled={!state.presets[key]} onClick={() => actions.resetColumnPreset(key)}>
          {t("columns.restore", { preset: presetName })}
        </DropdownMenuItem>
        {columnGroups().map((g) => {
          const items = columns.filter((c) => c.group === g.id && c.id !== NAME_COLUMN);
          if (!items.length) return null;
          return (
            <DropdownMenuGroup key={g.id}>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>{g.label}</DropdownMenuLabel>
              {items.map((c) => {
                const locked = fixed.has(c.id);
                return (
                  <DropdownMenuCheckboxItem
                    key={c.id}
                    checked={locked || inPreset.has(c.id)}
                    disabled={locked}
                    onCheckedChange={(checked) => toggle(c.id, checked)}
                  >
                    <span className="shrink-0 tabular-nums">{c.abbr}</span>{" "}
                    <span className="min-w-0 truncate text-fg-muted">{c.label}</span>
                  </DropdownMenuCheckboxItem>
                );
              })}
              {g.id === COLUMN_GROUP.composites && (
                <DropdownMenuItem onClick={editComposites}>
                  <SlidersHorizontal />
                  {t("columns.editComposites")}
                </DropdownMenuItem>
              )}
            </DropdownMenuGroup>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
