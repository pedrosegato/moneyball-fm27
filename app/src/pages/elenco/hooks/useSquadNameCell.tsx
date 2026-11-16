import { type ReactNode, useCallback, useMemo } from "react";
import type { PlayerRecord } from "@/data/types";
import { playsFor } from "@/engine/club";
import { playerName } from "@/lib/playerName";
import { SquadName } from "../components/SquadName";

export function useSquadNameCell(players: readonly PlayerRecord[], squad: readonly number[], club: number) {
  const placeable = useMemo(
    () => new Map(squad.flatMap((i) => (playsFor(players[i], club) ? [[players[i].uid, i] as const] : []))),
    [squad, players, club],
  );
  return useCallback(
    (uid: number, cell: ReactNode, active: boolean) => {
      const i = placeable.get(uid);
      if (i === undefined) return cell;
      return (
        <SquadName uid={uid} index={i} name={playerName(players[i])} active={active}>
          {cell}
        </SquadName>
      );
    },
    [placeable, players],
  );
}
