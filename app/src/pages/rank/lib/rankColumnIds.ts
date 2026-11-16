import { PLAYER_COLUMN } from "@/table/columns/ids";

export const RANK_COLUMN = {
  position: "rankPos",
  leagueWeight: "leagueWeight",
  base: "rankBase",
  weighted: "rankWeighted",
  move: "rankMove",
} as const;

export const RANK_LEAD = [RANK_COLUMN.position] as const;
export const RANK_FIXED = [PLAYER_COLUMN.division, RANK_COLUMN.leagueWeight, RANK_COLUMN.base] as const;
export const RANK_FIXED_WEIGHTED = [...RANK_FIXED, RANK_COLUMN.weighted, RANK_COLUMN.move] as const;
export const RANK_SORT = { id: RANK_COLUMN.position, desc: false } as const;
