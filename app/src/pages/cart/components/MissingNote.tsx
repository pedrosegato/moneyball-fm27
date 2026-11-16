import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

interface MissingNoteProps {
  text: string;
  action: string;
  onAction(): void;
}

export function MissingNote({ text, action, onAction }: MissingNoteProps) {
  const { t } = useTranslation("cart");
  return (
    <div
      role="status"
      aria-label={t("missingNote")}
      className="flex min-h-10 shrink-0 items-center gap-3 border-b border-line-subtle px-4 py-1.5 type-label text-fg-muted"
    >
      <span className="min-w-0 [overflow-wrap:anywhere]">{text}</span>
      <Button variant="outline" size="xs" className="shrink-0" onClick={onAction}>
        {action}
      </Button>
    </div>
  );
}
