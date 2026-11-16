import { ChevronDown, Star } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { PlayerRecord } from "@/data/types";
import type { ShortlistFolder } from "@/store/shortlist";
import { folderBlock, inFolder, toggleFolder } from "../lib/shortlistFolders";

interface ShortlistFolderMenuProps {
  folders: readonly ShortlistFolder[];
  players: readonly PlayerRecord[];
}

export function ShortlistFolderMenu({ folders, players }: ShortlistFolderMenuProps) {
  const { t } = useTranslation("table");
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" size="sm" />}>
        <Star data-icon="inline-start" />
        {t("page.shortlist", { ns: "common" })}
        <ChevronDown data-icon="inline-end" className="text-fg-faint" />
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="start" className="w-60">
        <DropdownMenuGroup>
          <DropdownMenuLabel>{t("action.toFolder")}</DropdownMenuLabel>
          {folders.map((f) => {
            const held = inFolder(f, players);
            const blocked = held === players.length ? null : folderBlock(f, players);
            return (
              <DropdownMenuCheckboxItem
                key={f.id}
                checked={held === players.length}
                disabled={!!blocked}
                onCheckedChange={() => toggleFolder(f, players)}
              >
                <span className="min-w-0 flex-1 truncate">{f.name}</span>
                {held > 0 && held < players.length && (
                  <span className="type-caption tabular-nums text-fg-muted">
                    {t("action.heldOf", { held, total: players.length })}
                  </span>
                )}
                {blocked && <span className="type-caption text-fg-muted">{t("action.folderFull")}</span>}
              </DropdownMenuCheckboxItem>
            );
          })}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
