import { memo, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { FloatingActionBar } from "@/components/FloatingActionBar";
import type { PlayerRecord } from "@/data/types";
import { formatCount } from "@/lib/format";
import { uidIndex } from "../lib/selection";
import type { SelectionAction } from "../lib/selectionActions";
import { SelectionActions } from "./SelectionActions";

interface SelectionBarProps {
  selected: ReadonlySet<number>;
  players: readonly PlayerRecord[];
  inView: number;
  actions: readonly SelectionAction[];
  leaveAtOnce: boolean;
  onClear(): void;
  onDone(): void;
}

export const SelectionBar = memo(function SelectionBar({
  selected,
  players,
  inView,
  actions,
  leaveAtOnce,
  onClear,
  onDone,
}: SelectionBarProps) {
  const { t } = useTranslation("table");
  const chosen = useMemo(() => {
    const index = uidIndex(players);
    return [...selected].flatMap((uid) => {
      const i = index.get(uid);
      return i === undefined ? [] : [players[i]];
    });
  }, [selected, players]);
  const [kept, setKept] = useState(chosen);
  if (chosen.length > 0 && chosen !== kept) setKept(chosen);
  const shown = chosen.length > 0 ? chosen : kept;
  const outside = chosen.length > 0 ? chosen.length - inView : 0;
  const selection = useMemo(() => ({ players: shown, clear: onDone }), [shown, onDone]);

  return (
    <FloatingActionBar
      open={chosen.length > 0}
      label={t("selection.label")}
      clearLabel={t("selection.clear")}
      onClear={onClear}
      leaveAtOnce={leaveAtOnce}
      summary={
        <>
          <span className="text-fg tabular-nums">{formatCount(shown.length)}</span>{" "}
          {t("selection.selected", { count: shown.length })}
          {outside > 0 && <span className="tabular-nums">, {t("selection.outside", { count: outside })}</span>}
        </>
      }
    >
      <SelectionActions actions={actions} selection={selection} />
    </FloatingActionBar>
  );
});
