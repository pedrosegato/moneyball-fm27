import { SlidersVertical } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface CriteriaPopoverProps {
  changed: boolean;
  children: ReactNode;
}

export function CriteriaPopover({ changed, children }: CriteriaPopoverProps) {
  const { t } = useTranslation();
  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button variant="ghost">
            <SlidersVertical data-icon="inline-start" />
            {t("criteria.trigger")}
            {changed && <span className="sr-only">{` ${t("criteria.changed")}`}</span>}
            {changed && <span aria-hidden className="changed-dot" />}
          </Button>
        }
      />
      <PopoverContent align="end" className="w-80 gap-3 p-3">
        {children}
      </PopoverContent>
    </Popover>
  );
}
