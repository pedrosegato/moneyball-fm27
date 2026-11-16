import { Star } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useShallow } from "zustand/react/shallow";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/index";
import { PRESSED } from "../lib/pressed";
import { ShortlistMenu } from "./ShortlistMenu";

export function ShortlistToggle({ uid }: { uid: number }) {
  const { t } = useTranslation("player");
  const { folders, toggleShortlist } = useAppStore(
    useShallow((s) => ({ folders: s.shortlist.folders, toggleShortlist: s.toggleShortlist })),
  );
  const inAny = folders.some((f) => f.uids.includes(uid));
  const icon = <Star data-icon="inline-start" className={cn(inAny && "fill-current")} />;
  if (folders.length > 1) {
    return (
      <ShortlistMenu
        uid={uid}
        folders={folders}
        inAny={inAny}
        icon={icon}
        onToggle={(folderId) => toggleShortlist(uid, folderId)}
      />
    );
  }
  return (
    <Button variant="outline" aria-pressed={inAny} className={PRESSED} onClick={() => toggleShortlist(uid)}>
      {icon}
      {t("page.shortlist", { ns: "common" })}
    </Button>
  );
}
