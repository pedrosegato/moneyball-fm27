import { roles } from "@/i18n/pt-BR/roles";
import { POS_GROUPS, type PosGroup, type PosName, positionGroup } from "../positions";
import type { StatKey } from "../stats/catalog";

export const ROLE_PHASES = ["ip", "oop"] as const;
export type RolePhase = (typeof ROLE_PHASES)[number];
export type RoleId = `${RolePhase}:${number}`;

export const ROLE_PROFILES = [
  "goleiros",
  "zagueiros",
  "laterais",
  "volantes",
  "boxToBox",
  "armadores",
  "avancados",
] as const;
export type RoleProfile = (typeof ROLE_PROFILES)[number];

export interface RoleDef {
  id: RoleId;
  phase: RolePhase;
  gameId: number;
  abbr: string;
  shortName: string;
  name: string;
  positions: readonly PosName[];
  profile: RoleProfile;
  pdf: readonly StatKey[];
}

type Row = [RolePhase, number, string, readonly PosName[], RoleProfile, readonly StatKey[]];

const ROWS: readonly Row[] = [
  ["ip", 0, "GK", ["GK"], "goleiros", ["Sv%", "CS/90", "Saves/90", "Pas%"]],
  ["ip", 1, "CB", ["DC"], "zagueiros", []],
  ["ip", 2, "FB", ["DR", "DL"], "laterais", []],
  ["ip", 3, "WB", ["DR", "DL", "WBR", "WBL"], "laterais", ["TckWon/90", "Int/90", "PrPass/90", "KP/90"]],
  ["ip", 4, "DM", ["DM"], "volantes", ["TckWon/90", "Int/90", "PossWon/90", "Pas%"]],
  ["ip", 5, "CM", ["MC"], "boxToBox", []],
  ["ip", 6, "WM", ["MR", "ML"], "avancados", ["CrC/90", "KP/90", "TckWon/90", "Pas%"]],
  ["ip", 7, "W", ["MR", "ML", "AMR", "AML"], "avancados", []],
  ["ip", 9, "AM", ["MC", "AMC"], "armadores", ["G/90", "xG/90", "KP/90", "Shots/90"]],
  ["ip", 10, "DLF", ["ST"], "avancados", ["G/90", "xG/90", "KP/90", "PrPass/90"]],
  ["ip", 11, "CFD", ["ST"], "avancados", []],
  ["ip", 12, "BGK", ["GK"], "goleiros", ["Pas%", "PrPass/90", "Sv%", "CS/90"]],
  ["ip", 14, "ACB", ["DC"], "zagueiros", ["PrPass/90", "Drb/90", "TckWon/90", "Pas%"]],
  ["ip", 15, "DLP", ["DM"], "volantes", ["Pas%", "PrPass/90", "KP/90", "Int/90"]],
  ["ip", 16, "BBM", ["DM"], "boxToBox", ["TckWon/90", "PrPass/90", "KP/90", "Pas%"]],
  ["ip", 17, "AP", ["MC", "AMC"], "armadores", ["KP/90", "PrPass/90", "Pas%", "Drb/90"]],
  ["ip", 18, "TF", ["ST"], "avancados", ["Hdr%", "G/90", "xG/90", "KP/90"]],
  ["ip", 19, "P", ["ST"], "avancados", []],
  ["ip", 24, "BCB", ["DC"], "zagueiros", ["Pas%", "PrPass/90", "TckWon/90"]],
  ["ip", 27, "IF", ["AMR", "AML"], "avancados", ["G/90", "xG/90", "Shots/90", "Drb/90"]],
  ["ip", 29, "NCB", ["DC"], "zagueiros", ["TckWon/90", "Int/90", "Hdr%", "Pas%"]],
  ["ip", 31, "CHF", ["ST"], "avancados", ["G/90", "xG/90", "Shots/90", "Sprints/90"]],
  ["ip", 32, "FR", ["AMC"], "armadores", ["KP/90", "PrPass/90", "Drb/90", "G/90"]],
  ["ip", 35, "HB", ["DM"], "volantes", ["Int/90", "TckWon/90", "Pas%", "Hdr%"]],
  ["ip", 38, "AWB", ["WBR", "WBL"], "laterais", ["KP/90", "CrC/90", "Drb/90", "PrPass/90"]],
  ["ip", 40, "F9", ["ST"], "avancados", ["KP/90", "PrPass/90", "Drb/90", "xG/90"]],
  ["ip", 41, "SS", ["AMC"], "avancados", ["G/90", "xG/90", "KP/90", "Shots/90"]],
  ["ip", 43, "PW", ["MR", "ML", "AMR", "AML"], "avancados", ["KP/90", "PrPass/90", "Pas%", "Drb/90"]],
  ["ip", 44, "IWB", ["DR", "DL", "WBR", "WBL"], "laterais", ["PrPass/90", "Pas%", "KP/90", "Drb/90"]],
  ["ip", 45, "WFD", ["AMR", "AML"], "avancados", ["G/90", "xG/90", "Shots/90", "Drb/90"]],
  ["ip", 46, "BBP", ["DM"], "boxToBox", ["PrPass/90", "KP/90", "TckWon/90", "Pas%"]],
  ["ip", 48, "WCM", ["MC"], "boxToBox", ["PrPass/90", "KP/90", "TckWon/90", "Sprints/90"]],
  ["ip", 49, "IW", ["MR", "ML", "AMR", "AML"], "avancados", ["KP/90", "PrPass/90", "Drb/90", "xG/90"]],
  ["ip", 51, "WCB", ["DC"], "zagueiros", ["TckWon/90", "Int/90", "PrPass/90", "Hdr%"]],
  ["ip", 52, "IFB", ["DR", "DL"], "laterais", ["Pas%", "PrPass/90", "TckWon/90", "Int/90"]],
  ["ip", 53, "NGK", ["GK"], "goleiros", ["Sv%", "Saves/90", "CS/90", "Pas%"]],
  ["ip", 54, "OCB", ["DC"], "zagueiros", ["PrPass/90", "Drb/90", "TckWon/90", "Pas%"]],
  ["ip", 55, "PWB", ["DR", "DL", "WBR", "WBL"], "laterais", ["KP/90", "PrPass/90", "Pas%", "CrC/90"]],
  ["ip", 56, "CHM", ["MC", "AMC"], "armadores", ["PrPass/90", "Drb/90", "KP/90", "Sprints/90"]],
  ["ip", 57, "MPM", ["MC"], "armadores", ["KP/90", "PrPass/90", "Pas%", "Drb/90"]],
  ["oop", 0, "GK", ["GK"], "goleiros", ["Sv%", "CS/90", "Saves/90", "Pas%"]],
  ["oop", 1, "SK", ["GK"], "goleiros", ["Pas%", "PrPass/90", "Sv%", "CS/90"]],
  ["oop", 2, "LHK", ["GK"], "goleiros", []],
  ["oop", 3, "CB", ["DC"], "zagueiros", []],
  ["oop", 4, "SCB", ["DC"], "zagueiros", []],
  ["oop", 5, "CCB", ["DC"], "zagueiros", []],
  ["oop", 6, "WCB", ["DC"], "zagueiros", ["TckWon/90", "Int/90", "PrPass/90", "Hdr%"]],
  ["oop", 7, "SWD", ["DC"], "zagueiros", []],
  ["oop", 8, "CWD", ["DC"], "zagueiros", []],
  ["oop", 9, "FB", ["DR", "DL"], "laterais", []],
  ["oop", 10, "PFB", ["DR", "DL"], "laterais", []],
  ["oop", 11, "HFB", ["DR", "DL"], "laterais", []],
  ["oop", 12, "WB", ["WBR", "WBL"], "laterais", ["TckWon/90", "Int/90", "PrPass/90", "KP/90"]],
  ["oop", 13, "PWB", ["WBR", "WBL"], "laterais", []],
  ["oop", 14, "HWB", ["WBR", "WBL"], "laterais", []],
  ["oop", 15, "DM", ["DM"], "volantes", ["TckWon/90", "Int/90", "PossWon/90", "Pas%"]],
  ["oop", 16, "DDM", ["DM"], "volantes", ["Int/90", "TckWon/90", "Pas%", "PrPass/90"]],
  ["oop", 17, "PDM", ["DM"], "volantes", ["PresA/90", "PresC/90", "TckWon/90", "PossWon/90"]],
  ["oop", 18, "SDM", ["DM"], "volantes", ["Int/90", "TckWon/90", "PossWon/90", "Pas%"]],
  ["oop", 19, "WDM", ["DM"], "volantes", ["TckWon/90", "Int/90", "Sprints/90", "Pas%"]],
  ["oop", 20, "CM", ["MC"], "boxToBox", []],
  ["oop", 27, "PCM", ["MC"], "boxToBox", []],
  ["oop", 28, "SCM", ["MC"], "boxToBox", []],
  ["oop", 29, "WCM", ["MC"], "boxToBox", []],
  ["oop", 30, "AM", ["AMC"], "armadores", ["G/90", "xG/90", "KP/90", "Shots/90"]],
  ["oop", 31, "TAM", ["AMC"], "armadores", []],
  ["oop", 32, "OAM", ["AMC"], "armadores", []],
  ["oop", 33, "SOAM", ["AMC"], "armadores", []],
  ["oop", 35, "WMF", ["MR", "ML"], "avancados", ["CrC/90", "KP/90", "TckWon/90", "Pas%"]],
  ["oop", 36, "TWM", ["MR", "ML"], "avancados", []],
  ["oop", 37, "OWM", ["MR", "ML"], "avancados", ["Sprints/90", "Drb/90", "PrPass/90", "KP/90"]],
  ["oop", 38, "W", ["AMR", "AML"], "avancados", []],
  ["oop", 39, "TW", ["AMR", "AML"], "avancados", []],
  ["oop", 40, "IOWF", ["AMR", "AML"], "avancados", ["Sprints/90", "Drb/90", "PrPass/90", "KP/90"]],
  ["oop", 41, "WOW", ["AMR", "AML"], "avancados", ["Sprints/90", "Drb/90", "PrPass/90", "KP/90"]],
  ["oop", 42, "CFD", ["ST"], "avancados", []],
  ["oop", 43, "TCF", ["ST"], "avancados", []],
  ["oop", 44, "OCF", ["ST"], "avancados", []],
  ["oop", 45, "SCF", ["ST"], "avancados", []],
];

