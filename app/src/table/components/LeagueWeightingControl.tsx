import { useTranslation } from "react-i18next";
import { useShallow } from "zustand/react/shallow";
import { SegmentedControl } from "@/components/SegmentedControl";
import { SegmentedControlItem } from "@/components/SegmentedControlItem";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { LEAGUE_WEIGHTINGS, type LeagueWeighting } from "@/engine/leagueStrength";
import { appStore, useAppStore } from "@/store/index";

export function LeagueWeightingControl() {
  const { t } = useTranslation("table");
  const { weighting, updateSettings } = useAppStore(
    useShallow((s) => ({ weighting: s.settings.engine.leagueWeighting, updateSettings: s.updateSettings })),
  );
  const pick = (leagueWeighting: LeagueWeighting) =>
    updateSettings({ engine: { ...appStore.getState().settings.engine, leagueWeighting } });

  return (
    <SegmentedControl
      aria-label={t("leagueWeighting.label")}
      value={weighting}
      onValueChange={(v) => pick(v as LeagueWeighting)}
    >
      {LEAGUE_WEIGHTINGS.map((w) => (
        <Tooltip key={w}>
          <TooltipTrigger render={<SegmentedControlItem value={w} />}>{t(`leagueWeighting.${w}.name`)}</TooltipTrigger>
          <TooltipContent side="bottom">{t(`leagueWeighting.${w}.hint`)}</TooltipContent>
        </Tooltip>
      ))}
    </SegmentedControl>
  );
}
