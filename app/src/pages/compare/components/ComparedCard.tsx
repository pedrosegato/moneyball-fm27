import { X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import type { AnalysisResult } from "@/engine/index";
import { POS_GROUPS } from "@/engine/positions";
import { playerName } from "@/lib/playerName";
import { cn } from "@/lib/utils";
import { PlayerFicha } from "@/player/components/PlayerFicha";
import { playerSubtitle } from "@/player/lib/playerSubtitle";
import type { Compared } from "../lib/compared";
import { SLOT_BAR } from "../lib/slotStyles";

interface ComparedCardProps {
  entry: Compared;
  analysis: AnalysisResult;
  onOpen(): void;
  onRemove(): void;
}

export function ComparedCard({ entry, analysis, onOpen, onRemove }: ComparedCardProps) {
  const { t } = useTranslation("compare");
  const { player, i, slot } = entry;
  const name = playerName(player);
  return (
    <li className="row-span-3 grid min-w-0 grid-rows-subgrid gap-3 rounded-xl border border-line bg-surface-raised p-3">
      <div className="flex items-start gap-2.5">
        <span aria-hidden className={cn("mt-1 h-4 w-1 shrink-0 rounded-full", SLOT_BAR[slot])} />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <h3 className="type-heading [overflow-wrap:anywhere] text-fg">{name}</h3>
          <p className="type-caption text-fg-muted">{playerSubtitle(player, POS_GROUPS[analysis.group[i]])}</p>
        </div>
      </div>
      <PlayerFicha player={player} i={i} analysis={analysis} />
      <div className="flex items-end gap-2">
        <Button variant="outline" size="sm" aria-label={t("card.open", { name })} onClick={onOpen}>
          {t("openProfile", { ns: "common" })}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          aria-label={t("card.removeNamed", { name })}
          className="text-fg-muted"
          onClick={onRemove}
        >
          <X data-icon="inline-start" />
          {t("remove", { ns: "common" })}
        </Button>
      </div>
    </li>
  );
}
