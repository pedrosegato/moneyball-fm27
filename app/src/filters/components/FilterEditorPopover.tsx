import { useState } from "react";
import { Popover, PopoverContent } from "@/components/ui/popover";
import type { EditorRequest, FilterData } from "../lib/editor";
import { FilterEditorBody } from "./FilterEditorBody";

interface FilterEditorPopoverProps {
  request: EditorRequest | null;
  data: FilterData;
  onClose(): void;
}

const POINTER_CLOSES: ReadonlySet<string> = new Set(["mouse", "touch", "pen"]);

export function FilterEditorPopover({ request, data, onClose }: FilterEditorPopoverProps) {
  const [shown, setShown] = useState(request);
  if (request && request !== shown) setShown(request);
  const finalFocus = (closeType: string) => {
    if (POINTER_CLOSES.has(closeType)) return false;
    const back = shown?.returnFocus;
    return back?.isConnected ? back : true;
  };
  return (
    <Popover open={request !== null} onOpenChange={(open) => !open && onClose()}>
      {shown && (
        <PopoverContent
          anchor={shown.anchor}
          side="bottom"
          align="start"
          className="w-80"
          finalFocus={finalFocus}
          data-instant={shown.instant ? "" : undefined}
        >
          <FilterEditorBody request={shown} data={data} onClose={onClose} />
        </PopoverContent>
      )}
    </Popover>
  );
}
