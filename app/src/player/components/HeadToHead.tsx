import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { HEAD_TO_HEAD_GRID } from "../lib/headToHead";
import type { StatLine } from "../lib/profile";
import { HeadToHeadRow } from "./HeadToHeadRow";
import { MedianMarks } from "./MedianMarks";

export function HeadToHead({ lines }: { lines: readonly StatLine[] }) {
  const { t } = useTranslation("player");
  return (
    <div>
      <div aria-hidden className={cn(HEAD_TO_HEAD_GRID, "h-4 type-caption text-fg-faint")}>
        <span />
        <span className="relative h-full">
          <MedianMarks />
        </span>
        <span />
        <span className="pr-1 text-right">{t("headToHead.pct")}</span>
      </div>
      <ul aria-label={t("headToHead.label")} className="flex flex-col">
        {lines.map((line) => (
          <HeadToHeadRow key={line.def.key} line={line} />
        ))}
      </ul>
    </div>
  );
}
