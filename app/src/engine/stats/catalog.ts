import type { PlayerRecord } from "@/data/types";
import { stats } from "@/i18n/pt-BR/stats";
import { BASIC, CORE, contextOf, FULL, type RecordContext } from "./context";
import type { StatGroup } from "./groups";

export type StatKey = string;

export type StatUnit = "count" | "per90" | "pct" | "ratio" | "km" | "rating" | "score";

export interface MinSample {
  of: StatKey | "minutes";
  min: number;
}

export interface StatDef {
  key: StatKey;
  abbr: string;
  label: string;
  description: string;
  group: StatGroup;
  unit: StatUnit;
  lowerIsBetter?: boolean;
  gkOnly?: boolean;
  outfieldOnly?: boolean;
  minSample?: readonly MinSample[];
  compute(r: PlayerRecord): number | null;
}

type CatalogKey = keyof typeof stats.label;
type Ctx = RecordContext;
type Value = (c: Ctx) => number | null;
type Tier = (c: Ctx) => boolean;
type Spec = Omit<StatDef, "key" | "compute" | "group" | "abbr" | "label" | "description"> & {
  key: CatalogKey;
  abbr?: string;
};

const played: Tier = (c) => c.detail >= BASIC;
const core: Tier = (c) => c.detail >= CORE;
const full: Tier = (c) => c.detail === FULL;
const saveData: Tier = (c) => c.detail >= CORE && c.saveData;

const p90 = (c: Ctx, v: number) => (v * 90) / c.m;
const per90Over = (v: number, minutes: number) => (minutes ? (v * 90) / minutes : null);
const pct = (a: number, b: number) => (b ? (a / b) * 100 : null);
const ratio = (a: number, b: number) => (b ? a / b : null);

const xg = (c: Ctx) => c.s.xg100 / 100;
const npxg = (c: Ctx) => c.s.npxg100 / 100;
const xa = (c: Ctx) => c.s.xa100 / 100;
const npGoals = (c: Ctx) => c.e.goals - c.e.pens_scored;
const npShots = (c: Ctx) => c.s.shots - c.e.pens_taken;
const shotsFaced = (c: Ctx) => c.saves + c.savesConceded;

const saveShare =
  (slot: (c: Ctx) => number): Value =>
  (c) => {
    const share = ratio(slot(c), c.s.hdr_att + c.s.hdr_won + c.s.saves_tipped);
    return share === null ? null : per90Over(c.saves * share, c.savesMinutes);
  };

function stat(group: StatGroup, tier: Tier, { key, abbr, ...spec }: Spec, value: Value): StatDef {
  const keeperOnly = spec.gkOnly ? true : spec.outfieldOnly ? false : null;
  return {
    key,
    label: stats.label[key],
    ...spec,
    abbr: abbr ?? key,
    description: stats.description[key],
    group,
    compute(r) {
      const c = contextOf(r);
      if (!tier(c) || (keeperOnly !== null && c.gk !== keeperOnly)) return null;
      const v = value(c);
      return v !== null && Number.isFinite(v) ? v : null;
    },
  };
}

const inGroup = (group: StatGroup) => (tier: Tier, spec: Spec, value: Value) => stat(group, tier, spec, value);
const gols = inGroup("gols");
const finalizacao = inGroup("finalizacao");
const criacao = inGroup("criacao");
const passe = inGroup("passe");
const cruzamento = inGroup("cruzamento");
const pressao = inGroup("pressao");
const posse = inGroup("posse");
const desarmes = inGroup("desarmes");
const cabeceio = inGroup("cabeceio");
const disciplina = inGroup("disciplina");
const fisico = inGroup("fisico");
const goleiro = (tier: Tier, spec: Spec, value: Value) => stat("goleiro", tier, { ...spec, gkOnly: true }, value);

