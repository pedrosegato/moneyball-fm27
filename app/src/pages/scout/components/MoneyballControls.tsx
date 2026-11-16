import { useTranslation } from "react-i18next";
import { useShallow } from "zustand/react/shallow";
import { CriteriaFieldset } from "@/components/CriteriaFieldset";
import { Threshold } from "@/components/Threshold";
import { DEFAULT_ENGINE_SETTINGS } from "@/engine/analysis/input";
import { MULTIPLIER_SIGN } from "@/lib/constants";
import { formatDecimal } from "@/lib/format";
import { currencyPlural } from "@/lib/money";
import { appStore, useAppStore, useMoney } from "@/store/index";
import { ENGINE_LIMITS } from "@/store/settings";
import { MILLION, type MoneyballThresholds, sameCriteria } from "../lib/moneyball";

const LIMITS = ENGINE_LIMITS.moneyball;

export function MoneyballControls() {
  const { t } = useTranslation("scout");
  const { criteria, updateSettings } = useAppStore(
    useShallow((s) => ({ criteria: s.settings.engine.moneyball, updateSettings: s.updateSettings })),
  );
  const set = (patch: Partial<MoneyballThresholds>) => {
    const engine = appStore.getState().settings.engine;
    updateSettings({ engine: { ...engine, moneyball: { ...engine.moneyball, ...patch } } });
  };
  const defaults = DEFAULT_ENGINE_SETTINGS.moneyball;
  const money = useMoney();
  const { rate } = money;

  return (
    <CriteriaFieldset
      title={t("moneyball.title")}
      changed={!sameCriteria(criteria, defaults)}
      onRestore={() => set(defaults)}
    >
      <Threshold
        label={t("moneyball.ratio")}
        name={t("moneyball.ratioName")}
        value={criteria.minRatio}
        max={LIMITS.minRatio.max}
        prefix={MULTIPLIER_SIGN}
        onCommit={(minRatio) => set({ minRatio })}
      />
      <Threshold
        label={t("moneyball.perf")}
        name={t("moneyball.perfName")}
        value={criteria.minPerf}
        max={LIMITS.minPerf.max}
        onCommit={(minPerf) => set({ minPerf })}
      />
      <Threshold
        label={t("moneyball.fair")}
        name={t("moneyball.fairName", { currency: currencyPlural(money) })}
        value={(criteria.minFair * rate) / MILLION}
        max={(LIMITS.minFair.max * rate) / MILLION}
        prefix={money.symbol}
        suffix={t("moneyball.millions")}
        onCommit={(millions) => set({ minFair: Math.round((millions * MILLION) / rate) })}
      />
      <p className="-mt-0.5 type-caption text-fg-muted">
        {t("criteria.scope", { ns: "common", minutes: formatDecimal(criteria.minMinutes, 0) })}
      </p>
    </CriteriaFieldset>
  );
}
