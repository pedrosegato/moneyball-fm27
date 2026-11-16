import type { PlayerRecord } from "@/data/types";
import { CORE, contextOf, FULL, type RecordContext } from "../stats/context";
import type { RoleProfile } from "./catalog";

export const ROLE_ITEM_KEYS = [
  "gkImpact",
  "gkCriticalSaves",
  "gkXgpShare",
  "gkXpgRatio",
  "gkActionSuccess",
  "gkSaveGap",
  "aerialDominance",
  "cbDefEfficiency",
  "defErrors90",
  "cbDuelSuccess",
  "cbContestWon",
  "possWasted90",
  "cbIntercepted90",
  "cbStolen90",
  "fbDefEfficiency",
  "fbDefErrors90",
  "fbAttackSuccess",
  "fbOverallSuccess",
  "chancesCreated90",
  "fbInvolvement90",
  "fbStolen90",
  "dmCoverage",
  "dmPhysical",
  "dmDefEfficiency",
  "dmRecoveries90",
  "dmInterceptedStolen90",
  "dmContestWon",
  "dmCreation90",
  "effort90",
  "b2bActionSuccess",
  "b2bRecovered90",
  "b2bLastThird90",
  "b2bInvolvement90",
  "flair",
  "ico",
  "dangerCreated90",
  "shotActions90",
  "ballActionSuccess",
  "gpi",
  "ipoIvo",
  "attEfficiency",
  "fwdLastThird90",
  "scoringAttempts90",
] as const;
export type RoleItemKey = (typeof ROLE_ITEM_KEYS)[number];

export interface RoleItemDef {
  key: RoleItemKey;
  lowerIsBetter?: boolean;
  compute(r: PlayerRecord): number | null;
}

export const PROFILE_ITEMS: Readonly<Record<RoleProfile, readonly RoleItemKey[]>> = {
  goleiros: ["gkImpact", "gkCriticalSaves", "gkXgpShare", "gkXpgRatio", "gkActionSuccess", "gkSaveGap"],
  zagueiros: [
    "aerialDominance",
    "cbDefEfficiency",
    "defErrors90",
    "cbDuelSuccess",
    "cbContestWon",
    "possWasted90",
    "cbIntercepted90",
    "cbStolen90",
  ],
  laterais: [
    "aerialDominance",
    "fbDefEfficiency",
    "fbDefErrors90",
    "fbAttackSuccess",
    "fbOverallSuccess",
    "chancesCreated90",
    "fbInvolvement90",
    "fbStolen90",
  ],
  volantes: [
    "aerialDominance",
    "dmCoverage",
    "dmPhysical",
    "dmDefEfficiency",
    "defErrors90",
    "dmRecoveries90",
    "dmInterceptedStolen90",
    "dmContestWon",
    "dmCreation90",
  ],
  boxToBox: [
    "effort90",
    "b2bActionSuccess",
    "b2bRecovered90",
    "chancesCreated90",
    "b2bLastThird90",
    "b2bInvolvement90",
  ],
  armadores: ["flair", "ico", "dangerCreated90", "shotActions90", "ballActionSuccess"],
  avancados: ["gpi", "ipoIvo", "flair", "attEfficiency", "aerialDominance", "fwdLastThird90", "scoringAttempts90"],
};

const MIN_DENOMINATOR = 10;
const MIN_SHOTS_FACED = 10;

type Value = (c: RecordContext) => number | null;

const finite = (x: number): number | null => (Number.isFinite(x) ? x : null);
const ratio = (num: number, den: number): number | null => (den >= MIN_DENOMINATOR ? finite(num / den) : null);
const p90 = (c: RecordContext, x: number) => (x * 90) / c.m;

const outfield =
  (value: Value): Value =>
  (c) =>
    c.detail === FULL && !c.gk ? value(c) : null;

interface Keeper {
  faced: number;
  conc: number;
  saves: number;
  held: number;
  parried: number;
  tipped: number;
  pensFaced: number;
  pensSaved: number;
  q90(x: number): number;
}

