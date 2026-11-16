import { useTranslation } from "react-i18next";
import type { PlayerRecord } from "@/data/types";
import { playerName } from "@/lib/playerName";

interface PreviewRowProps {
  rank: number;
  player: PlayerRecord;
  score: string;
}

export function PreviewRow({ rank, player, score }: PreviewRowProps) {
  const { t } = useTranslation();
  return (
    <li className="flex items-center gap-2.5 border-b border-line-subtle py-1.5 last:border-b-0">
      <span className="w-3 shrink-0 text-right type-caption tabular-nums text-fg-faint">{rank}</span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate font-[550] text-fg" title={player.name ?? undefined}>
          {playerName({ name: player.name || null })}
        </span>
        <span className="truncate type-caption text-fg-muted">{player.club ?? t("noClub")}</span>
      </span>
      <span className="shrink-0 type-label font-[560] tabular-nums text-fg">{score}</span>
    </li>
  );
}
