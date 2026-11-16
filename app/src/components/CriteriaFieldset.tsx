import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

interface CriteriaFieldsetProps {
  title: string;
  changed: boolean;
  onRestore(): void;
  children: ReactNode;
}

export function CriteriaFieldset({ title, changed, onRestore, children }: CriteriaFieldsetProps) {
  const { t } = useTranslation();
  return (
    <fieldset
      aria-label={title}
      className="flex flex-col gap-1.5 [&>[data-threshold]]:justify-between [&_[data-slot=input-group]]:w-30 [&_input]:flex-1"
    >
      <p className="type-heading text-fg">{title}</p>
      {children}
      {changed && (
        <Button variant="outline" size="xs" className="mt-1 self-start" onClick={onRestore}>
          {t("restoreDefaults")}
        </Button>
      )}
    </fieldset>
  );
}
