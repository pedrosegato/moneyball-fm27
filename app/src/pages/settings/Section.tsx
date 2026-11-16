import { type ReactNode, useId } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

interface SectionProps {
  title: string;
  onRestore?: () => void;
  children: ReactNode;
}

export function Section({ title, onRestore, children }: SectionProps) {
  const { t } = useTranslation("settings");
  const id = useId();
  return (
    <section aria-labelledby={id} className="flex flex-col border-b border-line-subtle py-5 last:border-b-0">
      <div className="flex h-6 items-center justify-between gap-4">
        <h2 id={id} className="type-heading text-fg">
          {title}
        </h2>
        {onRestore && (
          <Button variant="ghost" size="xs" className="text-fg-muted" onClick={onRestore}>
            {t("restoreDefault")}
          </Button>
        )}
      </div>
      <div className="flex flex-col">{children}</div>
    </section>
  );
}
