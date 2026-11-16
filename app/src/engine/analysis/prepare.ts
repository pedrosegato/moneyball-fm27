import type { PlayerRecord, Snapshot } from "@/data/types";
import { abilityColumns } from "../ability";
import { marketValue, monthsLeft, type SampleSizes, sampleSizes } from "../club";
import type { SNAPSHOT_NUMBER_COLUMNS } from "../columnIds";
import { type LeagueStrength, leagueStrengthIndex, leagueStrengths } from "../leagueStrength";
import { POS_GROUPS, type PosGroup, positionSet } from "../positions";
import { averageRating } from "../rating";
import { STAT_KEYS, STATS, type StatKey } from "../stats/catalog";
import { deriveAll } from "../stats/derive";
import { type Columns, mainGroups, playerColumns } from "../universe";
import { byKey, withNumbers } from "./keyed";

export interface SnapshotAnalysis {
  uids: Uint32Array;
  cols: Record<StatKey, Float64Array>;
  group: Uint8Array;
  ability: Float64Array;
  vsAge: Float64Array;
  rating: Float64Array;
  monthsLeft: Float64Array;
  leagueStrength: Float64Array;
}

export interface PreparedSnapshot {
  records: readonly PlayerRecord[];
  date: string | null;
  derived: readonly Float64Array[];
  groups: readonly PosGroup[];
  positions: readonly ReadonlySet<string>[];
  columns: Columns;
  leagues: ReadonlyMap<string, LeagueStrength>;
  sample: SampleSizes;
  result: SnapshotAnalysis;
}

export function prepareSnapshot(snapshot: Snapshot): PreparedSnapshot {
  const records = snapshot.players;
  const derived = deriveAll(records);
  const groups = mainGroups(records);
  const { best, vsAge } = abilityColumns(records);
  const rating = Float64Array.from(records, averageRating);
  const contractMonths = Float64Array.from(records, (r) => monthsLeft(r, snapshot.date));
  const leagues = leagueStrengthIndex(records);
  const leagueStrength = leagueStrengths(records, leagues);
  const result: SnapshotAnalysis = {
    uids: Uint32Array.from(records, (r) => r.uid),
    cols: byKey(STAT_KEYS, derived),
    group: Uint8Array.from(groups, (g) => POS_GROUPS.indexOf(g)),
    ability: best,
    vsAge,
    rating,
    monthsLeft: contractMonths,
    leagueStrength,
  };
  const value = Float64Array.from(records, marketValue);
  const numbers = {
    ability: best,
    vsAge,
    rating,
    marketValue: value,
    monthsLeft: contractMonths,
    leagueStrength,
  } satisfies Record<(typeof SNAPSHOT_NUMBER_COLUMNS)[number], ArrayLike<number>>;
  const columns = withNumbers(playerColumns(records, { defs: STATS, cols: derived }), numbers);
  const positions = records.map((r) => positionSet(r.position));
  return {
    records,
    date: snapshot.date,
    derived,
    groups,
    positions,
    columns,
    leagues,
    sample: sampleSizes(records),
    result,
  };
}
