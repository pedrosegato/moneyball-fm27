import { useTranslation } from "react-i18next";
import { CountSegmentedControl } from "@/components/CountSegmentedControl";
import { PageToolbar } from "@/components/PageToolbar";
import type { FitVerdict } from "@/engine/tacticalFit";
import { ALL } from "@/lib/constants";
import type { VerdictFilter } from "../hooks/useSigningsVerdicts";
import { FIT_VERDICTS } from "../lib/fitRows";
import { fitLabel, fitRule } from "../lib/fitText";

interface SigningsVerdictsProps {
  counts: Record<FitVerdict, number> | null;
  verdict: VerdictFilter;
  lvl: number;
  onVerdict(verdict: VerdictFilter): void;
}

export function SigningsVerdicts({ counts, verdict, lvl, onVerdict }: SigningsVerdictsProps) {
  const { t } = useTranslation(["elenco", "common"]);
  return (
    <PageToolbar>
      {counts ? (
        <CountSegmentedControl<VerdictFilter>
          aria-label={t("common:verdict")}
          value={verdict}
          onValueChange={onVerdict}
          all={{ value: ALL, count: counts.upgrade + counts.replacement + counts.downgrade }}
          segments={FIT_VERDICTS.map((v) => ({
            value: v,
            label: fitLabel(v),
            count: counts[v],
            title: fitRule(v, lvl),
          }))}
        />
      ) : (
        <p className="type-caption text-fg-muted">{t("signings.noMine")}</p>
      )}
    </PageToolbar>
  );
}
