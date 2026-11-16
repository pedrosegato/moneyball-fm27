import { ChevronDown, LoaderCircle } from "lucide-react";
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
import { usePeriodPending } from "@/store/useData";

export function PeriodFilter() {
  const { t } = useTranslation("filters");
  const snapshot = useAppStore((s) => s.data.snapshot);
  const period = useAppStore((s) => s.ui.period);
  const setPeriod = useAppStore((s) => s.setPeriod);
  const pending = usePeriodPending();
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
          <Button variant="outline" title={t("period.hint")} aria-busy={pending}>
            {t("period.trigger", { period: label(period) })}
            <span data-icon="inline-end" className="grid *:col-start-1 *:row-start-1">
              <ChevronDown data-busy-hide={pending || undefined} className="text-fg-faint" />
              {pending && <LoaderCircle data-busy-spin className="text-fg-muted" />}
            </span>
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
