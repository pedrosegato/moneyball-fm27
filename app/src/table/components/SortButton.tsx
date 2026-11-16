import { ArrowDown, ArrowUp } from "lucide-react";
import { StatTip } from "@/components/StatTip";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { COLUMN_GROUP } from "../columns/ids";
import type { TableColumn } from "../columns/types";
import { menuRoom, type Sorted } from "../lib/header";
import { HEADER_SLOT, type TableHeader } from "../lib/tableModel";

interface SortButtonProps {
  header: TableHeader;
  column: TableColumn;
  isName: boolean;
  end: boolean;
  sorted: Sorted;
  filtered: boolean;
  tabbable: boolean;
}

export function SortButton({ header, column, isName, end, sorted, filtered, tabbable }: SortButtonProps) {
  const SortIcon = sorted === "asc" ? ArrowUp : ArrowDown;
  const unit = column.kind === "chip" && column.group !== COLUMN_GROUP.composites ? column.def.unit : undefined;
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            data-header-slot={HEADER_SLOT.sort}
            tabIndex={tabbable ? 0 : -1}
            onClick={header.column.getToggleSortingHandler()}
            className={cn(
              "flex h-full w-full min-w-0 items-end rounded-sm pb-1.5 focus-ring",
              isName ? "px-3" : "px-2",
              end ? "justify-end text-right" : "justify-start text-left",
              menuRoom(end, filtered),
              sorted ? "text-fg" : "text-fg-muted hover:text-fg",
            )}
          />
        }
      >
        <span className="inline-flex max-w-full items-center gap-0.5 type-label">
          {sorted && end && <SortIcon aria-hidden className="size-3 shrink-0" />}
          <span className="truncate">{column.abbr}</span>
          {sorted && !end && <SortIcon aria-hidden className="size-3 shrink-0" />}
        </span>
      </TooltipTrigger>
      <TooltipContent>
        <StatTip label={column.label} description={column.description} unit={unit} />
      </TooltipContent>
    </Tooltip>
  );
}
