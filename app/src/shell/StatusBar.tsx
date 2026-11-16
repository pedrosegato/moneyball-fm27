import { useTranslation } from "react-i18next";
import { useShallow } from "zustand/react/shallow";
import { formatClock } from "@/lib/format";
import { gameMoneyOf, useAppStore } from "@/store/index";
import { useDataController } from "@/store/useData";
import { ProblemStrip } from "./ProblemStrip";
import { isProblem, plateState } from "./plateState";
import { ReloadButton } from "./ReloadButton";
import { StatusSummary } from "./StatusSummary";

export function StatusBar() {
  const { t } = useTranslation("shell");
  const { reload } = useDataController();
  const data = useAppStore(
    useShallow(({ data: d }) => ({
      snapshot: d.snapshot,
      status: d.status,
      gameDate: d.gameDate,
      loading: d.loading,
      error: d.error,
      readAt: d.readAt,
    })),
  );
  const moneyRead = useAppStore((s) => gameMoneyOf(s.data) !== null);
  const state = plateState(data);
  const build = data.status?.build ?? data.snapshot?.build;
  const details = [
    state.label,
    data.status?.game,
    build && t("status.build", { build }),
    data.readAt != null && t("status.readAt", { clock: formatClock(data.readAt) }),
    data.snapshot && !moneyRead && t("status.moneyUnread"),
  ].filter((line): line is string => Boolean(line));
  const onReload = () => void reload();

  return (
    <fieldset aria-label={t("status.label")} className="flex min-w-0 items-center gap-1.5">
      {isProblem(state) && <ProblemStrip key={state.tone} state={state} onReload={onReload} />}
      <StatusSummary state={state} snapshot={data.snapshot} details={details} />
      <ReloadButton disabled={data.loading} onReload={onReload} />
    </fieldset>
  );
}
