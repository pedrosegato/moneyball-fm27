import { useTranslation } from "react-i18next";
import { CriteriaFieldset } from "@/components/CriteriaFieldset";
import { CriteriaPopover } from "@/components/CriteriaPopover";
import { Threshold } from "@/components/Threshold";
import { DEFAULT_ENGINE_SETTINGS, type EngineSettings } from "@/engine/analysis/input";
import { MULTIPLIER_SIGN } from "@/lib/constants";
import { ENGINE_LIMITS } from "@/store/settings";
import { useEngineSettings } from "../hooks/useEngineSettings";

type Options = EngineSettings["sellKeep"];

const LIMITS = ENGINE_LIMITS.sellKeep;
const DEFAULTS = DEFAULT_ENGINE_SETTINGS;

const sameOptions = (a: Options, b: Options) => (Object.keys(b) as (keyof Options)[]).every((k) => a[k] === b[k]);

export function SellKeepCriteria({ formation }: { formation: string | null }) {
  const { t } = useTranslation("elenco");
  const { options, poolMinutes, update, set } = useEngineSettings("sellKeep");
  const changed = !sameOptions(options, DEFAULTS.sellKeep) || poolMinutes !== DEFAULTS.poolMinutes;

  return (
    <CriteriaPopover changed={changed}>
      <CriteriaFieldset
        title={t("sellKeepCriteria.title")}
        changed={changed}
        onRestore={() => update({ sellKeep: DEFAULTS.sellKeep, poolMinutes: DEFAULTS.poolMinutes })}
      >
        <Threshold
          label={t("sellKeepCriteria.devVsAge.label")}
          name={t("sellKeepCriteria.devVsAge.name")}
          hint={t("sellKeepCriteria.devVsAge.hint")}
          value={options.devVsAge}
          max={LIMITS.devVsAge.max}
          suffix="%"
          onCommit={(devVsAge) => set({ devVsAge })}
        />
        <Threshold
          label={t("sellKeepCriteria.loanVsAge.label")}
          name={t("sellKeepCriteria.loanVsAge.name")}
          hint={t("sellKeepCriteria.loanVsAge.hint")}
          value={options.loanVsAge}
          max={LIMITS.loanVsAge.max}
          suffix="%"
          onCommit={(loanVsAge) => set({ loanVsAge })}
        />
        <Threshold
          label={t("sellKeepCriteria.youngAge.label")}
          name={t("sellKeepCriteria.youngAge.name")}
          hint={t("sellKeepCriteria.youngAge.hint")}
          value={options.youngAge}
          max={LIMITS.youngAge.max}
          suffix={t("unit.years")}
          onCommit={(youngAge) => set({ youngAge })}
        />
        <Threshold
          label={t("sellKeepCriteria.contractMonths.label")}
          name={t("sellKeepCriteria.contractMonths.name")}
          value={options.contractMonths}
          max={LIMITS.contractMonths.max}
          suffix={t("unit.months")}
          onCommit={(contractMonths) => set({ contractMonths })}
        />
        <Threshold
          label={t("sellKeepCriteria.sellHighRatio.label")}
          name={t("sellKeepCriteria.sellHighRatio.name")}
          value={options.sellHighRatio}
          max={LIMITS.sellHighRatio.max}
          prefix={MULTIPLIER_SIGN}
          onCommit={(sellHighRatio) => set({ sellHighRatio })}
        />
        <Threshold
          label={t("sellKeepCriteria.declineAge.label")}
          name={t("sellKeepCriteria.declineAge.name")}
          value={options.declineAge}
          max={LIMITS.declineAge.max}
          suffix={t("unit.years")}
          onCommit={(declineAge) => set({ declineAge })}
        />
        <Threshold
          label={t("sellKeepCriteria.gkDeclineAge.label")}
          name={t("sellKeepCriteria.gkDeclineAge.name")}
          value={options.gkDeclineAge}
          max={LIMITS.gkDeclineAge.max}
          suffix={t("unit.years")}
          onCommit={(gkDeclineAge) => set({ gkDeclineAge })}
        />
        <Threshold
          label={t("sellKeepCriteria.poolMinutes.label")}
          name={t("sellKeepCriteria.poolMinutes.name")}
          hint={t("sellKeepCriteria.poolMinutes.hint")}
          value={poolMinutes}
          min={ENGINE_LIMITS.poolMinutes.min}
          max={ENGINE_LIMITS.poolMinutes.max}
          suffix={t("unit.minutes")}
          onCommit={(minutes) => update({ poolMinutes: minutes })}
        />
        <p className="-mt-0.5 type-caption text-fg-muted">{t("sellKeepCriteria.scope")}</p>
        {formation && (
          <p className="mt-1 border-t border-line-subtle pt-2 type-caption text-fg-muted">
            {t("sellKeepCriteria.formation", { formation })}
          </p>
        )}
      </CriteriaFieldset>
    </CriteriaPopover>
  );
}
