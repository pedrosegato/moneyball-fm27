import { useTranslation } from "react-i18next";
import { useShallow } from "zustand/react/shallow";
import { SegmentedControl } from "@/components/SegmentedControl";
import { SegmentedControlItem } from "@/components/SegmentedControlItem";
import { DEFAULT_LEAGUE_ADJUSTMENT } from "@/engine/analysis/input";
import { formatDecimal } from "@/lib/format";
import { appStore, useAppStore } from "@/store/index";
import { LEAGUE_ADJUSTMENT_STEPS } from "@/store/settings";
import { Row } from "./Row";
import { Section } from "./Section";

export function LeagueAdjustment() {
  const { t } = useTranslation("settings");
  const { leagueAdjustment, updateSettings } = useAppStore(
    useShallow((s) => ({ leagueAdjustment: s.settings.engine.leagueAdjustment, updateSettings: s.updateSettings })),
  );
  const choose = (value: number) =>
    updateSettings({ engine: { ...appStore.getState().settings.engine, leagueAdjustment: value } });
  return (
    <Section
      title={t("league.title")}
      onRestore={leagueAdjustment !== DEFAULT_LEAGUE_ADJUSTMENT ? () => choose(DEFAULT_LEAGUE_ADJUSTMENT) : undefined}
    >
      <Row label={t("league.label")} description={t("league.hint")}>
        <SegmentedControl
          aria-label={t("league.label")}
          value={String(leagueAdjustment)}
          onValueChange={(next) => choose(Number(next))}
        >
          {LEAGUE_ADJUSTMENT_STEPS.map((step) => (
            <SegmentedControlItem key={step} value={String(step)}>
              {step === 0 ? t("league.off") : t("league.multiplier", { value: formatDecimal(step, 1) })}
            </SegmentedControlItem>
          ))}
        </SegmentedControl>
      </Row>
    </Section>
  );
}
