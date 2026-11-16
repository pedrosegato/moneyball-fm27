import { Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { StatDef } from "@/engine/stats/catalog";
import { groupByStatGroup } from "@/engine/stats/groups";

interface StatAdderProps {
  options: readonly StatDef[];
  disabled?: boolean;
  onAdd(key: string): void;
}

export function StatAdder({ options, disabled, onAdd }: StatAdderProps) {
  const { t } = useTranslation("settings");
  const [open, setOpen] = useState(false);
  const groups = useMemo(() => groupByStatGroup(options, (d) => d.group), [options]);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button variant="outline" size="sm" disabled={disabled}>
            <Plus data-icon="inline-start" />
            {t("composites.adder.add")}
          </Button>
        }
      />
      <PopoverContent align="start" className="w-80 p-0">
        <Command>
          <CommandInput
            placeholder={t("statSearch.search", { ns: "common" })}
            aria-label={t("composites.adder.searchAria")}
          />
          <CommandList>
            <CommandEmpty>{t("statSearch.empty", { ns: "common" })}</CommandEmpty>
            {groups.map((g) => (
              <CommandGroup key={g.id} heading={g.label}>
                {g.items.map((d) => (
                  <CommandItem
                    key={d.key}
                    value={`${d.key} ${d.abbr} ${d.label}`}
                    onSelect={() => {
                      setOpen(false);
                      onAdd(d.key);
                    }}
                  >
                    <span className="shrink-0 tabular-nums">{d.abbr}</span>
                    {d.label !== d.abbr && <span className="min-w-0 truncate text-fg-muted">{d.label}</span>}
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
