import { ChevronDown } from "lucide-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  CURRENT_SEASON,
  gamesPeriod,
  isPeriod,
  type Period,
  pastYears,
  RECENT_GAMES,
  readPeriod,
  yearPeriod,
} from "@/engine/period";
import { useAppStore } from "@/store/index";

export function PeriodFilter() {
  const { t } = useTranslation("filters");
  const snapshot = useAppStore((s) => s.data.snapshot);
  const period = useAppStore((s) => s.ui.period);
  const setPeriod = useAppStore((s) => s.setPeriod);
  const years = useMemo(() => (snapshot ? pastYears(snapshot) : []), [snapshot]);
  const label = (p: Period) => {
    const read = readPeriod(p);
    if (read.kind === "games") return t("period.games", { n: read.n });
    if (read.kind === "year") return t("period.year", { year: read.n });
    return t("period.season");
  };
  const choose = (value: string) => {
    if (isPeriod(value)) setPeriod(value);
  };
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="outline" title={t("period.hint")}>
            {t("period.trigger", { period: label(period) })}
            <ChevronDown data-icon="inline-end" className="text-fg-faint" />
          </Button>
        }
      />
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuRadioGroup value={period} onValueChange={choose}>
          <DropdownMenuRadioItem value={CURRENT_SEASON} closeOnClick>
            {label(CURRENT_SEASON)}
          </DropdownMenuRadioItem>
          {RECENT_GAMES.map((n) => (
            <DropdownMenuRadioItem key={n} value={gamesPeriod(n)} closeOnClick>
              {label(gamesPeriod(n))}
            </DropdownMenuRadioItem>
          ))}
          {years.length > 0 && <DropdownMenuSeparator />}
          {years.map((year) => (
            <DropdownMenuRadioItem key={year} value={yearPeriod(year)} closeOnClick>
              {label(yearPeriod(year))}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
