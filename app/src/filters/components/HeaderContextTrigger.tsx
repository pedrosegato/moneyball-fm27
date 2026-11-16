import { ContextMenu as ContextMenuPrimitive } from "@base-ui/react/context-menu";
import { type ReactElement, useContext } from "react";
import { COLUMN_CELL } from "@/table/lib/domSelectors";
import { ContextColumn } from "../lib/headerMenu";

export function HeaderContextTrigger({ children }: { children: ReactElement }) {
  const pick = useContext(ContextColumn);
  return (
    <ContextMenuPrimitive.Trigger
      render={children}
      onContextMenu={(e) => {
        const cell = (e.target as HTMLElement).closest<HTMLElement>(COLUMN_CELL);
        if (!pick(cell?.dataset.columnId)) e.preventBaseUIHandler();
      }}
    />
  );
}
