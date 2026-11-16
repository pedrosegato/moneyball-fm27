import { ChevronDown } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { GROUP_LABELS } from "@/engine/data/groups";
import { POS_GROUPS, type PosGroup } from "@/engine/positions";
import { ALL } from "@/lib/constants";

interface GroupMenuProps {
  group: PosGroup | null;
  onChange(group: PosGroup | null): void;
}

export function GroupMenu({ group, onChange }: GroupMenuProps) {
  const { t } = useTranslation("rank");
  const groupLabel = group ? GROUP_LABELS[group] : t("allPositions");
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="outline" size="sm" aria-label={t("groupLabel", { group: groupLabel })}>
            {groupLabel}
            <ChevronDown data-icon="inline-end" className="text-fg-faint" />
          </Button>
        }
      />
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuRadioGroup
          value={group ?? ALL}
          onValueChange={(g) => onChange(g === ALL ? null : (g as PosGroup))}
        >
          <DropdownMenuRadioItem value={ALL} closeOnClick>
            {t("allPositions")}
          </DropdownMenuRadioItem>
          <DropdownMenuSeparator />
          {POS_GROUPS.map((g) => (
            <DropdownMenuRadioItem key={g} value={g} closeOnClick>
              {GROUP_LABELS[g]}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
