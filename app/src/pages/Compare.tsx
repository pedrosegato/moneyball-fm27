import { GitCompareArrows } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useShallow } from "zustand/react/shallow";
import { Page } from "@/components/Page";
import { PageEmpty } from "@/components/PageEmpty";
import { Button } from "@/components/ui/button";
import type { PosGroup } from "@/engine/positions";
import { hrefOf } from "@/shell/Router";
import { PAGE } from "@/shell/routeIds";
import { useAppStore } from "@/store/index";
import { MAX_COMPARE } from "@/store/ui";
import { useData } from "@/store/useData";
import { ComparedPlayers } from "./compare/components/ComparedPlayers";
import { ComparedStats } from "./compare/components/ComparedStats";
import { useComparedEntries } from "./compare/hooks/useComparedEntries";

export function Compare() {
  const { t } = useTranslation("compare");
  const { snapshot, analysis } = useData();
  const { compare, toggleCompare, selectPlayer } = useAppStore(
    useShallow((s) => ({ compare: s.ui.compare, toggleCompare: s.toggleCompare, selectPlayer: s.selectPlayer })),
  );
  const [chosen, setChosen] = useState<PosGroup | null>(null);
  const { located, group, defs, entries } = useComparedEntries(compare, analysis, snapshot?.players, chosen);

  if (!snapshot || !analysis) return null;

  if (compare.length === 0) {
    return (
      <PageEmpty
        icon={GitCompareArrows}
        title={t("empty.title")}
        description={t("empty.description", { max: MAX_COMPARE })}
        action={<Button render={<a href={hrefOf({ page: PAGE.scout })}>{t("empty.action")}</a>} nativeButton={false} />}
      />
    );
  }

  return (
    <Page>
      <div className="relative min-h-0 flex-1 overflow-y-auto">
        <div className="flex max-w-6xl flex-col gap-6 px-4 py-4">
          <ComparedPlayers
            located={located}
            entries={entries}
            analysis={analysis}
            onOpen={selectPlayer}
            onRemove={toggleCompare}
          />
          {entries.length > 0 && group && (
            <ComparedStats
              entries={entries}
              group={group}
              defs={defs.length}
              poolMinutes={analysis.poolMinutes}
              onGroupChange={setChosen}
            />
          )}
        </div>
      </div>
    </Page>
  );
}
