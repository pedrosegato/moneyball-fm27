import { Check, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export interface ActionButtonProps {
  icon: LucideIcon;
  label: string;
  hint: string;
  blocked?: string | null;
  pressed?: boolean;
  primary?: boolean;
  onClick(): void;
}

export function ActionButton({
  icon: Icon,
  label,
  hint,
  blocked = null,
  pressed,
  primary,
  onClick,
}: ActionButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant={primary && !pressed && !blocked ? "default" : "ghost"}
            size="sm"
            aria-pressed={pressed}
            disabled={!!blocked}
            focusableWhenDisabled
            aria-description={blocked ?? undefined}
            className="data-disabled:opacity-50 aria-pressed:bg-surface-active aria-pressed:text-fg"
            onClick={onClick}
          />
        }
      >
        {pressed ? <Check data-icon="inline-start" /> : <Icon data-icon="inline-start" />}
        {label}
      </TooltipTrigger>
      <TooltipContent>{blocked ?? hint}</TooltipContent>
    </Tooltip>
  );
}
