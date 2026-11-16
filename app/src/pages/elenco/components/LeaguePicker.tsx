import { ChevronDown } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { LeagueFilter } from "@/engine/league";
import { elencoT } from "../lib/elencoT";

const LEAGUE_KINDS = ["myLeagueOrStronger", "myLeague", "top5", "any"] as const satisfies readonly Exclude<
  LeagueFilter["kind"],
  "league"
>[];

const leagueLabel = (f: LeagueFilter) => (f.kind === "league" ? f.key : elencoT(`fitCriteria.leagues.${f.kind}`));

interface LeaguePickerProps {
  value: LeagueFilter;
  onChange(filter: LeagueFilter): void;
}

export function LeaguePicker({ value, onChange }: LeaguePickerProps) {
  const { t } = useTranslation("elenco");
  const label = leagueLabel(value);
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="type-label whitespace-nowrap text-fg-muted">{t("fitCriteria.league")}</span>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="outline"
              size="sm"
              aria-label={t("fitCriteria.leagueLabel", { league: label })}
              className="min-w-0"
            >
              <span className="truncate">{label}</span>
              <ChevronDown data-icon="inline-end" className="text-fg-faint" />
            </Button>
          }
        />
        <DropdownMenuContent align="end" className="w-60">
          <DropdownMenuRadioGroup value={value.kind} onValueChange={(kind) => onChange({ kind } as LeagueFilter)}>
            {LEAGUE_KINDS.map((kind) => (
              <DropdownMenuRadioItem key={kind} value={kind} closeOnClick>
                {t(`fitCriteria.leagues.${kind}`)}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
