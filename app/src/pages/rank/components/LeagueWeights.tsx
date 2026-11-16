import { Scale } from "lucide-react";
import { useDeferredValue, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import type { PlayerRecord } from "@/data/types";
import { formatCount } from "@/lib/format";
import { foldText } from "@/lib/text";
import { useAppStore } from "@/store/index";
import { leagueMatches } from "../lib/leagueWeights";
import { leagueRows } from "../lib/rankRows";
import { LeagueLine } from "./LeagueLine";
import { LeagueWeightsHeader } from "./LeagueWeightsHeader";

export function LeagueWeights({ players }: { players: readonly PlayerRecord[] }) {
  const { t } = useTranslation("rank");
  const weights = useAppStore((s) => s.settings.engine.leagueWeights);
  const [query, setQuery] = useState("");
  const rows = useMemo(() => leagueRows(players), [players]);
  const typed = foldText(useDeferredValue(query).trim());
  const shown = useMemo(() => (typed ? rows.filter((r) => leagueMatches(r, typed)) : rows), [rows, typed]);
  const edited = Object.keys(weights).length;

  return (
    <Sheet>
      <SheetTrigger
        render={
          <Button variant="outline" size="sm">
            <Scale data-icon="inline-start" />
            {t("leagues.title")}
            {edited > 0 && <span className="text-signal-text tabular-nums">{formatCount(edited)}</span>}
          </Button>
        }
      />
      <SheetContent side="right" className="gap-0 data-[side=right]:w-[26rem]">
        <LeagueWeightsHeader query={query} onQueryChange={setQuery} edited={edited} />
        <div className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-1">
          {shown.length ? (
            <ul aria-label={t("leagues.list")}>
              {shown.map((row) => (
                <LeagueLine key={row.key} row={row} weight={weights[row.key]} />
              ))}
            </ul>
          ) : (
            <p className="py-6 text-center type-label text-fg-muted">{t("leagues.none")}</p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
