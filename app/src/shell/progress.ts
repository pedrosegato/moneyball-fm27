import { i18n } from "@/i18n";
import type { DataProgress } from "@/store/data";

export function progressLabel(progress: DataProgress | null): string {
  switch (progress?.phase) {
    case "scan":
      return i18n.t("progress.scan", { ns: "shell" });
    case "read":
      return progress.total
        ? i18n.t("progress.read", {
            ns: "shell",
            pct: Math.floor((100 * (progress.done ?? 0)) / progress.total),
          })
        : i18n.t("progress.readUnknownTotal", { ns: "shell" });
    case "analyze":
      return i18n.t("progress.analyze", { ns: "shell" });
    default:
      return i18n.t("progress.default", { ns: "shell" });
  }
}
