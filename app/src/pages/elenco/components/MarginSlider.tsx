import { useTranslation } from "react-i18next";
import { Slider } from "@/components/ui/slider";
import { ENGINE_LIMITS } from "@/store/settings";

interface MarginSliderProps {
  lvl: number;
  onDraft(lvl: number): void;
  onCommit(lvl: number): void;
}

export function MarginSlider({ lvl, onDraft, onCommit }: MarginSliderProps) {
  const { t } = useTranslation("elenco");
  return (
    <div className="flex h-7 items-center justify-between gap-3" title={t("fitCriteria.marginHint")}>
      <span className="type-label whitespace-nowrap text-fg-muted">{t("fitCriteria.margin")}</span>
      <div className="flex w-44 items-center gap-2.5">
        <div className="min-w-0 flex-1">
          <Slider
            value={[lvl]}
            min={ENGINE_LIMITS.fit.lvl.min}
            max={ENGINE_LIMITS.fit.lvl.max}
            step={1}
            getAriaLabel={() => t("fitCriteria.marginLabel")}
            onValueChange={(v) => onDraft((v as number[])[0])}
            onValueCommitted={(v) => onCommit((v as number[])[0])}
          />
        </div>
        <span className="w-7 text-right type-label tabular-nums text-fg">{t("fitCriteria.marginValue", { lvl })}</span>
      </div>
    </div>
  );
}
