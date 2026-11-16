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
import type { ShortlistFolder } from "@/store/shortlist";

interface DeleteFolderDialogProps {
  folder: ShortlistFolder | null;
  onClose(): void;
  onConfirm(folder: ShortlistFolder): void;
}

export function DeleteFolderDialog({ folder, onClose, onConfirm }: DeleteFolderDialogProps) {
  const { t } = useTranslation("cart");
  return (
    <Dialog open={folder !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("folders.deleteTitle", { name: folder?.name ?? "" })}</DialogTitle>
          <DialogDescription>{folder && t("folders.leaving", { count: folder.uids.length })}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>{t("cancel", { ns: "common" })}</DialogClose>
          <Button variant="destructive" onClick={() => folder && onConfirm(folder)}>
            {t("folders.deleteConfirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
