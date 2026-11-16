import { useTranslation } from "react-i18next";
import { CriteriaFieldset } from "@/components/CriteriaFieldset";
import { CriteriaPopover } from "@/components/CriteriaPopover";
import { Threshold } from "@/components/Threshold";
import { DEFAULT_ENGINE_SETTINGS, type EngineSettings } from "@/engine/analysis/input";
import { formatDecimal } from "@/lib/format";
import { ENGINE_LIMITS } from "@/store/settings";
import { useEngineSettings } from "../hooks/useEngineSettings";
import { LeaguePicker } from "./LeaguePicker";
import { MarginSlider } from "./MarginSlider";

const DEFAULTS = DEFAULT_ENGINE_SETTINGS.fit;
const atDefaults = (o: EngineSettings["fit"]) =>
  o.lvl === DEFAULTS.lvl && o.styleMin === DEFAULTS.styleMin && o.leagueFilter.kind === DEFAULTS.leagueFilter.kind;

interface FitCriteriaProps {
  lvl: number;
  onLvlDraft(lvl: number | null): void;
}

export function FitCriteria({ lvl, onLvlDraft }: FitCriteriaProps) {
  const { t } = useTranslation("elenco");
  const { options, engine, set } = useEngineSettings("fit");
  const commitLvl = (next: number) => {
    onLvlDraft(null);
    if (next !== engine().fit.lvl) set({ lvl: next });
  };
  const changed = !atDefaults(options);

  return (
    <CriteriaPopover changed={changed}>
      <CriteriaFieldset title={t("fitCriteria.title")} changed={changed} onRestore={() => set(DEFAULTS)}>
        <MarginSlider lvl={lvl} onDraft={onLvlDraft} onCommit={commitLvl} />
        <Threshold
          label={t("fitCriteria.style")}
          name={t("fitCriteria.styleName")}
          value={options.styleMin}
          max={ENGINE_LIMITS.fit.styleMin.max}
          suffix="%"
          onCommit={(styleMin) => set({ styleMin })}
        />
        <LeaguePicker value={options.leagueFilter} onChange={(leagueFilter) => set({ leagueFilter })} />
        <p className="-mt-0.5 type-caption text-fg-muted" title={t("fitCriteria.leagueHint")}>
          {t("criteria.scope", { ns: "common", minutes: formatDecimal(options.minMinutes, 0) })}
        </p>
      </CriteriaFieldset>
    </CriteriaPopover>
  );
}
