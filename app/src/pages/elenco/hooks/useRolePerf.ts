import { useMemo } from "react";
import { squadRolePerf } from "@/engine/analysis/squadRoles";
import type { AnalysisResult } from "@/engine/index";
import type { RolePerf } from "../lib/performance";

export function useRolePerf(analysis: AnalysisResult): RolePerf {
  return useMemo(() => squadRolePerf(analysis.squadRoles), [analysis.squadRoles]);
}