const keeperValue =
  (value: (c: RecordContext, k: Keeper) => number | null, needsFull = false): Value =>
  (c) => {
    if (!c.gk || c.detail < CORE || !c.saveData || (needsFull && c.detail !== FULL)) return null;
    const { s } = c;
    const faced = c.saves + c.savesConceded;
    const split = s.hdr_att + s.hdr_won + s.saves_tipped;
    if (faced < MIN_SHOTS_FACED || split <= 0) return null;
    const share = (slot: number) => (c.saves * slot) / split;
    return value(c, {
      faced,
      conc: c.savesConceded,
      saves: c.saves,
      held: share(s.hdr_att),
      parried: share(s.hdr_won),
      tipped: share(s.saves_tipped),
      pensFaced: s.tck_att,
      pensSaved: s.tck_won,
      q90: (x) => (x * 90) / c.savesMinutes,
    });
  };

const defErrors: Value = (c) => {
  const { s, e } = c;
  return p90(c, 1.25 * e.yellow + 2 * e.red + s.fouls + (s.pas_att - s.pas_cmp));
};

const fullbackDefence = (c: RecordContext) => {
  const { s, e } = c;
  return {
    won: s.hdr_won + s.tck_won + s.int + s.clr + s.blocks + s.shots_blk + 3 * s.tck_key,
    total:
      1.33 * e.yellow +
      2 * e.red +
      s.hdr_att +
      s.tck_att +
      s.int +
      s.clr +
      s.blocks +
      s.shots_blk +
      s.fouls +
      3 * s.tck_key,
  };
};

const fullbackAttack = (c: RecordContext) => {
  const { s, e } = c;
  const shared = s.drb + 2 * s.ccc + s.kp + s.pr_passes + 3 * e.goals + 3 * e.assists;
  return {
    won: s.op_crs_cmp + s.sot + (s.crs_cmp - s.op_crs_cmp) + shared,
    total: s.op_crs_att + s.shots + (s.crs_att - s.op_crs_att) + shared,
  };
};

const chancesCreated: Value = (c) => {
  const { s } = c;
  return p90(c, s.crs_cmp + s.kp + s.xa100 / 100 + s.ccc);
};

const aerialDominance: Value = (c) => {
  const { s } = c;
  if (s.hdr_att < MIN_DENOMINATOR) return null;
  return finite((s.hdr_won / s.hdr_att) * Math.sqrt(p90(c, s.hdr_won)));
};

const gkAction: Value = keeperValue((c, k) => {
  const { s, e } = c;
  return finite(
    (k.held + k.tipped + k.parried + k.pensSaved + s.pas_cmp + s.pres_cmp) /
      (k.held +
        k.conc +
        k.tipped +
        k.parried +
        k.pensFaced +
        s.pas_att +
        e.yellow +
        1.33 * p90(c, s.poss_lost) +
        2 * c.cleanSheets +
        s.pres_att),
  );
}, true);

