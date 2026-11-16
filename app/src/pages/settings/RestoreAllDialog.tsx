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
import { appStore } from "@/store/index";
import { defaultSettings } from "@/store/settings";

interface RestoreAllDialogProps {
  open: boolean;
  onOpenChange(open: boolean): void;
}

function restoreAllDefaults() {
  const s = appStore.getState();
  s.updateSettings({ ...defaultSettings(), scope: s.settings.scope });
  s.resetCompositePresets();
}

export function RestoreAllDialog({ open, onOpenChange }: RestoreAllDialogProps) {
  const { t } = useTranslation("settings");
  const { t: common } = useTranslation();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("restoreAll.dialogTitle")}</DialogTitle>
          <DialogDescription>{t("restoreAll.dialogBody")}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>{common("cancel")}</DialogClose>
          <Button
            variant="destructive"
            onClick={() => {
              restoreAllDefaults();
              onOpenChange(false);
            }}
          >
            {common("restoreDefaults")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
