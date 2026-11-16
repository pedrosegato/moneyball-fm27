import { useTranslation } from "react-i18next";
import { missingText } from "@/components/missing";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { EMPTY_VALUE } from "@/lib/constants";

export function HiddenUnderPool({ label }: { label: string }) {
  const { t } = useTranslation("player");
  const reason = missingText("pool");
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span className="w-fit font-[560] tabular-nums text-fg">
            <span aria-hidden="true">{EMPTY_VALUE}</span>
            <span className="sr-only">{t("ficha.missing", { what: label, reason })}</span>
          </span>
        }
      />
      <TooltipContent>{reason}</TooltipContent>
    </Tooltip>
  );
}
