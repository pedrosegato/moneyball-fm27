import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { type RoleId, roleById } from "@/engine/roles/catalog";
import { roles } from "@/i18n/pt-BR/roles";
import { useAppStore } from "@/store/index";
import { roleOptionGroups } from "../lib/roleOptions";

const GROUPS = roleOptionGroups();

export function RolePicker() {
  const { t } = useTranslation("table");
  const [open, setOpen] = useState(false);
  const role = useAppStore((s) => s.ui.role);
  const setRole = useAppStore((s) => s.setRole);
  const picked = role ? roleById(role) : undefined;
  const current = picked
    ? picked.phase === "oop"
      ? t("roleCaption", { name: picked.name, phase: roles.phase.oop })
      : picked.name
    : t("rolePicker.best");
  const choose = (id: RoleId | null) => {
    setOpen(false);
    setRole(id);
  };
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            aria-label={t("rolePicker.trigger", { value: current })}
            title={current}
            className="max-w-64"
          >
            <span aria-hidden className="text-fg-muted">
              {t("rolePicker.prefix")}
            </span>
            <span className="min-w-0 truncate">{current}</span>
            <ChevronDown data-icon="inline-end" className="text-fg-faint" />
          </Button>
        }
      />
      <PopoverContent align="start" className="w-80 p-0">
        <Command>
          <CommandInput placeholder={t("rolePicker.search")} aria-label={t("rolePicker.search")} />
          <CommandList>
            <CommandEmpty>{t("rolePicker.empty")}</CommandEmpty>
            <CommandItem value={t("rolePicker.best")} data-checked={role === null} onSelect={() => choose(null)}>
              {t("rolePicker.best")}
            </CommandItem>
            {GROUPS.map((g) => (
              <CommandGroup key={g.key} heading={g.heading}>
                {g.items.map((o) => (
                  <CommandItem key={o.id} value={o.search} data-checked={o.id === role} onSelect={() => choose(o.id)}>
                    <span className="min-w-0 truncate">{o.name}</span>
                    <span className="ml-auto shrink-0 text-fg-muted">{o.positions}</span>
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
