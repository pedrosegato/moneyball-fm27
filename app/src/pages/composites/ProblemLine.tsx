import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

export function ProblemLine({ problem, isNew }: { problem: string | null; isNew: boolean }) {
  const { t } = useTranslation("settings");
  if (!problem) return null;
  return (
    <p role="status" className={cn("type-label", isNew ? "text-fg-secondary" : "text-destructive")}>
      {isNew
        ? t("composites.form.problemNew", { problem: `${problem.charAt(0).toLowerCase()}${problem.slice(1)}` })
        : t("composites.form.problemKept", { problem })}
    </p>
  );
}
