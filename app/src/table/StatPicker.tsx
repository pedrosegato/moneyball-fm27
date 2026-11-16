import { ChevronDown } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { TableColumn } from "./columns/types";
import { columnGroups } from "./lib/columnActions";

export type StatOption = Pick<TableColumn, "id" | "abbr" | "label" | "group">;

interface StatPickerProps {
  prefix: string;
  name: string;
  searchLabel: string;
  options: readonly StatOption[];
  value: StatOption;
  onChange(id: string): void;
}

export function StatPicker({ prefix, name, searchLabel, options, value, onChange }: StatPickerProps) {
  const { t } = useTranslation("table");
  const [open, setOpen] = useState(false);
  const groups = useMemo(
    () =>
      columnGroups()
        .map((g) => ({ ...g, items: options.filter((c) => c.group === g.id) }))
        .filter((g) => g.items.length),
    [options],
  );
  const full = value.label === value.abbr ? value.abbr : t("statPicker.full", { abbr: value.abbr, label: value.label });
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            aria-label={t("statPicker.trigger", { name, value: full })}
            title={value.label}
            className="max-w-56"
          >
            <span aria-hidden className="text-fg-muted">
              {prefix}
            </span>
            <span className="min-w-0 truncate tabular-nums">{value.abbr}</span>
            <ChevronDown data-icon="inline-end" className="text-fg-faint" />
          </Button>
        }
      />
      <PopoverContent align="start" className="w-80 p-0">
        <Command>
          <CommandInput placeholder={t("statSearch.search", { ns: "common" })} aria-label={searchLabel} />
          <CommandList>
            <CommandEmpty>{t("statSearch.empty", { ns: "common" })}</CommandEmpty>
            {groups.map((g) => (
              <CommandGroup key={g.id} heading={g.label}>
                {g.items.map((c) => (
                  <CommandItem
                    key={c.id}
                    value={`${c.id} ${c.abbr} ${c.label}`}
                    data-checked={c.id === value.id}
                    onSelect={() => {
                      setOpen(false);
                      onChange(c.id);
                    }}
                  >
                    <span className="shrink-0 tabular-nums">{c.abbr}</span>
                    {c.label !== c.abbr && <span className="min-w-0 truncate text-fg-muted">{c.label}</span>}
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
