import { Menu as MenuPrimitive } from "@base-ui/react/menu";
import { Ellipsis, Funnel } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TableColumn } from "@/table/columns/types";
import { HEADER_SLOT } from "@/table/lib/tableModel";
import { filtersText } from "../lib/filtersText";
import type { HeaderMenuHandle } from "../lib/headerMenuHandle";

interface HeaderMenuButtonProps {
  handle: HeaderMenuHandle;
  column: TableColumn;
  filtered: boolean;
  side: "start" | "end";
  tabIndex: number;
}

export function HeaderMenuButton({ handle, column, filtered, side, tabIndex }: HeaderMenuButtonProps) {
  const Icon = filtered ? Funnel : Ellipsis;
  return (
    <MenuPrimitive.Trigger
      handle={handle}
      payload={column.id}
      data-header-slot={HEADER_SLOT.menu}
      tabIndex={tabIndex}
      aria-label={filtersText(filtered ? "menu.triggerFiltered" : "menu.trigger", { abbr: column.abbr })}
      className={cn(
        "absolute bottom-1.5 grid size-5 place-items-center rounded-sm bg-surface-canvas outline-none hover:bg-surface-hover hover:text-fg focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring data-popup-open:bg-surface-hover data-popup-open:opacity-100",
        side === "start" ? "left-0" : "right-0",
        filtered ? "text-signal-text" : "text-fg-muted opacity-0 group-hover/header:opacity-100",
      )}
    >
      <Icon aria-hidden className="size-3.5" />
    </MenuPrimitive.Trigger>
  );
}
