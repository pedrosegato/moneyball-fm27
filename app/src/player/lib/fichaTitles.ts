import { i18n } from "@/i18n";
import { formatRounded } from "@/lib/format";
import { starterMinutes } from "@/table/columns/labels";

export function strengthTitle(mine: number | null): string {
  const base = i18n.t("player:ficha.strengthTitle", { minutes: starterMinutes() });
  return mine === null ? base : i18n.t("player:ficha.strengthMine", { base, mine: formatRounded(mine) });
}
