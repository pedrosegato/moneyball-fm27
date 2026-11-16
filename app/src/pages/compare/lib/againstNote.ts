import { i18n } from "@/i18n";
import { capitalized } from "@/lib/format";
import { playerName } from "@/lib/playerName";
import { againstGroup, groupNoun, poolLabel } from "@/table/columns/labels";
import type { Compared } from "./compared";

export function againstNote(entries: readonly Compared[], poolMinutes: number): string {
  const groups = new Set(entries.map((e) => e.group));
  if (groups.size <= 1) return entries.length ? capitalized(againstGroup(entries[0].group, poolMinutes)) : "";
  const each = entries
    .map((e) => i18n.t("compare:against.each", { name: playerName(e.player), group: groupNoun(e.group) }))
    .join("; ");
  return i18n.t("compare:against.mixed", { pool: poolLabel(poolMinutes), each });
}
