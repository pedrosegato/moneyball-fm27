import { Star } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAppStore } from "@/store/index";
import type { SelectionContext } from "../lib/selectionActions";
import { folderBlock, inFolder, toggleFolder } from "../lib/shortlistFolders";
import { ActionButton } from "./ActionButton";
import { ShortlistFolderMenu } from "./ShortlistFolderMenu";

export function ShortlistAction({ players }: SelectionContext) {
  const { t } = useTranslation("table");
  const folders = useAppStore((s) => s.shortlist.folders);
  if (folders.length > 1) return <ShortlistFolderMenu folders={folders} players={players} />;
  const folder = folders[0];
  const all = inFolder(folder, players) === players.length;
  return (
    <ActionButton
      icon={Star}
      label={t("page.shortlist", { ns: "common" })}
      hint={
        all
          ? t("action.inShortlist")
          : t("action.toShortlist", { players: t("players", { ns: "common", count: players.length }) })
      }
      blocked={all ? null : folderBlock(folder, players)}
      pressed={all}
      onClick={() => toggleFolder(folder, players)}
    />
  );
}
