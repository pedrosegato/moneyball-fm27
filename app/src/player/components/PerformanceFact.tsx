import { useTranslation } from "react-i18next";
import { missingText } from "@/components/missing";
import { ScoreCell } from "@/components/ScoreCell";
import { formatScore } from "@/lib/format";
import { Fact } from "./Fact";

interface PerformanceFactProps {
  label: string;
  title: string;
  value: number;
  unadjusted: number;
  hidden: boolean;
}

export function PerformanceFact({ label, title, value, unadjusted, hidden }: PerformanceFactProps) {
  const { t } = useTranslation("player");
  const showUnadjusted = !hidden && !Number.isNaN(unadjusted) && formatScore(unadjusted) !== formatScore(value);
  return (
    <Fact
      label={label}
      title={title}
      value={
        <div className="flex flex-col items-start gap-0.5">
          <ScoreCell
            value={hidden ? NaN : value}
            label={label}
            format={formatScore}
            emptyReason={hidden ? missingText("pool") : undefined}
            className="self-start"
          />
          {showUnadjusted && (
            <span title={t("ficha.unadjustedTitle")} className="type-caption text-fg-muted">
              {t("ficha.unadjusted", { value: formatScore(unadjusted) })}
            </span>
          )}
        </div>
      }
      className="col-span-6"
    />
  );
}
