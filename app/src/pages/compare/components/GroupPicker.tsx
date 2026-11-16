import { ChevronDown } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { GROUP_LABELS } from "@/engine/data/groups";
import { POS_GROUPS, type PosGroup } from "@/engine/positions";

export function GroupPicker({ group, onChange }: { group: PosGroup; onChange(group: PosGroup): void }) {
  const { t } = useTranslation("compare");
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="outline" size="sm" aria-label={t("stats.groupLabel", { group: GROUP_LABELS[group] })}>
            {t("stats.group", { group: GROUP_LABELS[group] })}
            <ChevronDown data-icon="inline-end" className="text-fg-faint" />
          </Button>
        }
      />
      <DropdownMenuContent align="start" className="w-48">
        <DropdownMenuRadioGroup value={group} onValueChange={(g) => onChange(g as PosGroup)}>
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
