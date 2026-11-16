import type { LucideIcon } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { NAV_LABEL } from "./sidebarStyles";

const ITEM =
  "group/item flex items-center rounded-lg border border-transparent text-fg-secondary focus-ring hover:bg-surface-hover hover:text-fg aria-[current=page]:bg-surface-hover aria-[current=page]:text-fg";

interface NavItemProps {
  href: string;
  current: boolean;
  icon: LucideIcon;
  label: string;
  collapsed: boolean;
  onClick?: () => void;
}

export function NavItem({ href, current, icon: Icon, label, collapsed, onClick }: NavItemProps) {
  return (
    <Tooltip disabled={!collapsed}>
      <TooltipTrigger
        render={
          <a
            href={href}
            onClick={onClick}
            aria-current={current ? "page" : undefined}
            className={cn(ITEM, "h-[1.875rem] gap-2.5 px-2", current && "border-line text-fg")}
          >
            <Icon
              className={cn(
                "size-4 shrink-0 text-fg-faint group-hover/item:text-fg-muted",
                current && "text-signal group-hover/item:text-signal",
              )}
              aria-hidden
            />
            <span className={NAV_LABEL}>{label}</span>
          </a>
        }
      />
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}
