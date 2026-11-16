import { LoaderCircle } from "lucide-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { Composite } from "@/engine/composites";
import { cn } from "@/lib/utils";
import { useData } from "@/store/useData";
import { PreviewRow } from "./PreviewRow";
import { displayRanking, PREVIEW_TOP } from "./ranking";

export function Preview({ composite }: { composite: Composite }) {
  const { t } = useTranslation("settings");
  const { snapshot, analysis } = useData();
  const players = snapshot?.players;
  const ranking = useMemo(() => {
    if (!players || !analysis || players.length !== analysis.group.length) return null;
    return displayRanking(composite, players, analysis);
  }, [composite, players, analysis]);

  return (
    <aside
      aria-label={t("composites.preview.label")}
      className="flex flex-col gap-2 rounded-xl border border-line-subtle bg-surface-raised p-3"
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="type-label text-fg">{t("composites.preview.top", { n: PREVIEW_TOP })}</h3>
        {ranking?.pending && (
          <span role="status" data-delayed className="flex items-center gap-1 type-caption text-fg-muted">
            <LoaderCircle className="size-3 animate-spin motion-reduce:animate-none" aria-hidden />
            {t("composites.preview.recalculating")}
          </span>
        )}
      </div>
      {!players || !ranking ? (
        <p className="type-caption text-fg-muted">{t("composites.preview.waiting")}</p>
      ) : (
        <>
          <p className="type-caption text-fg-muted">{ranking.caption}</p>
          {ranking.rows.length === 0 ? (
            <p className="py-2 type-caption text-fg-secondary">{ranking.empty}</p>
          ) : (
            <ol className={cn("flex flex-col", ranking.pending && "opacity-60")}>
              {ranking.rows.map((i, k) => (
                <PreviewRow key={players[i].uid} rank={k + 1} player={players[i]} score={ranking.score(i)} />
              ))}
            </ol>
          )}
        </>
      )}
    </aside>
  );
}
