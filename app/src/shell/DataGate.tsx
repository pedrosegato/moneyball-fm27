import { TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { PageEmpty } from "@/components/PageEmpty";
import { Button } from "@/components/ui/button";
import { useData, useLoadProgress } from "@/store/useData";
import { LoadingPage } from "./LoadingPage";
import { progressLabel } from "./progress";

export function DataGate({ children }: { children: ReactNode }) {
  const { t } = useTranslation("shell");
  const { snapshot, error, reload } = useData();
  const { loading, progress } = useLoadProgress();
  if (snapshot) return children;
  if (error && !loading) {
    return (
      <PageEmpty
        icon={TriangleAlert}
        title={t("dataGate.title")}
        description={error}
        action={<Button onClick={() => void reload()}>{t("dataGate.retry")}</Button>}
      />
    );
  }
  return <LoadingPage label={progressLabel(progress)} />;
}
