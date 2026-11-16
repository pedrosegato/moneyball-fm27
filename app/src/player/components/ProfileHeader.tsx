import { XIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import type { PlayerRecord } from "@/data/types";
import type { PosGroup } from "@/engine/positions";
import { playerSubtitle } from "../lib/playerSubtitle";

interface ProfileHeaderProps {
  player: PlayerRecord;
  group: PosGroup;
  titleId: string;
  onClose(): void;
}

export function ProfileHeader({ player, group, titleId, onClose }: ProfileHeaderProps) {
  const { t } = useTranslation("player");
  return (
    <header className="flex shrink-0 items-start gap-2 px-4 pt-3.5 pb-3">
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <h2 id={titleId} className="type-title [overflow-wrap:anywhere] text-fg">
          {player.name}
        </h2>
        <p className="type-caption text-fg-muted">{playerSubtitle(player, group)}</p>
      </div>
      <Button variant="ghost" size="icon-sm" aria-label={t("close")} className="-mr-1.5 shrink-0" onClick={onClose}>
        <XIcon />
      </Button>
    </header>
  );
}
