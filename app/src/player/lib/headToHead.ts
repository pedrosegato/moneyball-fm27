import { missingText } from "@/components/missing";
import { i18n } from "@/i18n";
import type { StatLine } from "./profile";
import { statText } from "./statText";

export const HEAD_TO_HEAD_GRID = "grid grid-cols-[6rem_minmax(0,1fr)_3.25rem_1.75rem] items-center gap-2";

function percentileText({ pct, missing }: StatLine): string {
  if (!Number.isNaN(pct)) return i18n.t("stat.percentile", { pct: Math.round(pct) });
  return missing ? missingText(missing) : i18n.t("player:headToHead.noPercentile");
}

export function spokenLine(line: StatLine): string {
  const { def } = line;
  const name = def.lowerIsBetter ? i18n.t("stat.lowerIsBetter", { label: def.abbr }) : def.abbr;
  const reference = Number.isNaN(line.median)
    ? []
    : [
        i18n.t("player:headToHead.median", { value: statText(line, line.median) }),
        i18n.t("player:headToHead.top", { value: statText(line, line.top) }),
      ];
  return [i18n.t("stat.reading", { name, facts: statText(line, line.value) }), percentileText(line), ...reference].join(
    ", ",
  );
}

export function referenceTip(line: StatLine): string | undefined {
  if (!Number.isNaN(line.pct)) {
    return i18n.t("player:headToHead.tip", { median: statText(line, line.median), top: statText(line, line.top) });
  }
  return line.missing && missingText(line.missing);
}
