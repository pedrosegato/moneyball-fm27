import { RotateCcw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Threshold } from "@/components/Threshold";
import { Button } from "@/components/ui/button";
import { EMPTY_VALUE, MULTIPLIER_SIGN } from "@/lib/constants";
import { formatDecimal, multiplierText } from "@/lib/format";
import { LEAGUE_WEIGHTS } from "@/store/settings";
import { setLeagueWeight } from "../lib/leagueWeights";
import type { LeagueRow } from "../lib/rankRows";

export function LeagueLine({ row, weight }: { row: LeagueRow; weight: number | undefined }) {
  const { t } = useTranslation("rank");
  const edited = weight !== undefined;
  return (
    <li className="flex items-center gap-3 border-b border-line-subtle py-1.5 last:border-b-0">
      <span className="w-8 shrink-0 text-right type-caption tabular-nums text-fg-muted">{row.rank ?? EMPTY_VALUE}</span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate type-label text-fg" title={row.name}>
          {row.name}
        </span>
        <span className="truncate type-caption text-fg-muted">
          {row.nation ?? t("leagues.unranked")}, {t("players", { ns: "common", count: row.players })}
        </span>
      </span>
      {edited && (
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label={t("leagues.restore", { name: row.name })}
          title={t("leagues.defaultWeight", { weight: multiplierText(formatDecimal(row.weight, 3)) })}
          className="text-fg-muted"
          onClick={() => setLeagueWeight(row.key, row.weight, row.weight)}
        >
          <RotateCcw />
        </Button>
      )}
      <Threshold
        name={t("leagues.weightOf", { name: row.name })}
        value={weight ?? row.weight}
        min={LEAGUE_WEIGHTS.min}
        max={LEAGUE_WEIGHTS.max}
        decimals={3}
        fixed
        prefix={MULTIPLIER_SIGN}
        className={edited ? "[&_input]:text-signal-text" : undefined}
        onCommit={(next) => setLeagueWeight(row.key, next, row.weight)}
      />
    </li>
  );
}
