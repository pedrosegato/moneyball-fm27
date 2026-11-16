import { ChevronLeft } from "lucide-react";
import type { RefObject } from "react";
import { useTranslation } from "react-i18next";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { appStore } from "@/store/index";

interface CollapseToggleProps {
  collapsed: boolean;
  controls: string;
  ref: RefObject<HTMLButtonElement | null>;
}

export function CollapseToggle({ collapsed, controls, ref }: CollapseToggleProps) {
  const { t } = useTranslation("shell");
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            ref={ref}
            type="button"
            aria-label={t("sidebar.label")}
            aria-expanded={!collapsed}
            aria-controls={controls}
            onClick={() => appStore.getState().toggleSidebar()}
            className="absolute top-[calc(var(--topbar-height)/2)] right-0 z-10 grid size-5 translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-line bg-surface-canvas text-fg-muted shadow-sm transition-[background-color,color,scale] duration-(--duration-press) ease-out focus-ring after:absolute after:-inset-1 hover:bg-surface-hover hover:text-fg active:scale-(--motion-press-scale)"
          />
        }
      >
        <ChevronLeft
          className="size-3 transition-transform duration-(--duration-panel) ease-out group-data-[collapsed=true]/rail:rotate-180 motion-reduce:transition-none"
          aria-hidden
        />
      </TooltipTrigger>
      <TooltipContent side="right">{collapsed ? t("sidebar.expand") : t("sidebar.collapse")}</TooltipContent>
    </Tooltip>
  );
}
