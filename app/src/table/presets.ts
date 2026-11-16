import { COLUMN } from "@/engine/columnIds";
import type { PosGroup } from "@/engine/positions";
import type { StatKey } from "@/engine/stats/catalog";
import type { ColumnPresetKey } from "@/store/columns";
import { PLAYER_COLUMN } from "./columns/ids";

export const OWN_PERFORMANCE = COLUMN.perf;
export const PERFORMANCE_ROLE = "perfRole";

export const IDENTITY_DEFAULTS = [
  PLAYER_COLUMN.value,
  PLAYER_COLUMN.wage,
  PLAYER_COLUMN.contractEnd,
  PLAYER_COLUMN.position,
  PLAYER_COLUMN.age,
  PLAYER_COLUMN.minutes,
  PLAYER_COLUMN.rating,
  PLAYER_COLUMN.division,
] as const;

const STATS_BY_GROUP: Readonly<Record<PosGroup | "ALL", readonly StatKey[]>> = {
  GK: ["Sv%", "xSv%", "xGP/90", "Conc/90", "CS/90", "Saves/90", "PenSv%"],
  ZAG: ["TckWon/90", "Tck%", "KTck/90", "Int/90", "Clr/90", "Blk/90", "HdrWon/90", "Hdr%", "Fouls/90", "Pas%"],
  LAT: ["TckWon/90", "Tck%", "Int/90", "PossWon/90", "CrC/90", "Cr%", "PrPass/90", "Drb/90", "KP/90", "xA/90"],
  VOL: [
    "TckWon/90",
    "Tck%",
    "Int/90",
    "PossWon/90",
    "HdrWon/90",
    "PsC/90",
    "Pas%",
    "PrPass/90",
    "PossLost/90",
    "Fouls/90",
  ],
  MC: ["PsC/90", "Pas%", "PrPass/90", "KP/90", "PossLost/90", "PossWon/90", "Int/90", "Drb/90"],
  MEI: ["G/90", "npxG/90", "Shots/90", "xA/90", "KP/90", "OP-KP/90", "CCC/90", "Drb/90", "PrPass/90", "PresC/90"],
  PON: ["G/90", "npxG/90", "Shots/90", "xA/90", "OP-KP/90", "CCC/90", "Drb/90", "OP-CrC/90", "Cr%", "PresC/90"],
  ATA: ["G/90", "npxG/90", "Shots/90", "SoT/90", "SoT%", "Conv%", "xG/Shot", "xG-OP", "xA/90"],
  ALL: ["G/90", "Ast/90", "npxG/90", "xA/90", "KP/90", "Drb/90", "PrPass/90", "Pas%", "TckWon/90", "Int/90"],
};

export function columnPresetFor(group: PosGroup | null): StatKey[] {
  return [...STATS_BY_GROUP[group ?? "ALL"], OWN_PERFORMANCE, PERFORMANCE_ROLE];
}

export function defaultColumnsFor(group: PosGroup | null): string[] {
  return [...IDENTITY_DEFAULTS, ...columnPresetFor(group)];
}

export const presetKeyOf = (group: PosGroup | null): ColumnPresetKey => group ?? "ALL";
