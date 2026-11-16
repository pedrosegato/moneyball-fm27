import type { PlayerRecord, RecordStats } from "@/data/types";
import { DEFAULT_ENGINE_SETTINGS } from "@/engine/analysis/input";
import { runAnalysis } from "@/engine/index";
import { POS_NAMES } from "@/engine/positions";
import type { RoleId } from "@/engine/roles/catalog";
import { playerRecord, type RecordParts, snapshotOf } from "@/engine/testing/records";
import { defaultComposites, engineComposites } from "@/store/composites";
import type { TableSource } from "./columns/types";

type PosName = (typeof POS_NAMES)[number];

export function ratings(best: PosName, others: Partial<Record<PosName, number>> = {}): number[] {
  return POS_NAMES.map((name) => (name === best ? 20 : (others[name] ?? 1)));
}

const FIRST = [
  "Matheus",
  "Jonas",
  "Kaito",
  "Alejandro",
  "Tiago",
  "Noah",
  "Bilal",
  "Erik",
  "Santiago",
  "Mateo",
  "Yusuf",
  "Lucas",
];
const LAST = [
  "Ribeiro",
  "Albertsen",
  "Morishita",
  "Viñas",
  "Paixão",
  "van Dijkhuizen",
  "Haddouche",
  "Lindqvist",
  "Ferreyra",
];
const CLUBS = [
  "Red Bull Bragantino",
  "Viking",
  "Kashima Antlers",
  "SD Huesca",
  "Gil Vicente",
  "PEC Zwolle",
  "BK Häcken",
];
const SPOTS: readonly PosName[] = ["ST", "AMR", "AML", "MC", "DC", "DL", "DM", "AMC"];

function recordFor(k: number, minutes: number): RecordStats {
  const r = (base: number, step: number, mod = 97) => base + ((k * step) % mod);
  return {
    pas_att: r(600, 37, 400),
    pas_cmp: r(420, 29, 300),
    tck_att: r(20, 7, 40),
    tck_won: r(10, 5, 20),
    hdr_att: r(20, 11, 60),
    hdr_won: r(8, 7, 25),
    drb: r(5, 13, 60),
    fouls: r(8, 3, 25),
    fouls_won: r(6, 5, 30),
    shots: r(8, 9, 70),
    sot: r(3, 5, 25),
    distance10: Math.round(minutes * 1.15),
    offsides: r(0, 3, 12),
    saves_tipped: 0,
    op_crs_cmp: r(2, 3, 20),
    kp: r(5, 7, 40),
    tck_key: r(0, 3, 6),
    hdr_key: r(0, 2, 5),
    int: r(6, 5, 35),
    ccc: r(1, 3, 12),
    blocks: r(2, 3, 15),
    poss_lost: r(80, 17, 200),
    poss_won: r(40, 13, 120),
    xg100: r(150, 61, 900),
    xa100: r(80, 43, 500),
    clr: r(5, 11, 80),
    fk: 0,
    goals_out: r(0, 1, 4),
    op_crs_att: r(8, 7, 60),
    shots_out: r(2, 5, 20),
    xgp100: 0,
    sprints: r(60, 23, 300),
    pr_passes: r(20, 19, 120),
    pres_att: r(80, 31, 300),
    pres_cmp: r(25, 13, 120),
    op_kp: r(3, 5, 30),
    npxg100: r(120, 53, 800),
    crs_att: r(10, 9, 70),
    crs_cmp: r(3, 5, 25),
    shots_blk: r(1, 3, 12),
    hdr_lost: r(10, 5, 30),
  };
}

export function demoPlayer(k: number, parts: RecordParts = {}): PlayerRecord {
  const minutes = 950 + ((k * 137) % 2400);
  return playerRecord({
    name: `${FIRST[k % FIRST.length]} ${LAST[(k * 5) % LAST.length]}`,
    club: CLUBS[k % CLUBS.length],
    club_uid: 1000 + (k % CLUBS.length),
    division: "Série A",
    nation: "Brasil",
    age: 18 + (k % 15),
    value: 400_000 + k * 175_000,
    wage: 2_000 + k * 450,
    contract_end: `${2027 + (k % 4)}-06-30`,
    pos: ratings(SPOTS[k % SPOTS.length]),
    position: "ST (C)",
    minutes,
    season: { goals: k % 9, assists: k % 6, starts: Math.round(minutes / 90), yellow: k % 4 },
    record: recordFor(k, minutes),
    ...parts,
  });
}

export const demoPlayers = (n: number): PlayerRecord[] => Array.from({ length: n }, (_, k) => demoPlayer(k));

export function worstCasePlayers(): PlayerRecord[] {
  return [
    demoPlayer(101, {
      name: "João Henrique Gonçalves de Albuquerque Júnior",
      club: "Universidad Técnica de Cajamarca",
      division: "Liga 1 Te Apuesto",
    }),
    demoPlayer(102, { name: "김민재", club: "Fenerbahçe", nation: "República da Coreia", pos: ratings("DC") }),
    demoPlayer(103, { name: "محمد صلاح", club: "Al-Ittihad Club", nation: "Egito" }),
    demoPlayer(104, { name: "Nguyễn Quang Hải", club: "Công An Hà Nội" }),
    demoPlayer(105, { name: "Rəşad Abdullayev", club: "Qarabağ FK" }),
    demoPlayer(106, { name: "Jô", club: "Corinthians", age: null }),
    playerRecord({
      name: "Tifany Hoyos",
      club: null,
      club_uid: null,
      division: null,
      contract_end: null,
      wage: null,
      value: 0,
      minutes: 0,
      age: 16,
      pos: ratings("MC"),
    }),
    playerRecord({
      name: "Tseren Khaliun",
      club: null,
      club_uid: null,
      division: null,
      contract_end: null,
      wage: null,
      value: 4_294_967_295,
      minutes: 0,
      age: 17,
      pos: ratings("ST"),
    }),
    demoPlayer(107, { name: "Zak O’Keefe", value: 300_000_000 }),
    demoPlayer(108, {
      name: "Iván D’Angelo",
      value: 289_575_008,
      wage: 3_413_698,
      minutes: 4_590,
      season: { goals: 61, assists: 29, starts: 51 },
    }),
    demoPlayer(109, {
      name: "Oliver Michael Sherring-Bance",
      club: "Bristol Rovers",
      pos: ratings("DM", { DL: 19, DC: 19, DR: 19, WBL: 18, WBR: 18, MC: 18 }),
    }),
  ];
}

export function analyzeFixture(
  players: PlayerRecord[],
  myClubUid: number | null = null,
  role: RoleId | null = null,
): TableSource {
  const composites = engineComposites(defaultComposites());
  const analysis = runAnalysis({
    snapshot: snapshotOf(players),
    composites,
    myClubUid,
    settings: DEFAULT_ENGINE_SETTINGS,
    role,
  });
  return { players, analysis, composites };
}

export const allRows = (n: number): Uint32Array => Uint32Array.from({ length: n }, (_, i) => i);
