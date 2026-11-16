import { Ellipsis } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatCount } from "@/lib/format";
import type { ShortlistFolder } from "@/store/shortlist";

const ITEM =
  "flex h-[1.875rem] min-w-0 flex-1 items-center gap-2 rounded-lg px-2.5 text-left text-fg-secondary focus-ring hover:bg-surface-hover hover:text-fg aria-[current=true]:bg-surface-active aria-[current=true]:text-fg";

interface FolderItemProps {
  folder: ShortlistFolder;
  current: boolean;
  last: boolean;
  onSelect(): void;
  onRename(): void;
  onDelete(): void;
}

export function FolderItem({ folder, current, last, onSelect, onRename, onDelete }: FolderItemProps) {
  const { t } = useTranslation(["cart", "common"]);
  const count = folder.uids.length;
  return (
    <>
      <button
        type="button"
        aria-current={current ? "true" : undefined}
        aria-label={t("folders.item", { name: folder.name, players: t("common:players", { count }) })}
        title={folder.name}
        className={ITEM}
        onClick={onSelect}
      >
        <span className="min-w-0 flex-1 truncate">{folder.name}</span>
        <span className="type-caption tabular-nums text-fg-muted">{formatCount(count)}</span>
      </button>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label={t("folders.actions", { name: folder.name })}
              className="text-fg-faint group-hover/folder:text-fg-muted aria-expanded:text-fg"
            />
          }
        >
          <Ellipsis />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-44">
          <DropdownMenuItem onClick={onRename}>{t("folders.renameAction")}</DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            disabled={last}
            title={last ? t("folders.lastFolder") : undefined}
            onClick={onDelete}
          >
            {t("folders.delete")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
