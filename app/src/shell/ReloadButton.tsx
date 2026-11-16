import { RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { buttonVariants } from "@/components/ui/button-variants";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface ReloadButtonProps {
  disabled: boolean;
  onReload: () => void;
}

export function ReloadButton({ disabled, onReload }: ReloadButtonProps) {
  const { t } = useTranslation("shell");
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            aria-label={t("status.reload")}
            onClick={disabled ? undefined : onReload}
            aria-disabled={disabled || undefined}
            className={cn(
              buttonVariants({ variant: "ghost", size: "icon" }),
              "text-fg-muted hover:text-fg aria-disabled:cursor-default aria-disabled:hover:bg-transparent aria-disabled:hover:text-fg-muted",
            )}
          />
        }
      >
        <RefreshCw aria-hidden />
      </TooltipTrigger>
      <TooltipContent side="bottom">{t("status.reload")}</TooltipContent>
    </Tooltip>
  );
}