const shotSample: MinSample = { of: "Shots", min: 1 };
const npShotSample: MinSample = { of: "npSh", min: 1 };
const passSample: MinSample = { of: "PasA", min: 10 };
const completedPassSample: MinSample = { of: "PasC", min: 10 };
const crossSample: MinSample = { of: "CrA", min: 10 };
const openPlayCrossSample: MinSample = { of: "OP-CrA", min: 10 };
const pressSample: MinSample = { of: "PresA", min: 10 };
const tackleSample: MinSample = { of: "TckA", min: 10 };
const headerSample: MinSample = { of: "HdrA", min: 10 };
const shotsFacedSample: MinSample = { of: "ShTA", min: 10 };
const penaltySample: MinSample = { of: "PenF", min: 3 };

export const STATS: readonly StatDef[] = [
  gols(played, { key: "Gls", unit: "count" }, (c) => c.e.goals),
  gols(played, { key: "Ast", unit: "count" }, (c) => c.e.assists),
  gols(played, { key: "G/90", unit: "per90" }, (c) => p90(c, c.e.goals)),
  gols(played, { key: "npG/90", unit: "per90" }, (c) => p90(c, npGoals(c))),
  gols(played, { key: "Ast/90", unit: "per90" }, (c) => p90(c, c.e.assists)),
  gols(played, { key: "GC/90", unit: "per90" }, (c) => p90(c, c.e.goals + c.e.assists)),
  gols(full, { key: "GOut/90", unit: "per90" }, (c) => (c.goalsOutKnown ? p90(c, c.s.goals_out) : null)),
  gols(core, { key: "xG-OP", unit: "count" }, (c) => c.e.goals - xg(c)),
  gols(core, { key: "xG-OP/90", unit: "per90" }, (c) => p90(c, c.e.goals - xg(c))),
  gols(core, { key: "npxG-OP", unit: "count" }, (c) => npGoals(c) - npxg(c)),
  gols(core, { key: "npG-npxG/90", abbr: "npxG-OP/90", unit: "per90" }, (c) => p90(c, npGoals(c)) - p90(c, npxg(c))),
  gols(core, { key: "xA-OP", unit: "count" }, (c) => c.e.assists - xa(c)),
  gols(core, { key: "xA-OP/90", unit: "per90" }, (c) => p90(c, c.e.assists - xa(c))),
  gols(
    played,
    {
      key: "Mins/Gl",
      unit: "ratio",
      lowerIsBetter: true,
      minSample: [{ of: "Gls", min: 1 }],
    },
    (c) => ratio(c.m, c.e.goals),
  ),
  gols(
    played,
    {
      key: "Mins/Ast",
      unit: "ratio",
      lowerIsBetter: true,
      minSample: [{ of: "Ast", min: 1 }],
    },
    (c) => ratio(c.m, c.e.assists),
  ),

  finalizacao(core, { key: "Shots", unit: "count" }, (c) => c.s.shots),
  finalizacao(core, { key: "npSh", unit: "count" }, npShots),
  finalizacao(core, { key: "xG", unit: "count" }, xg),
  finalizacao(core, { key: "npxG", unit: "count" }, npxg),
  finalizacao(core, { key: "xG/90", unit: "per90" }, (c) => p90(c, xg(c))),
  finalizacao(core, { key: "npxG/90", unit: "per90" }, (c) => p90(c, npxg(c))),
  finalizacao(core, { key: "Shots/90", unit: "per90" }, (c) => p90(c, c.s.shots)),
  finalizacao(core, { key: "SoT/90", unit: "per90" }, (c) => p90(c, c.s.sot)),
  finalizacao(full, { key: "ShOut/90", unit: "per90" }, (c) => p90(c, c.s.shots_out)),
  finalizacao(core, { key: "SoT%", unit: "pct", minSample: [shotSample] }, (c) => pct(c.s.sot, c.s.shots)),
  finalizacao(core, { key: "Conv%", unit: "pct", minSample: [shotSample] }, (c) => pct(c.e.goals, c.s.shots)),
  finalizacao(core, { key: "npG/Shot", unit: "ratio", minSample: [shotSample] }, (c) => ratio(npGoals(c), c.s.shots)),
  finalizacao(core, { key: "NP-Gls/Shot", unit: "ratio", minSample: [npShotSample] }, (c) =>
    ratio(npGoals(c), npShots(c)),
  ),
  finalizacao(core, { key: "xG/Shot", unit: "ratio", minSample: [shotSample] }, (c) => ratio(xg(c), c.s.shots)),
  finalizacao(core, { key: "npxG/Shot", unit: "ratio", minSample: [npShotSample] }, (c) => ratio(npxg(c), npShots(c))),

  criacao(core, { key: "xA", unit: "count" }, xa),
  criacao(full, { key: "CCC", unit: "count" }, (c) => c.s.ccc),
  criacao(full, { key: "Drb/90", unit: "per90" }, (c) => p90(c, c.s.drb)),
  criacao(core, { key: "xA/90", unit: "per90" }, (c) => p90(c, xa(c))),
  criacao(core, { key: "npxG+xA/90", unit: "per90" }, (c) => p90(c, npxg(c)) + p90(c, xa(c))),
  criacao(full, { key: "KP/90", unit: "per90" }, (c) => p90(c, c.s.kp)),
  criacao(full, { key: "OP-KP/90", unit: "per90" }, (c) => p90(c, c.s.op_kp)),
  criacao(full, { key: "CCC/90", unit: "per90" }, (c) => p90(c, c.s.ccc)),
  criacao(full, { key: "KP%", unit: "pct", minSample: [passSample] }, (c) => pct(c.s.kp, c.s.pas_att)),
  criacao(
    full,
    {
      key: "OP-KP%",
      unit: "pct",
      minSample: [passSample],
    },
    (c) => pct(c.s.op_kp, c.s.pas_att),
  ),
  criacao(
    full,
    {
      key: "Asts/CCC",
      unit: "ratio",
      minSample: [
        { of: "CCC", min: 5 },
        { of: "Ast", min: 1 },
      ],
    },
    (c) => ratio(c.e.assists, c.s.ccc),
  ),

  passe(core, { key: "PasA", unit: "count" }, (c) => c.s.pas_att),
  passe(core, { key: "PasC", unit: "count" }, (c) => c.s.pas_cmp),
  passe(core, { key: "PsC/90", unit: "per90" }, (c) => p90(c, c.s.pas_cmp)),
  passe(core, { key: "Pas%", unit: "pct", minSample: [passSample] }, (c) => pct(c.s.pas_cmp, c.s.pas_att)),
  passe(full, { key: "PrPass/90", unit: "per90" }, (c) => p90(c, c.s.pr_passes)),
  passe(full, { key: "PrPass%", unit: "pct", minSample: [completedPassSample] }, (c) =>
    pct(c.s.pr_passes, c.s.pas_cmp),
  ),

  cruzamento(full, { key: "CrA", unit: "count" }, (c) => c.s.crs_att),
  cruzamento(full, { key: "OP-CrA", unit: "count" }, (c) => c.s.op_crs_att),
  cruzamento(full, { key: "CrA/90", unit: "per90" }, (c) => p90(c, c.s.crs_att)),
  cruzamento(full, { key: "CrC/90", unit: "per90" }, (c) => p90(c, c.s.crs_cmp)),
  cruzamento(full, { key: "OP-CrA/90", unit: "per90" }, (c) => p90(c, c.s.op_crs_att)),
  cruzamento(full, { key: "OP-CrC/90", unit: "per90", outfieldOnly: true }, (c) => p90(c, c.s.op_crs_cmp)),
  cruzamento(full, { key: "Cr%", unit: "pct", minSample: [crossSample] }, (c) => pct(c.s.crs_cmp, c.s.crs_att)),
  cruzamento(
    full,
    {
      key: "OP-Cr%",
      unit: "pct",
      outfieldOnly: true,
      minSample: [openPlayCrossSample],
    },
    (c) => pct(c.s.op_crs_cmp, c.s.op_crs_att),
  ),

  pressao(full, { key: "PresA", unit: "count" }, (c) => c.s.pres_att),
  pressao(full, { key: "PresA/90", unit: "per90" }, (c) => p90(c, c.s.pres_att)),
  pressao(full, { key: "PresC/90", unit: "per90" }, (c) => p90(c, c.s.pres_cmp)),
  pressao(full, { key: "Pres%", unit: "pct", minSample: [pressSample] }, (c) => pct(c.s.pres_cmp, c.s.pres_att)),

  posse(full, { key: "PossWon/90", unit: "per90" }, (c) => p90(c, c.s.poss_won)),
  posse(full, { key: "PossLost/90", unit: "per90", lowerIsBetter: true }, (c) => p90(c, c.s.poss_lost)),
  posse(full, { key: "Poss+-/90", unit: "per90" }, (c) => p90(c, c.s.poss_won - c.s.poss_lost)),
  posse(
    full,
    {
      key: "Poss+-%",
      unit: "pct",
      minSample: [{ of: "minutes", min: 90 }],
    },
    (c) => pct(c.s.poss_won, c.s.poss_won + c.s.poss_lost),
  ),

  desarmes(core, { key: "TckA", unit: "count", outfieldOnly: true }, (c) => c.s.tck_att),
  desarmes(core, { key: "TckWon/90", unit: "per90", outfieldOnly: true }, (c) => p90(c, c.s.tck_won)),
  desarmes(core, { key: "Tck%", unit: "pct", outfieldOnly: true, minSample: [tackleSample] }, (c) =>
    pct(c.s.tck_won, c.s.tck_att),
  ),
  desarmes(full, { key: "KTck/90", unit: "per90" }, (c) => p90(c, c.s.tck_key)),
  desarmes(full, { key: "Int/90", unit: "per90" }, (c) => p90(c, c.s.int)),
  desarmes(full, { key: "Clr/90", unit: "per90" }, (c) => p90(c, c.s.clr)),
  desarmes(full, { key: "Blk/90", unit: "per90" }, (c) => p90(c, c.s.blocks)),
  desarmes(full, { key: "ShBlk/90", unit: "per90" }, (c) => p90(c, c.s.shots_blk)),
  desarmes(
    full,
    {
      key: "DefActions/90",
      unit: "per90",
      outfieldOnly: true,
    },
    (c) => p90(c, c.s.tck_won) + p90(c, c.s.int) + p90(c, c.s.blocks) + p90(c, c.s.clr),
  ),
  desarmes(
    full,
    {
      key: "Duel%",
      unit: "pct",
      outfieldOnly: true,
      minSample: [headerSample, tackleSample],
    },
    (c) => pct(c.s.hdr_won + c.s.tck_won, c.s.hdr_att + c.s.tck_att),
  ),

  cabeceio(full, { key: "HdrA", unit: "count", outfieldOnly: true }, (c) => c.s.hdr_att),
  cabeceio(full, { key: "HdrWon/90", unit: "per90", outfieldOnly: true }, (c) => p90(c, c.s.hdr_won)),
  cabeceio(full, { key: "KHdr/90", unit: "per90", outfieldOnly: true }, (c) => p90(c, c.s.hdr_key)),
  cabeceio(full, { key: "Hdr%", unit: "pct", outfieldOnly: true, minSample: [headerSample] }, (c) =>
    pct(c.s.hdr_won, c.s.hdr_att),
  ),

  disciplina(core, { key: "FoulsWon/90", unit: "per90" }, (c) => p90(c, c.s.fouls_won)),
  disciplina(core, { key: "Fouls/90", unit: "per90", lowerIsBetter: true }, (c) => p90(c, c.s.fouls)),
  disciplina(core, { key: "NetFouls/90", unit: "per90" }, (c) => p90(c, c.s.fouls_won - c.s.fouls)),
  disciplina(played, { key: "Yel/90", unit: "per90", lowerIsBetter: true }, (c) => p90(c, c.e.yellow)),
  disciplina(played, { key: "Red/90", unit: "per90", lowerIsBetter: true }, (c) => p90(c, c.e.red)),
  disciplina(full, { key: "Off/90", unit: "per90", lowerIsBetter: true }, (c) => p90(c, c.s.offsides)),
  disciplina(
    core,
    {
      key: "TckQlty",
      unit: "ratio",
      outfieldOnly: true,
      minSample: [tackleSample],
    },
    (c) => ratio(c.s.tck_won, c.s.fouls),
  ),
  disciplina(
    core,
    {
      key: "Yel/Tck",
      unit: "ratio",
      lowerIsBetter: true,
      outfieldOnly: true,
      minSample: [tackleSample],
    },
    (c) => ratio(c.e.yellow, c.s.tck_att),
  ),
  disciplina(
    core,
    {
      key: "Red/Tck",
      unit: "ratio",
      lowerIsBetter: true,
      outfieldOnly: true,
      minSample: [tackleSample],
    },
    (c) => ratio(c.e.red, c.s.tck_att),
  ),

  fisico(full, { key: "Dist/90", unit: "km" }, (c) => p90(c, c.s.distance10 / 10)),
  fisico(full, { key: "Sprints/90", unit: "per90" }, (c) => p90(c, c.s.sprints)),
  fisico(played, { key: "Mins/Gm", unit: "ratio" }, (c) => ratio(c.m, c.e.starts + c.e.subs)),

  goleiro(played, { key: "Conc/90", unit: "per90", lowerIsBetter: true }, (c) => p90(c, c.e.conceded)),
  goleiro(played, { key: "CS/90", unit: "per90" }, (c) => p90(c, c.cleanSheets)),
  goleiro(saveData, { key: "Saves", unit: "count" }, (c) => c.saves),
  goleiro(saveData, { key: "ShTA", unit: "count" }, shotsFaced),
  goleiro(saveData, { key: "Saves/90", unit: "per90" }, (c) => per90Over(c.saves, c.savesMinutes)),
  goleiro(
    saveData,
    { key: "Svh/90", unit: "per90" },
    saveShare((c) => c.s.hdr_att),
  ),
  goleiro(
    saveData,
    { key: "Svp/90", unit: "per90" },
    saveShare((c) => c.s.hdr_won),
  ),
  goleiro(
    saveData,
    { key: "Svt/90", unit: "per90" },
    saveShare((c) => c.s.saves_tipped),
  ),
  goleiro(saveData, { key: "Sv%", unit: "pct", minSample: [shotsFacedSample] }, (c) => pct(c.saves, shotsFaced(c))),
  goleiro(saveData, { key: "xSv%", unit: "pct", minSample: [shotsFacedSample] }, (c) => {
    const faced = shotsFaced(c);
    return faced ? (1 - (c.xgPrevented + c.savesConceded) / faced) * 100 : null;
  }),
  goleiro(saveData, { key: "Saves/Conc", unit: "ratio", minSample: [shotsFacedSample] }, (c) =>
    ratio(c.saves, c.savesConceded),
  ),
  goleiro(saveData, { key: "xGP/90", unit: "per90" }, (c) => per90Over(c.xgPrevented, c.savesMinutes)),
  goleiro(played, { key: "PenF", unit: "count" }, (c) => c.s.tck_att),
  goleiro(played, { key: "PenSv%", unit: "pct", minSample: [penaltySample] }, (c) => pct(c.s.tck_won, c.s.tck_att)),
];

export const STAT_KEYS: readonly StatKey[] = STATS.map((d) => d.key);

const INDEX = new Map(STAT_KEYS.map((key, j) => [key, j]));

export function statIndex(key: StatKey): number {
  const j = INDEX.get(key);
  if (j === undefined) throw new Error(`unknown stat ${key}`);
  return j;
}
