import { useTranslation } from "react-i18next";
import type { AnalysisResult } from "@/engine/index";
import { MAX_COMPARE } from "@/store/ui";
import type { Compared, Located } from "../lib/compared";
import { ComparedCard } from "./ComparedCard";
import { MissingCard } from "./MissingCard";
import { RoomCard } from "./RoomCard";

interface ComparedPlayersProps {
  located: readonly Located[];
  entries: readonly Compared[];
  analysis: AnalysisResult;
  onOpen(uid: number): void;
  onRemove(uid: number): void;
}

export function ComparedPlayers({ located, entries, analysis, onOpen, onRemove }: ComparedPlayersProps) {
  const { t } = useTranslation("compare");
  const columnsUsed = located.length;
  return (
    <div className="grid grid-cols-3 gap-3">
      <ul
        aria-label={t("players")}
        className="grid gap-x-3"
        style={{
          gridColumn: `span ${columnsUsed}`,
          gridTemplateColumns: `repeat(${columnsUsed}, minmax(0, 1fr))`,
        }}
      >
        {located.map(({ uid }) => {
          const entry = entries.find((e) => e.uid === uid);
          const remove = () => onRemove(uid);
          return entry ? (
            <ComparedCard key={uid} entry={entry} analysis={analysis} onOpen={() => onOpen(uid)} onRemove={remove} />
          ) : (
            <MissingCard key={uid} onRemove={remove} />
          );
        })}
      </ul>
      {columnsUsed < MAX_COMPARE && <RoomCard room={MAX_COMPARE - columnsUsed} />}
    </div>
  );
}