const nameOf = (phase: RolePhase, gameId: number) => (roles.name[phase] as Record<number, string>)[gameId];
const shortOf = (phase: RolePhase, gameId: number) => (roles.short[phase] as Record<number, string>)[gameId];

export const ROLES: readonly RoleDef[] = ROWS.map(([phase, gameId, abbr, positions, profile, pdf]) => ({
  id: `${phase}:${gameId}`,
  phase,
  gameId,
  abbr,
  shortName: shortOf(phase, gameId),
  name: nameOf(phase, gameId),
  positions,
  profile,
  pdf,
}));

const BY_ID = new Map<string, RoleDef>(ROLES.map((r) => [r.id, r]));
const INDEX = new Map<string, number>(ROLES.map((r, i) => [r.id, i]));

export const roleById = (id: string): RoleDef | undefined => BY_ID.get(id);

export const isRoleId = (v: unknown): v is RoleId => typeof v === "string" && BY_ID.has(v);

export function roleIndex(id: RoleId): number {
  const i = INDEX.get(id);
  if (i === undefined) throw new Error(`Unknown role id: ${id}`);
  return i;
}

export function roleGroups(role: RoleDef): PosGroup[] {
  const groups = new Set(role.positions.map(positionGroup));
  return POS_GROUPS.filter((g) => groups.has(g));
}
