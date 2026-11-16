import { useTranslation } from "react-i18next";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import type { StatLine } from "../lib/profile";
import { StatList } from "./StatList";

interface AllStatsProps {
  lines: readonly StatLine[];
  keeper: boolean;
  against: string;
}

export function AllStats({ lines, keeper, against }: AllStatsProps) {
  const { t } = useTranslation("player");
  return (
    <div className="border-t border-line-subtle px-4">
      <Accordion>
        <AccordionItem value="all">
          <AccordionTrigger>{t("section.allStats")}</AccordionTrigger>
          <AccordionContent>
            <StatList lines={lines} keeper={keeper} against={against} />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
