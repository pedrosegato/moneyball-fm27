import { Toggle } from "@base-ui/react/toggle";
import { ToggleGroup } from "@base-ui/react/toggle-group";
import { useTranslation } from "react-i18next";
import { STAT_GROUPS } from "@/engine/stats/groups";
import type { TableColumnState } from "../columns/types";
import type { ColumnActions } from "../lib/columnActions";

const GENERAL = "geral";
const GROUP_IDS = STAT_GROUPS.map((g) => g.id);

const GROUP_CHIP =
  "inline-flex h-6 cursor-default items-center justify-center rounded-md border border-transparent px-2 type-label whitespace-nowrap text-fg-muted select-none hover:text-fg focus-ring aria-pressed:border-line aria-pressed:bg-surface-control aria-pressed:text-fg";

interface ColumnGroupsProps {
  state: TableColumnState;
  actions: ColumnActions;
}

export function ColumnGroups({ state, actions }: ColumnGroupsProps) {
  const { t } = useTranslation("table");
  const on = state.groups;
  const change = (pressed: readonly string[]) =>
    actions.setColumnGroups(on.length && pressed.includes(GENERAL) ? [] : GROUP_IDS.filter((g) => pressed.includes(g)));
  return (
    <ToggleGroup
      multiple
      aria-label={t("columns.groups")}
      value={on.length ? on : [GENERAL]}
      onValueChange={change}
      className="flex min-w-[min(24rem,100%)] flex-1 flex-wrap items-center gap-1 py-2 pl-4"
    >
      <Toggle value={GENERAL} className={GROUP_CHIP}>
        {t("columns.general")}
      </Toggle>
      {STAT_GROUPS.map((g) => (
        <Toggle key={g.id} value={g.id} className={GROUP_CHIP}>
          {g.label}
        </Toggle>
      ))}
    </ToggleGroup>
  );
}
