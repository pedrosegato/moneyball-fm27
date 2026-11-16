import { ChevronDown, FolderInput } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { PlayerRecord } from "@/data/types";
import { appStore } from "@/store/index";
import type { ShortlistFolder } from "@/store/shortlist";
import { ActionButton } from "@/table/components/ActionButton";

interface MoveToFolderProps {
  players: readonly PlayerRecord[];
  from: string;
  folders: readonly ShortlistFolder[];
  clear(): void;
}

export function MoveToFolder({ players, from, folders, clear }: MoveToFolderProps) {
  const { t } = useTranslation("cart");
  const others = folders.filter((f) => f.id !== from);
  if (others.length === 0) {
    return (
      <ActionButton
        icon={FolderInput}
        label={t("shortlistPage.moveToFolder")}
        hint=""
        blocked={t("shortlistPage.moveBlocked")}
        onClick={() => {}}
      />
    );
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" size="sm" />}>
        <FolderInput data-icon="inline-start" />
        {t("shortlistPage.moveToFolder")}
        <ChevronDown data-icon="inline-end" className="text-fg-faint" />
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="start" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel>{t("shortlistPage.moveTo")}</DropdownMenuLabel>
          {others.map((f) => (
            <DropdownMenuItem
              key={f.id}
              onClick={() => {
                appStore.getState().moveToFolder(
                  players.map((p) => p.uid),
                  from,
                  f.id,
                );
                clear();
              }}
            >
              <span className="truncate">{f.name}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
