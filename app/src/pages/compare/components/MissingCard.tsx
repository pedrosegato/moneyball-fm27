import { X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

export function MissingCard({ onRemove }: { onRemove(): void }) {
  const { t } = useTranslation("compare");
  return (
    <li className="row-span-3 flex min-w-0 flex-col justify-between gap-3 rounded-xl border border-dashed border-line p-3">
      <div className="flex flex-col gap-0.5">
        <h3 className="type-heading text-fg-secondary">{t("missing.title")}</h3>
        <p className="type-caption text-fg-muted">{t("missing.description")}</p>
      </div>
      <Button
        variant="ghost"
        size="sm"
        aria-label={t("missing.remove")}
        className="w-fit text-fg-muted"
        onClick={onRemove}
      >
        <X data-icon="inline-start" />
        {t("remove", { ns: "common" })}
      </Button>
    </li>
  );
}
