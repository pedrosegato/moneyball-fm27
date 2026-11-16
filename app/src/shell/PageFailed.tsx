import { TriangleAlert } from "lucide-react";
import { useTranslation } from "react-i18next";
import { PageEmpty } from "@/components/PageEmpty";
import { Button } from "@/components/ui/button";

export function PageFailed({ onRetry }: { onRetry(): void }) {
  const { t } = useTranslation("shell");
  return (
    <PageEmpty
      icon={TriangleAlert}
      title={t("pageFailed.title")}
      description={t("pageFailed.description")}
      action={<Button onClick={onRetry}>{t("pageFailed.retry")}</Button>}
    />
  );
}
