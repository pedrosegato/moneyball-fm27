import { Users } from "lucide-react";
import { useTranslation } from "react-i18next";
import { PageEmpty } from "@/components/PageEmpty";
import { Button } from "@/components/ui/button";

export function ClubMissing({ onReload }: { onReload(): void }) {
  const { t } = useTranslation("elenco");
  return (
    <PageEmpty
      icon={Users}
      title={t("clubMissing.title")}
      description={t("clubMissing.description")}
      action={<Button onClick={onReload}>{t("clubMissing.reload")}</Button>}
    />
  );
}
