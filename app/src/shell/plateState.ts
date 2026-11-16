import { i18n } from "@/i18n";
import type { DataState } from "@/store/data";

export type PlateInput = Pick<DataState, "snapshot" | "status" | "gameDate" | "loading" | "error">;

export type PlateState =
  | { tone: "working"; label?: undefined }
  | { tone: "live" | "idle"; label: string }
  | { tone: "danger"; label: string; detail?: string }
  | { tone: "stale"; label: string; dataDate: string; gameDate: string };

export type ProblemState = Extract<PlateState, { tone: "danger" | "stale" }>;

export const isProblem = (state: PlateState): state is ProblemState =>
  state.tone === "danger" || state.tone === "stale";

export function plateState({ snapshot, status, gameDate, loading, error }: PlateInput): PlateState {
  const dataDate = snapshot?.date ?? null;
  if (loading || status?.busy) return { tone: "working" };
  if (status?.build_known === false) {
    return {
      tone: "danger",
      label: i18n.t("plate.unknownBuild", { ns: "shell" }),
      detail: status.error ?? i18n.t("plate.unknownBuildDetail", { ns: "shell" }),
    };
  }
  if (status && !status.ok) {
    return { tone: "danger", label: i18n.t("plate.notFound", { ns: "shell" }), detail: status.error };
  }
  if (error) {
    const label = snapshot ? i18n.t("plate.readFailed", { ns: "shell" }) : i18n.t("plate.noData", { ns: "shell" });
    return { tone: "danger", label, detail: error };
  }
  if (dataDate && gameDate && gameDate !== dataDate) {
    return { tone: "stale", label: i18n.t("plate.stale", { ns: "shell" }), dataDate, gameDate };
  }
  if (dataDate) return { tone: "live", label: i18n.t("plate.live", { ns: "shell" }) };
  return { tone: "idle", label: i18n.t("plate.idle", { ns: "shell" }) };
}
