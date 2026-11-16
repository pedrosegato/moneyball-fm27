import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

export function MedianMarks({ className }: { className?: string }) {
  const { t } = useTranslation("player");
  return (
    <>
      <span className={cn("absolute left-1/2 -translate-x-1/2", className)}>{t("scale.median")}</span>
      <span className={cn("absolute left-[95%] -translate-x-1/2 whitespace-nowrap", className)}>{t("scale.top")}</span>
    </>
  );
}
