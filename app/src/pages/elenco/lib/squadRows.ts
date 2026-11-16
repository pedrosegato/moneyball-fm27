import type { PlayerRecord } from "@/data/types";
import { belongsTo } from "@/engine/club";
import { SELL_KEEP_VERDICTS, type SellKeepVerdict } from "@/engine/sellKeep";
import { i18n } from "@/i18n";
import { elencoT } from "./elencoT";

const SENIOR_TEAM = "Senior Team";
const RESERVES = "Reserves";
const AGE_TEAM = /^U(\d+)$/;

export function squadOf(players: readonly PlayerRecord[], clubUid: number | null): number[] {
  return players.flatMap((r, i) => (belongsTo(r, clubUid) ? [i] : []));
}

export function teamOf(r: PlayerRecord, clubUid: number | null): string | null {
  return (r.owner_uid !== null && r.owner_uid === clubUid ? r.owner_team : r.team) || null;
}

export function teamLabel(team: string | null): string {
  if (team === null) return elencoT("team.other");
  if (team === SENIOR_TEAM) return elencoT("team.senior");
  if (team === RESERVES) return elencoT("team.reserves");
  const age = AGE_TEAM.exec(team);
  return age ? elencoT("team.age", { age: age[1] }) : team;
}

function teamRank(team: string | null): number {
  if (team === SENIOR_TEAM) return 0;
  if (team === RESERVES) return 1;
  if (team === null) return 1000;
  const age = AGE_TEAM.exec(team);
  return age ? 200 - Number(age[1]) : 500;
}

export interface TeamOption {
  team: string | null;
  label: string;
  count: number;
}

export function teamOptions(
  players: readonly PlayerRecord[],
  squad: readonly number[],
  clubUid: number | null,
): TeamOption[] {
  const counts = new Map<string | null, number>();
  for (const i of squad) {
    const team = teamOf(players[i], clubUid);
    counts.set(team, (counts.get(team) ?? 0) + 1);
  }
  return [...counts]
    .sort(([a], [b]) => teamRank(a) - teamRank(b) || (a ?? "").localeCompare(b ?? ""))
    .map(([team, count]) => ({ team, label: teamLabel(team), count }));
}

export function squadCaption(r: PlayerRecord, clubUid: number | null): string {
  if (r.owner_uid !== null && r.owner_uid === clubUid) {
    return elencoT("team.loanedTo", { club: r.club ?? i18n.t("noClub") });
  }
  if (r.owner) return elencoT("team.loanedFrom", { owner: r.owner });
  return teamLabel(teamOf(r, clubUid));
}

const NO_PERF = 101;

export function verdictOrder(verdict: SellKeepVerdict | null, perf: number): number {
  if (verdict === null) return NaN;
  return SELL_KEEP_VERDICTS.indexOf(verdict) * 1000 + (Number.isNaN(perf) ? NO_PERF : 100 - perf);
}
