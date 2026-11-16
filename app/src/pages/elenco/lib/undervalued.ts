import type { AnalysisResult } from "@/engine/index";
import { indicesOf } from "@/table/lib/rows";

export const undervaluedSet = (analysis: AnalysisResult): ReadonlySet<number> =>
  new Set(indicesOf(analysis.moneyball, analysis.uids));
