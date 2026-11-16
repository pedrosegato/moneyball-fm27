import { useMemo, useState } from "react";
import type { PlayerRecord } from "@/data/types";
import { ALL } from "@/lib/constants";
import { squadOf, teamOf, teamOptions } from "../lib/squadRows";

const NO_TEAM = "outros";
export const teamKey = (team: string | null) => team ?? NO_TEAM;

export function useSquadTeams(players: readonly PlayerRecord[], club: number) {
  const [team, setTeam] = useState<string>(ALL);
  const squad = useMemo(() => squadOf(players, club), [players, club]);
  const teams = useMemo(() => teamOptions(players, squad, club), [players, squad, club]);
  const shownTeam = teams.some((t) => teamKey(t.team) === team) ? team : ALL;
  const inTeam = useMemo(
    () => (shownTeam === ALL ? squad : squad.filter((i) => teamKey(teamOf(players[i], club)) === shownTeam)),
    [squad, players, club, shownTeam],
  );
  return { squad, teams, team: shownTeam, setTeam, inTeam };
}
export type SquadTeams = ReturnType<typeof useSquadTeams>;
