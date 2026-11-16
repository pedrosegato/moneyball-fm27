import { useTranslation } from "react-i18next";
import { formatCount } from "@/lib/format";
import type { PointLevels } from "../lib/levels";
import type { Axis, PointSet } from "../lib/scatter";
import { HowToReadToggle } from "./HowToReadToggle";
import { LevelsNote } from "./LevelsNote";

interface PlotSummaryProps {
  points: PointSet;
  pool: string;
  axes: { x: Axis; y: Axis };
  levels: PointLevels | null;
}

export function PlotSummary({ points, pool, axes, levels }: PlotSummaryProps) {
  const { t } = useTranslation("graphs");
  const n = points.rows.length;
  const lacking = points.inView - n;
  return (
    <div className="flex min-h-9 flex-wrap items-center gap-x-4 gap-y-1 px-4 pt-1.5">
      <div className="flex items-center gap-2">
        <p role="status" className="type-label text-fg-muted">
          <span className="text-fg tabular-nums">{formatCount(n)}</span> {t("plotted", { count: n, pool })}
          {lacking > 0 && (
            <span className="tabular-nums">
              {" "}
              {t("lacking", { n: formatCount(lacking), x: axes.x.abbr, y: axes.y.abbr })}
            </span>
          )}
        </p>
        <HowToReadToggle />
      </div>
      <LevelsNote n={n} levels={levels} />
    </div>
  );
}
