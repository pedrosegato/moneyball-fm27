import { useId } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { resetLeagueWeights } from "../lib/leagueWeights";

interface LeagueWeightsHeaderProps {
  query: string;
  onQueryChange(query: string): void;
  edited: number;
}

export function LeagueWeightsHeader({ query, onQueryChange, edited }: LeagueWeightsHeaderProps) {
  const { t } = useTranslation("rank");
  const searchId = useId();
  return (
    <SheetHeader className="gap-2 border-b border-line-subtle pr-12">
      <SheetTitle>{t("leagues.title")}</SheetTitle>
      <SheetDescription className="type-caption">{t("leagues.description")}</SheetDescription>
      <div className="flex items-center gap-2">
        <label htmlFor={searchId} className="sr-only">
          {t("leagues.search")}
        </label>
        <Input
          id={searchId}
          type="search"
          placeholder={t("leagues.placeholder")}
          autoComplete="off"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          className="h-7"
        />
        <Button variant="outline" size="sm" disabled={edited === 0} onClick={resetLeagueWeights}>
          {t("leagues.restoreAll")}
        </Button>
      </div>
    </SheetHeader>
  );
}
