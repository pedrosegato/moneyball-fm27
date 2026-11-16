import { ArrowLeftRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useShallow } from "zustand/react/shallow";
import { Button } from "@/components/ui/button";
import { TOAST_ID } from "@/lib/constants";
import { useAppStore } from "@/store/index";
import { MAX_COMPARE } from "@/store/ui";
import { PRESSED } from "../lib/pressed";

export function CompareToggle({ uid }: { uid: number }) {
  const { t } = useTranslation("player");
  const { compare, toggleCompare } = useAppStore(
    useShallow((s) => ({ compare: s.ui.compare, toggleCompare: s.toggleCompare })),
  );
  const listed = compare.includes(uid);
  const onClick = () => {
    if (!listed && compare.length >= MAX_COMPARE) {
      toast.info(t("actions.compareFull", { max: MAX_COMPARE }), { id: TOAST_ID.compareFull });
      return;
    }
    toggleCompare(uid);
  };
  return (
    <Button variant="outline" aria-pressed={listed} className={PRESSED} onClick={onClick}>
      <ArrowLeftRight data-icon="inline-start" />
      {t("page.comparar", { ns: "common" })}
    </Button>
  );
}
