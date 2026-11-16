import { Accordion as AccordionPrimitive } from "@base-ui/react/accordion";
import { ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { AccordionContent } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import type { FilterTable } from "@/store/filters";
import { useTableFilter } from "../hooks/useTableFilter";
import type { FilterData } from "../lib/editor";
import { filterSummary } from "../lib/filterLabels";
import type { FilterTarget } from "../lib/targets";
import { ColumnFilterEditor } from "./ColumnFilterEditor";

interface FilterColumnRowProps {
  table: FilterTable;
  target: FilterTarget;
  data: FilterData;
}

export function FilterColumnRow({ table, target, data }: FilterColumnRowProps) {
  const { t } = useTranslation("filters");
  const [filter, setFilter] = useTableFilter(table, target.col);
  const { column } = target;
  return (
    <AccordionPrimitive.Item value={target.col} className="border-b border-line-subtle last:border-b-0">
      <AccordionPrimitive.Header className="flex">
        <AccordionPrimitive.Trigger className="group/column flex min-w-0 flex-1 items-center gap-2 rounded-md py-1.5 text-left hover:text-fg focus-ring">
          <ChevronRight
            aria-hidden
            className="size-3.5 shrink-0 text-fg-faint transition-[rotate] duration-(--duration-quick) ease-out group-aria-expanded/column:rotate-90 motion-reduce:transition-none"
          />
          <span className="w-20 shrink-0 truncate type-label text-fg tabular-nums">
            {column.abbr}
            {target.percentile && <span className="text-fg-muted"> {t("pct")}</span>}
          </span>
          <span className="min-w-0 flex-1 truncate type-caption text-fg-muted" title={column.label}>
            {filter ? (
              <span className="text-signal-text">{filterSummary(filter, target)}</span>
            ) : (
              column.label !== column.abbr && column.label
            )}
          </span>
        </AccordionPrimitive.Trigger>
      </AccordionPrimitive.Header>
      <AccordionContent className="pt-1 pl-5">
        <div className="flex flex-col gap-2">
          <ColumnFilterEditor target={target} filter={filter} data={data} onChange={setFilter} />
          {filter && (
            <Button variant="ghost" size="xs" className="self-start text-fg-muted" onClick={() => setFilter(null)}>
              {t("removeFilter")}
            </Button>
          )}
        </div>
      </AccordionContent>
    </AccordionPrimitive.Item>
  );
}
