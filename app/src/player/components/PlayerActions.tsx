import type { PlayerRecord } from "@/data/types";
import { CartToggle } from "./CartToggle";
import { CompareToggle } from "./CompareToggle";
import { ShortlistToggle } from "./ShortlistToggle";

interface PlayerActionsProps {
  player: PlayerRecord;
  myClubUid: number | null;
}

export function PlayerActions({ player, myClubUid }: PlayerActionsProps) {
  return (
    <div className="flex items-center gap-2">
      <ShortlistToggle uid={player.uid} />
      <CompareToggle uid={player.uid} />
      <CartToggle player={player} myClubUid={myClubUid} />
    </div>
  );
}
