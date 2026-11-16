import { positions } from "@/i18n/pt-BR/positions";
import type { PosGroup } from "../positions";
import type { StatKey } from "../stats/catalog";

export const GROUP_LABELS: Readonly<Record<PosGroup, string>> = positions.group;

const GOAL = ["npG/90", "npxG/90", "Shots/90", "SoT%", "xG/Shot", "xA/90", "KP/90", "Drb/90", "PresC/90", "HdrWon/90"];
const CREATION = [
  "npG/90",
  "npxG/90",
  "xA/90",
  "KP/90",
  "CCC/90",
  "Drb/90",
  "PrPass/90",
  "Cr%",
  "PresC/90",
  "PossWon/90",
];
const MIDFIELD = [
  "PsC/90",
  "Pas%",
  "PrPass/90",
  "KP/90",
  "xA/90",
  "Drb/90",
  "TckWon/90",
  "Int/90",
  "PossWon/90",
  "PresC/90",
];
const DEFENCE = ["TckWon/90", "Tck%", "Int/90", "Clr/90", "Blk/90", "HdrWon/90", "Hdr%", "PsC/90", "Pas%", "PrPass/90"];

export const STYLE_STATS: Readonly<Record<PosGroup, readonly StatKey[]>> = {
  GK: ["Sv%", "xSv%", "xGP/90", "Conc/90", "CS/90", "Saves/90", "PsC/90", "Pas%"],
  ZAG: DEFENCE,
  LAT: [...DEFENCE, "Cr%", "Drb/90", "xA/90"],
  VOL: MIDFIELD,
  MC: MIDFIELD,
  MEI: CREATION,
  PON: CREATION.map((k) => (k === "PrPass/90" ? "OP-CrC/90" : k)),
  ATA: GOAL,
};
