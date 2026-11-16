import type { Active, Announcements, ScreenReaderInstructions } from "@dnd-kit/core";
import type { PlayerRecord } from "@/data/types";
import type { PosName } from "@/engine/positions";
import type { RolePhase } from "@/engine/roles/catalog";
import { positionAt, type ShapeSlot } from "@/engine/tacticShape";
import { playerName } from "@/lib/playerName";
import { carriedIndex, fitOf, freeSpotOf, OFF_PITCH, slotOf } from "./dnd";
import { elencoT } from "./elencoT";
import { positionName } from "./slots";

type Id = string | number | null | undefined;

export const lineupInstructions = (): ScreenReaderInstructions => ({ draggable: elencoT("drag.instructions") });

interface AnnouncementSource {
  players: readonly PlayerRecord[];
  slots: readonly ShapeSlot[];
  layout: RolePhase;
  dropChanged(): boolean;
}

export function lineupAnnouncements({ players, slots, layout, dropChanged }: AnnouncementSource): Announcements {
  const carried = (active: Active) => {
    const i = carriedIndex(active);
    return i === null ? null : players[i];
  };
  const who = (active: Active) => {
    const player = carried(active);
    return player ? playerName(player) : elencoT("drag.somePlayer");
  };
  const positionOf = (id: Id): PosName | null => {
    const slot = slotOf(id);
    if (slot !== null) return slots[slot]?.[layout].position ?? null;
    const spot = freeSpotOf(id);
    return spot && (positionAt(spot)?.position ?? null);
  };
  const fitText = (active: Active, position: PosName) => {
    const player = carried(active);
    if (!player) return "";
    const { good, rating } = fitOf(player.pos, position);
    return elencoT(good ? "drag.fits" : "drag.misfit", { rating });
  };
  return {
    onDragStart: ({ active }) => elencoT("drag.picked", { who: who(active) }),
    onDragOver: ({ active, over }) => {
      if (over?.id === OFF_PITCH) return elencoT("drag.offPitch");
      const position = positionOf(over?.id);
      if (!position) return undefined;
      const key = freeSpotOf(over?.id) ? "drag.overFree" : "drag.over";
      return elencoT(key, { slot: positionName(position) }) + fitText(active, position);
    },
    onDragEnd: ({ active, over }) => {
      if (!dropChanged()) return elencoT("drag.cancelled");
      if (over?.id === OFF_PITCH) return elencoT("drag.removed", { who: who(active) });
      const position = positionOf(over?.id);
      const slot = position ? positionName(position) : "";
      return freeSpotOf(over?.id)
        ? elencoT("drag.moved", { who: who(active), slot })
        : elencoT("drag.dropped", { slot });
    },
    onDragCancel: () => elencoT("drag.cancelled"),
  };
}
