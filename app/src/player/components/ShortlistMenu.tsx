import type { ReactNode } from "react";
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
import { cn } from "@/lib/utils";
import type { ShortlistFolder } from "@/store/shortlist";
import { PRESSED_LOOK } from "../lib/pressed";

interface ShortlistMenuProps {
  uid: number;
  folders: readonly ShortlistFolder[];
  inAny: boolean;
  icon: ReactNode;
  onToggle(folderId: string): void;
}

export function ShortlistMenu({ uid, folders, inAny, icon, onToggle }: ShortlistMenuProps) {
  const { t } = useTranslation("player");
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" className={cn(inAny && PRESSED_LOOK)} />}>
        {icon}
        {t("page.shortlist", { ns: "common" })}
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="start">
        <DropdownMenuGroup>
          <DropdownMenuLabel>{t("folders", { ns: "common" })}</DropdownMenuLabel>
          {folders.map((f) => (
            <DropdownMenuCheckboxItem key={f.id} checked={f.uids.includes(uid)} onCheckedChange={() => onToggle(f.id)}>
              <span className="truncate">{f.name}</span>
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
