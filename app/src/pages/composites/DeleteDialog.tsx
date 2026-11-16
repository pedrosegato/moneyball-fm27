import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Composite } from "@/engine/composites";
import { appStore } from "@/store/index";
import { goToComposite } from "./links";

interface DeleteDialogProps {
  composite: Composite | null;
  onClose(): void;
}

export function DeleteDialog({ composite, onClose }: DeleteDialogProps) {
  const { t } = useTranslation("settings");
  return (
    <Dialog open={composite !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("composites.deleteDialog.title", { label: composite?.label ?? "" })}</DialogTitle>
          <DialogDescription>{t("composites.deleteDialog.body")}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>{t("cancel", { ns: "common" })}</DialogClose>
          <Button
            variant="destructive"
            onClick={() => {
              if (composite) appStore.getState().removeCustomComposite(composite.id);
              onClose();
              goToComposite(undefined);
            }}
          >
            {t("composites.form.delete")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
