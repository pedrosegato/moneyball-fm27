import { ChevronDown } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useShallow } from "zustand/react/shallow";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { POS_GROUPS } from "@/engine/positions";
import type { FilterTable } from "@/store/filters";
import { useAppStore } from "@/store/index";
import { POSITION_COLUMN } from "@/table/positionPreset";
import {
  POSITION_READING,
  type PositionChoice,
  positionFilter,
  positionReadingOf,
  positionText,
} from "./positionChoice";

export function PositionFilter({ table }: { table: FilterTable }) {
  const { t } = useTranslation("filters");
  const { filters, setFilter, removeFilter } = useAppStore(
    useShallow((s) => ({ filters: s.filters[table], setFilter: s.setFilter, removeFilter: s.removeFilter })),
  );
  const reading = positionReadingOf(filters);
  const choose = (value: string) => {
    if (value === POSITION_READING.all) removeFilter(table, POSITION_COLUMN);
    else setFilter(table, positionFilter(value as PositionChoice));
  };
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="outline">
            {t("position.trigger", { position: positionText(reading) })}
            <ChevronDown data-icon="inline-end" className="text-fg-faint" />
          </Button>
        }
      />
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuRadioGroup value={reading} onValueChange={choose}>
          <DropdownMenuRadioItem value={POSITION_READING.all} closeOnClick>
            {t("position.all")}
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value={POSITION_READING.outfield} closeOnClick>
            {t("position.outfieldLong")}
          </DropdownMenuRadioItem>
          <DropdownMenuSeparator />
          {POS_GROUPS.map((g) => (
            <DropdownMenuRadioItem key={g} value={g} closeOnClick>
              {positionText(g)}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
