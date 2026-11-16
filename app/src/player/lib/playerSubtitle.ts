import type { PlayerRecord } from "@/data/types";
import { GROUP_LABELS } from "@/engine/data/groups";
import type { PosGroup } from "@/engine/positions";
import { i18n } from "@/i18n";

export function playerSubtitle(player: PlayerRecord, group: PosGroup, { division = true } = {}): string {
  return [
    GROUP_LABELS[group],
    player.age != null && i18n.t("age", { age: player.age }),
    player.club ?? i18n.t("noClub"),
    division && player.division,
  ]
    .filter(Boolean)
    .join(", ");
}
