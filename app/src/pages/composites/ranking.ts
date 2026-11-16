import type { PlayerRecord } from "@/data/types";
import { sampleSizes } from "@/engine/club";
import { type Composite, evalComposite } from "@/engine/composites";
import type { AnalysisResult } from "@/engine/index";
import { GK_INDEX } from "@/engine/positions";
import { i18n } from "@/i18n";
import { formatFixed } from "@/lib/format";
import { poolLabel } from "@/table/columns/labels";
import { topPlayers } from "./model";

export const PREVIEW_TOP = 5;

export interface Ranking {
  rows: number[];
  score(i: number): string;
  caption: string;
  empty: string;
  pending: boolean;
}

function evaluated(c: Composite, players: readonly PlayerRecord[], analysis: AnalysisResult): Float32Array {
  try {
    const isGk = Uint8Array.from(analysis.group, (g) => (g === GK_INDEX ? 1 : 0));
    return evalComposite(c, analysis.cols, analysis.pct, isGk, sampleSizes(players));
  } catch (e) {
    console.warn("Prévia da composta indisponível", e);
    return new Float32Array(analysis.group.length).fill(NaN);
  }
}

export function displayRanking(c: Composite, players: readonly PlayerRecord[], analysis: AnalysisResult): Ranking {
  const scores = evaluated(c, players, analysis);
  const rows = topPlayers(scores, analysis.pool, PREVIEW_TOP);
  const decimals = c.kind === "weightedSum" ? 2 : 1;
  const pool = poolLabel(analysis.poolMinutes);
  return {
    rows,
    score: (i) => formatFixed(scores[i], decimals),
    caption: i18n.t("composites.preview.displayCaption", { ns: "settings", pool }),
    empty: i18n.t("composites.preview.displayEmpty", { ns: "settings", pool }),
    pending: false,
  };
}