const VALUES: Readonly<Record<RoleItemKey, Value>> = {
  gkImpact: keeperValue((c, k) =>
    finite(
      k.q90(c.xgPrevented) +
        k.q90(k.held) +
        1.5 * k.q90(k.tipped) +
        1.2 * k.q90(k.parried) +
        2 * p90(c, c.cleanSheets) +
        (6 * k.saves) / k.faced +
        (2 * (k.tipped + k.parried + k.pensSaved)) / (k.tipped + k.parried + k.conc) +
        p90(c, c.e.motm),
    ),
  ),
  gkCriticalSaves: keeperValue((_, k) => finite((2 * k.tipped + 1.5 * k.parried + k.held) / k.faced)),
  gkXgpShare: keeperValue((c, k) => {
    const total = c.xgPrevented + k.conc;
    return total > 0 ? finite(c.xgPrevented / total) : null;
  }),
  gkXpgRatio: keeperValue((c, k) =>
    finite(c.cleanSheets > 0 ? k.q90(c.xgPrevented) / p90(c, c.cleanSheets) : k.q90(c.xgPrevented)),
  ),
  gkActionSuccess: gkAction,
  gkSaveGap: keeperValue((c, k) => finite(1 - (c.xgPrevented + k.conc) / k.faced - k.saves / k.faced)),

  aerialDominance: outfield(aerialDominance),
  cbDefEfficiency: outfield((c) => {
    const { s, e } = c;
    return ratio(
      s.hdr_won + s.tck_won + s.int + s.clr + s.blocks + s.shots_blk + 1.5 * s.tck_key + s.hdr_key,
      1.33 * e.yellow +
        2 * e.red +
        s.hdr_att +
        s.tck_att +
        s.int +
        s.clr +
        s.blocks +
        s.shots_blk +
        s.fouls +
        s.hdr_key,
    );
  }),
  defErrors90: outfield(defErrors),
  cbDuelSuccess: outfield((c) => {
    const { s } = c;
    return ratio(s.hdr_won + s.tck_won + s.pres_cmp, s.hdr_att + s.tck_att + s.pres_att);
  }),
  cbContestWon: outfield((c) => {
    const { s } = c;
    return ratio(s.hdr_won + s.tck_won + s.blocks + s.tck_key, s.hdr_att + s.tck_att + s.blocks + s.fouls);
  }),
  possWasted90: outfield((c) => {
    const { s } = c;
    return p90(c, s.hdr_att - s.hdr_won + (s.pas_att - s.pas_cmp) + (s.tck_att - s.tck_won) + s.fouls);
  }),
  cbIntercepted90: outfield((c) => {
    const { s } = c;
    return p90(c, s.blocks + s.shots_blk + s.int + s.clr + 0.5 * s.tck_key);
  }),
  cbStolen90: outfield((c) => {
    const { s } = c;
    return p90(c, s.pres_cmp + s.tck_won + 0.5 * s.tck_key);
  }),

  fbDefEfficiency: outfield((c) => {
    const d = fullbackDefence(c);
    return ratio(d.won, d.total);
  }),
  fbDefErrors90: outfield((c) => {
    const { s, e } = c;
    return p90(c, 1.25 * e.yellow + 2 * e.red + s.fouls + (s.pas_att - s.pas_cmp) + (s.crs_att - s.crs_cmp));
  }),
  fbAttackSuccess: outfield((c) => {
    const a = fullbackAttack(c);
    return ratio(a.won, a.total);
  }),
  fbOverallSuccess: outfield((c) => {
    const d = fullbackDefence(c);
    const a = fullbackAttack(c);
    return ratio(d.won + a.won, a.total + d.total);
  }),
  chancesCreated90: outfield(chancesCreated),
  fbInvolvement90: outfield((c) => {
    const { s, e } = c;
    return p90(
      c,
      s.pas_att +
        s.drb +
        s.shots +
        s.ccc +
        s.offsides +
        s.kp +
        (s.tck_att + s.fouls) +
        s.tck_key +
        s.int +
        s.crs_att +
        e.pens_taken +
        s.fk +
        s.hdr_won,
    );
  }),
  fbStolen90: outfield((c) => {
    const { s } = c;
    return p90(c, 0.5 * s.tck_key + s.tck_won + s.int + s.hdr_key);
  }),

  dmCoverage: outfield((c) => {
    const { s } = c;
    const km = s.distance10 / 10;
    const den = s.tck_won + s.pres_cmp + s.int + s.blocks + 1.5 * s.tck_key;
    return km === 0 || den === 0 ? null : finite(km / den);
  }),
  dmPhysical: outfield((c) => {
    const { s } = c;
    const km = s.distance10 / 10;
    return km === 0 ? null : finite((s.hdr_won + s.tck_won) / km);
  }),
  dmDefEfficiency: outfield((c) => {
    const { s, e } = c;
    return ratio(
      s.tck_won + s.int + s.tck_key + s.clr + s.blocks + s.shots_blk + 0.5 * s.hdr_key,
      1.5 * e.yellow + 2 * e.red + s.tck_att + s.int + s.clr + s.blocks + s.shots_blk + s.fouls + 0.5 * s.hdr_key,
    );
  }),
  dmRecoveries90: outfield((c) => {
    const { s } = c;
    return p90(c, s.int + s.blocks + s.shots_blk + s.tck_key + s.poss_won);
  }),
  dmInterceptedStolen90: outfield((c) => {
    const { s } = c;
    return p90(c, s.shots_blk + s.int + s.clr + s.blocks + s.pres_cmp + s.tck_won + 0.5 * s.tck_key);
  }),
  dmContestWon: outfield((c) => {
    const { s } = c;
    return ratio(s.hdr_won + s.tck_won + s.tck_key, s.hdr_att + s.tck_att + s.fouls);
  }),
  dmCreation90: outfield((c) => p90(c, c.s.kp + c.s.ccc)),

  effort90: outfield((c) => {
    const { s } = c;
    const km = p90(c, s.distance10 / 10);
    return (
      0.1 * km +
      (10 / 12) * km +
      0.1 * p90(c, s.pres_att) +
      0.2 * p90(c, s.pres_cmp) +
      10 * p90(c, s.tck_won) +
      100 * p90(c, s.tck_key)
    );
  }),
  b2bActionSuccess: outfield((c) => {
    const { s, e } = c;
    return ratio(
      1.5 * e.goals +
        s.tck_won +
        (s.tck_key + s.tck_won) +
        s.pas_cmp +
        s.hdr_won +
        s.pres_cmp +
        s.crs_cmp +
        0.75 * s.sot +
        0.75 * e.goals,
      s.xa100 / 100 +
        (s.tck_att + s.fouls) +
        (s.fouls + s.tck_key + s.tck_won) +
        s.pas_att +
        s.hdr_att +
        s.shots +
        s.pres_att +
        s.crs_att,
    );
  }),
  b2bRecovered90: outfield((c) => {
    const { s } = c;
    return p90(c, s.tck_won + s.int + s.tck_key + s.poss_won);
  }),
  b2bLastThird90: outfield((c) => {
    const { s } = c;
    return p90(c, s.shots + s.kp + s.ccc + s.drb + s.crs_cmp);
  }),
  b2bInvolvement90: outfield((c) => {
    const { s, e } = c;
    return p90(
      c,
      e.goals + e.assists + s.fouls_won + s.tck_won + s.int + s.tck_key + s.hdr_att + s.drb + s.ccc + s.kp + s.pas_att,
    );
  }),

  flair: outfield((c) => {
    const { s } = c;
    return (
      0.45 * p90(c, s.ccc) +
      0.15 * p90(c, s.kp) +
      0.05 * p90(c, s.pr_passes) +
      0.15 * p90(c, s.drb) +
      0.15 * p90(c, s.xa100 / 100) +
      0.05 * p90(c, s.fouls_won)
    );
  }),
  ico: outfield((c) => {
    const { s, e } = c;
    return (
      5 * p90(c, s.ccc) +
      4.5 * p90(c, s.xa100 / 100) +
      3.8 * p90(c, s.xg100 / 100) +
      2.5 * p90(c, s.kp) +
      1.8 * p90(c, s.op_crs_cmp) +
      2.2 * p90(c, s.pr_passes) +
      2 * p90(c, e.goals) +
      2.5 * p90(c, e.assists)
    );
  }),
  dangerCreated90: outfield((c) => {
    const { s, e } = c;
    return p90(
      c,
      s.kp + (s.ccc - e.pens_taken) + s.xa100 / 100 + 0.75 * e.goals + 0.75 * e.assists + s.sot + s.op_crs_cmp,
    );
  }),
  shotActions90: outfield((c) => {
    const { s, e } = c;
    return p90(
      c,
      s.sot +
        s.xa100 / 100 +
        (s.ccc - e.pens_taken) +
        s.kp +
        (c.goalsOutKnown ? s.goals_out : 0) +
        s.op_crs_cmp +
        0.5 * e.goals +
        0.5 * e.assists,
    );
  }),
  ballActionSuccess: outfield((c) => {
    const { s } = c;
    return ratio(s.op_crs_cmp + s.sot + s.drb + s.kp, s.op_crs_att + s.shots + s.drb + s.kp);
  }),

  gpi: outfield((c) => {
    const { s, e } = c;
    const npxG = s.npxg100 / 100;
    if (npxG <= 0) return 0;
    const xG = s.xg100 / 100;
    const xA = s.xa100 / 100;
    const npG = e.goals - e.pens_scored;
    return finite(
      (npG / npxG) * (p90(c, xG) + p90(c, xA)) * (p90(c, e.goals + e.assists) + p90(c, xA + npxG)) +
        0.5 * p90(c, e.goals - xG),
    );
  }),
  ipoIvo: outfield((c) => {
    const { s, e } = c;
    const xG = s.xg100 / 100;
    const xA = s.xa100 / 100;
    const npxG = s.npxg100 / 100;
    const npG = e.goals - e.pens_scored;
    const ipo = p90(c, 10 * npG + 5 * s.sot + 8 * npxG + 6 * xA) + 6 * p90(c, s.distance10 / 10);
    const ivo =
      p90(c, 2.5 * s.shots + 6 * s.sot + 3 * xG + 2 * npG + 8 * s.ccc) + 12 * (s.shots > 0 ? s.sot / s.shots : 0);
    return 0.4 * ipo + 0.6 * ivo;
  }),
  attEfficiency: outfield((c) => {
    const { s, e } = c;
    return ratio(
      s.sot + s.fouls_won + s.drb + s.kp + e.pens_scored + 2 * e.goals + 2 * e.assists,
      s.hdr_att + s.shots + s.offsides + s.fouls + s.fouls_won + s.drb + s.kp + e.pens_taken + s.xg100 / 100,
    );
  }),
  fwdLastThird90: outfield((c) => {
    const { s, e } = c;
    return p90(c, s.drb + s.shots + (s.ccc - e.pens_taken) + s.kp + s.pres_att + s.op_crs_cmp);
  }),
  scoringAttempts90: outfield((c) => {
    const { s } = c;
    return p90(c, s.shots + s.ccc + s.kp + s.npxg100 / 100 + s.xa100 / 100);
  }),
};

