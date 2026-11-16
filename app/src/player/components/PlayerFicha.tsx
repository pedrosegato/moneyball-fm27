import { useTranslation } from "react-i18next";
import type { PlayerRecord } from "@/data/types";
import { marketValue, minutesOf } from "@/engine/club";
import { COLUMN, POOL_HIDDEN_COLUMNS } from "@/engine/columnIds";
import type { AnalysisResult } from "@/engine/index";
import { EMPTY_VALUE } from "@/lib/constants";
import { formatCount, formatDate, formatRounded, orEmpty } from "@/lib/format";
import { perWagePeriod } from "@/lib/money";
import { useFormatMoney, useFormatWage, useMoney } from "@/store/index";
import { strengthTitle } from "../lib/fichaTitles";
import { Fact } from "./Fact";
import { HiddenUnderPool } from "./HiddenUnderPool";
import { PerformanceFact } from "./PerformanceFact";

interface PlayerFichaProps {
  player: PlayerRecord;
  i: number;
  analysis: AnalysisResult;
}

export function PlayerFicha({ player, i, analysis }: PlayerFichaProps) {
  const { t } = useTranslation("player");
  const amount = useFormatMoney();
  const wage = useFormatWage();
  const wageTitle = t("ficha.wageTitle", { period: perWagePeriod(useMoney()) });
  const hidden = (id: string, value: number) =>
    POOL_HIDDEN_COLUMNS.has(id) && !analysis.pool[i] && !Number.isNaN(value);
  const perf = analysis.perf[i];
  const unadjusted = analysis.perfUnadjusted[i];
  const fair = analysis.fair[i];
  return (
    <div className="@container">
      <ul
        aria-label={t("ficha.label")}
        className="grid grid-cols-6 gap-px overflow-hidden rounded-lg border border-line bg-line"
      >
        <Fact label={t("marketValue", { ns: "common" })} value={orEmpty(marketValue(player), amount)} />
        <Fact label={t("ficha.wage")} title={wageTitle} value={orEmpty(player.wage, wage)} />
        <Fact
          label={t("ficha.contract")}
          title={t("ficha.contractTitle")}
          value={player.contract_end ? formatDate(player.contract_end) : EMPTY_VALUE}
        />
        <Fact
          label={t("ficha.fair")}
          title={t("ficha.fairTitle")}
          value={hidden(COLUMN.fair, fair) ? <HiddenUnderPool label={t("ficha.fair")} /> : orEmpty(fair, amount)}
        />
        <Fact
          label={t("minutes", { ns: "common" })}
          title={t("ficha.minutesTitle")}
          value={formatCount(minutesOf(player))}
        />
        <Fact
          label={t("ficha.strength")}
          title={strengthTitle(analysis.myLeagueStrength)}
          value={orEmpty(analysis.leagueStrength[i], formatRounded)}
        />
        <PerformanceFact
          label={t("ficha.perf")}
          title={t("ficha.perfTitle")}
          value={perf}
          unadjusted={unadjusted}
          hidden={hidden(COLUMN.perf, perf)}
        />
      </ul>
    </div>
  );
}
