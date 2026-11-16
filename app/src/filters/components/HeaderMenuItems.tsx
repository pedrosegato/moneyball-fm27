import { ArrowDown, ArrowUp, ArrowUpDown, EyeOff, FunnelX, ListFilter } from "lucide-react";
import type { MouseEvent } from "react";
import { useTranslation } from "react-i18next";
import {
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { byKeyboard, type HeaderMenuActions, NO_FILTER } from "../lib/headerMenu";

interface HeaderMenuItemsProps {
  id: string;
  actions: HeaderMenuActions;
  handOff(): void;
}

export function HeaderMenuItems({ id, actions, handOff }: HeaderMenuItemsProps) {
  const { t } = useTranslation("filters");
  const column = actions.column(id);
  if (!column) return null;
  const filtering = actions.filtering;
  const state = filtering?.stateOf(column) ?? NO_FILTER;
  const sorted = actions.sortedAs(id);
  const hideBlock = actions.hideBlock(id);

  const openEditor = (e: MouseEvent) => {
    const header = actions.header(id);
    if (!header || !filtering) return;
    filtering.edit(column, header, byKeyboard(e));
    handOff();
  };

  return (
    <>
      <DropdownMenuGroup>
        <DropdownMenuLabel className="truncate">{column.label}</DropdownMenuLabel>
        {filtering && state.filterable && (
          <DropdownMenuItem aria-label={state.active ? t("menu.filterActive") : undefined} onClick={openEditor}>
            <ListFilter aria-hidden />
            {t("menu.filter")}
            {state.active && <span className="ml-auto type-caption text-signal-text">{t("menu.active")}</span>}
          </DropdownMenuItem>
        )}
        {filtering && state.active && (
          <DropdownMenuItem onClick={() => filtering.clear(column)}>
            <FunnelX aria-hidden />
            {t("removeFilter")}
          </DropdownMenuItem>
        )}
      </DropdownMenuGroup>
      <DropdownMenuSeparator />
      <DropdownMenuGroup>
        <DropdownMenuItem disabled={sorted === "asc"} onClick={() => actions.sortBy(id, false)}>
          <ArrowUp aria-hidden />
          {t("menu.sortAsc")}
        </DropdownMenuItem>
        <DropdownMenuItem disabled={sorted === "desc"} onClick={() => actions.sortBy(id, true)}>
          <ArrowDown aria-hidden />
          {t("menu.sortDesc")}
        </DropdownMenuItem>
        {actions.sortedByUser(id) && (
          <DropdownMenuItem onClick={actions.unsort}>
            <ArrowUpDown aria-hidden />
            {t("menu.unsort")}
          </DropdownMenuItem>
        )}
        {hideBlock !== null && (
          <DropdownMenuItem disabled={hideBlock !== undefined} onClick={() => actions.hide(id)}>
            <EyeOff aria-hidden />
            <span className="flex min-w-0 flex-col">
              {t("menu.hide")}
              {hideBlock && <span className="type-caption text-fg-muted">{hideBlock}</span>}
            </span>
          </DropdownMenuItem>
        )}
      </DropdownMenuGroup>
    </>
  );
}
