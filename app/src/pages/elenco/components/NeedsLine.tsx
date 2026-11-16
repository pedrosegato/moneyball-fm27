import { CircleAlert } from "lucide-react";
import { useTranslation } from "react-i18next";
import { formatRounded } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { SlotNeeds } from "../lib/needs";
import { slotLabel } from "../lib/slots";
import { NeedsItems } from "./NeedsItems";

interface NeedsLineProps {
  slots: readonly string[];
  needs: SlotNeeds;
  onSelect(slot: number): void;
  className?: string;
}

export function NeedsLine({ slots, needs, onSelect, className }: NeedsLineProps) {
  const { t } = useTranslation("elenco");
  const nothing = needs.needs.length === 0 && needs.noData.length === 0;
  return (
    <fieldset aria-label={t("needs.label")} className={cn("flex flex-col gap-1 type-caption", className)}>
      {nothing && <p className="text-fg-muted">{t("needs.none")}</p>}
      {needs.needs.length > 0 && (
        <NeedsItems
          label={t("needs.need")}
          icon={<CircleAlert aria-hidden className="size-3 shrink-0 text-destructive" />}
          items={needs.needs.map(({ slot, perf }) => ({
            slot,
            text: t("needs.item", {
              slot: slotLabel(slots[slot]),
              value: perf === null ? t("needs.emptySlot") : formatRounded(perf),
            }),
          }))}
          slots={slots}
          onSelect={onSelect}
        />
      )}
      {needs.noData.length > 0 && (
        <NeedsItems
          label={t("needs.noData")}
          items={needs.noData.map(({ slot, minutes }) => ({
            slot,
            text: t("needs.minutes", { slot: slotLabel(slots[slot]), minutes }),
          }))}
          slots={slots}
          onSelect={onSelect}
        />
      )}
    </fieldset>
  );
}
