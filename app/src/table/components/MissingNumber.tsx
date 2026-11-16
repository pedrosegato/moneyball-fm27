import { type MissingReason, missingText } from "@/components/missing";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { EMPTY_VALUE } from "@/lib/constants";
import { tableText } from "../lib/tableText";

export function MissingNumber({ label, reason }: { label: string; reason: MissingReason }) {
  const why = missingText(reason);
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span>
            <span aria-hidden="true">{EMPTY_VALUE}</span>
            <span className="sr-only">{tableText("cell.missing", { label, reason: why })}</span>
          </span>
        }
      />
      <TooltipContent>{why}</TooltipContent>
    </Tooltip>
  );
}
