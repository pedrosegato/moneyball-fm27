import { Shirt } from "lucide-react";
import { useMemo } from "react";
import type { PlayerRecord } from "@/data/types";
import { playsFor } from "@/engine/club";
import { slotCode } from "@/engine/positions";
import { ActionButton } from "@/table/components/ActionButton";
import type { SelectionAction } from "@/table/lib/selectionActions";
import { PLAYER_ACTIONS } from "@/table/playerActions";
import { elencoT } from "../lib/elencoT";

export interface PlaceActionSource {
  players: readonly PlayerRecord[];
  club: number;
  slots: readonly string[];
  slot: number;
  xi: readonly (number | null)[];
  placeBlocked: string | null;
  onPlace(uid: number): void;
}

function placeBlock(
  marked: readonly PlayerRecord[],
  held: boolean,
  code: string,
  club: number,
  placeBlocked: string | null,
) {
  if (marked.length !== 1) return elencoT("squad.markOne");
  if (!playsFor(marked[0], club)) return elencoT("squad.outOnLoan");
  return held ? elencoT("squad.alreadyThere", { code }) : placeBlocked;
}

export function usePlaceAction({ players, club, slots, slot, xi, placeBlocked, onPlace }: PlaceActionSource) {
  return useMemo<readonly SelectionAction[]>(
    () => [
      ...PLAYER_ACTIONS,
      {
        id: "escalar",
        render: ({ players: marked, clear }) => {
          const code = slotCode(slots[slot]);
          const holder = xi[slot];
          const held = marked.length === 1 && holder !== null && players[holder].uid === marked[0].uid;
          return (
            <ActionButton
              icon={Shirt}
              label={elencoT("squad.place", { code })}
              hint={elencoT("squad.placeHint")}
              blocked={placeBlock(marked, held, code, club, placeBlocked)}
              onClick={() => {
                onPlace(marked[0].uid);
                clear();
              }}
            />
          );
        },
      },
    ],
    [slots, slot, xi, players, club, placeBlocked, onPlace],
  );
}
