import { useTranslation } from "react-i18next";
import { StatCell } from "@/components/StatCell";
import { StatName } from "@/components/StatName";
import { formatStat } from "@/lib/format";
import { VALUE_MODE } from "@/store/ui";
import type { StatLine } from "../lib/profile";

export function TopStats({ lines, against }: { lines: readonly StatLine[]; against: string }) {
  const { t } = useTranslation("player");
  return (
    <ol aria-label={t("section.topStats")} className="flex flex-col">
      {lines.map((line, k) => (
        <li
          key={line.def.key}
          className="grid h-[1.625rem] grid-cols-[1.25rem_minmax(0,1fr)_auto_auto] items-center gap-2"
        >
          <span aria-hidden className="type-caption tabular-nums text-fg-faint">
            {k + 1}
          </span>
          <StatName def={line.def} className="truncate">
            <span data-stat-name className="text-fg-secondary">
              {line.def.abbr}
            </span>{" "}
            <span className="type-caption text-fg-faint">{line.def.label}</span>
          </StatName>
          <span aria-hidden className="text-right tabular-nums text-fg-muted">
            {formatStat(line.value, line.def.unit)}
          </span>
          <StatCell
            value={line.value}
            pct={line.pct}
            mode={VALUE_MODE.percentile}
            def={line.def}
            missing={line.missing}
            against={against}
          />
        </li>
      ))}
    </ol>
  );
}
