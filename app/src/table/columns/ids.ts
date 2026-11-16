import { COLUMN } from "@/engine/columnIds";

export const NAME_COLUMN = "name";

export const PLAYER_COLUMN = {
  name: NAME_COLUMN,
  position: "position",
  age: "age",
  minutes: COLUMN.minutes,
  rating: COLUMN.rating,
  club: "club",
  division: "division",
  leagueStrength: COLUMN.leagueStrength,
  nation: "nation",
  foot: "foot",
  height: "height",
  value: "value",
  wage: "wage",
  contractEnd: "contract_end",
  fair: COLUMN.fair,
  valueRatio: COLUMN.valueRatio,
  monthsLeft: COLUMN.monthsLeft,
  ability: COLUMN.ability,
  vsAge: COLUMN.vsAge,
  ca: "ca",
  pa: "pa",
  statsVsAbility: COLUMN.statsVsAbility,
} as const;
export type PlayerColumnId = (typeof PLAYER_COLUMN)[keyof typeof PLAYER_COLUMN];

export const COLUMN_GROUP = {
  identity: "identidade",
  contract: "contrato",
  attributes: "atributos",
  composites: "compostas",
} as const;