const LOWER_IS_BETTER: ReadonlySet<RoleItemKey> = new Set([
  "gkSaveGap",
  "defErrors90",
  "possWasted90",
  "fbDefErrors90",
  "dmCoverage",
]);

export const ROLE_ITEMS: readonly RoleItemDef[] = ROLE_ITEM_KEYS.map((key) => {
  const value = VALUES[key];
  return {
    key,
    ...(LOWER_IS_BETTER.has(key) ? { lowerIsBetter: true } : {}),
    compute: (r) => {
      const x = value(contextOf(r));
      return x !== null && Number.isFinite(x) ? x : null;
    },
  };
});

const COLUMNS = new WeakMap<readonly PlayerRecord[], Readonly<Record<RoleItemKey, Float64Array>>>();

export function roleItemColumns(records: readonly PlayerRecord[]): Readonly<Record<RoleItemKey, Float64Array>> {
  const cached = COLUMNS.get(records);
  if (cached) return cached;
  const columns = Object.fromEntries(ROLE_ITEM_KEYS.map((key) => [key, new Float64Array(records.length)])) as Record<
    RoleItemKey,
    Float64Array
  >;
  records.forEach((record, i) => {
    for (const item of ROLE_ITEMS) {
      columns[item.key][i] = item.compute(record) ?? Number.NaN;
    }
  });
  COLUMNS.set(records, columns);
  return columns;
}
