import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import type { Composite } from "@/engine/composites";
import { goToComposite } from "./links";

interface FormActionsProps {
  value: Composite;
  problem: string | null;
  restorable: boolean;
  onCreate?(c: Composite): void;
  onRestore?(): void;
  onDelete?(): void;
}

export function FormActions({ value, problem, restorable, onCreate, onRestore, onDelete }: FormActionsProps) {
  const { t } = useTranslation("settings");
  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-line-subtle pt-4">
      {onCreate && (
        <>
          <Button disabled={problem !== null} onClick={() => onCreate(value)}>
            {t("composites.form.create")}
          </Button>
          <Button variant="ghost" onClick={() => goToComposite(undefined)}>
            {t("cancel", { ns: "common" })}
          </Button>
        </>
      )}
      {onRestore && (
        <Button variant="outline" disabled={!restorable} onClick={onRestore}>
          {t("restoreDefault")}
        </Button>
      )}
      {onDelete && (
        <Button variant="ghost" className="ml-auto text-destructive hover:text-destructive" onClick={onDelete}>
          {t("composites.form.delete")}
        </Button>
      )}
    </div>
  );
}
