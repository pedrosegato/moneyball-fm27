import { Accordion as AccordionPrimitive } from "@base-ui/react/accordion";
import { useTranslation } from "react-i18next";
import { AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { cn } from "@/lib/utils";
import type { FilterTable } from "@/store/filters";
import type { FilterData } from "../lib/editor";
import type { FilterTarget } from "../lib/targets";
import { FilterColumnRow } from "./FilterColumnRow";

interface FilterGroupProps {
  id: string;
  label: string;
  targets: readonly FilterTarget[];
  active: ReadonlySet<string>;
  table: FilterTable;
  data: FilterData;
}

export function FilterGroup({ id, label, targets, active, table, data }: FilterGroupProps) {
  const { t } = useTranslation("filters");
  const activeTargets = targets.filter((target) => active.has(target.col));
  const count = activeTargets.length;
  return (
    <AccordionItem value={id}>
      <AccordionTrigger className={cn(count > 0 && "text-fg")}>
        <span className="flex items-center gap-2">
          {label}
          {count > 0 && (
            <span className="rounded-full bg-signal-wash px-1.5 type-caption text-fg tabular-nums">
              {t("panel.active", { count })}
            </span>
          )}
        </span>
      </AccordionTrigger>
      <AccordionContent>
        <AccordionPrimitive.Root multiple defaultValue={activeTargets.map((target) => target.col)}>
          {targets.map((target) => (
            <FilterColumnRow key={target.col} table={table} target={target} data={data} />
          ))}
        </AccordionPrimitive.Root>
      </AccordionContent>
    </AccordionItem>
  );
}
