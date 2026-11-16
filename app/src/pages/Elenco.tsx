import { myClubUid } from "@/data/myClub";
import { lineupOf } from "@/store/fit";
import { useAppStore, useGameTactic } from "@/store/index";
import { useData } from "@/store/useData";
import { ClubMissing } from "./elenco/components/ClubMissing";
import { ElencoBoard } from "./elenco/components/ElencoBoard";

export function Elenco() {
  const { snapshot, analysis, reload } = useData();
  const fit = useAppStore((s) => s.fit);
  const tactic = useGameTactic();
  if (!snapshot || !analysis) return null;
  const club = myClubUid(snapshot);
  if (club === null) return <ClubMissing onReload={() => void reload()} />;
  return (
    <ElencoBoard
      players={snapshot.players}
      analysis={analysis}
      club={club}
      lineup={lineupOf(fit, club)}
      tactic={tactic}
    />
  );
}
