import { Collapsible } from "@base-ui/react/collapsible";
import { ChevronDown, CircleHelp } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

export function HowToReadToggle() {
  const { t } = useTranslation("graphs");
  return (
    <Collapsible.Trigger
      render={
        <Button variant="ghost" size="sm" className="group/how text-fg-muted">
          <CircleHelp data-icon="inline-start" />
          {t("howToRead.title")}
          <ChevronDown
            data-icon="inline-end"
            className="text-fg-faint transition-[rotate] duration-(--duration-quick) ease-out group-aria-expanded/how:rotate-180 motion-reduce:transition-none"
          />
        </Button>
      }
    />
  );
}
