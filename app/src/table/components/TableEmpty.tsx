import { useTranslation } from "react-i18next";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";

export interface EmptyAction {
  label: string;
  onClick(): void;
}

const QUOTED = 40;

const quoted = (query: string) => (query.length > QUOTED ? `${query.slice(0, QUOTED).trimEnd()}…` : query);

interface TableEmptyProps {
  query: string | null;
  description: string;
  ways: readonly EmptyAction[];
}

export function TableEmpty({ query, description, ways }: TableEmptyProps) {
  const { t } = useTranslation("table");
  return (
    <EmptyState
      title={t("empty.title")}
      description={query === null ? description : t("empty.search", { query: quoted(query) })}
      action={
        ways.length > 0 &&
        ways.map(({ label, onClick }, k) => (
          <Button key={label} variant={k === 0 ? "default" : "outline"} onClick={onClick}>
            {label}
          </Button>
        ))
      }
    />
  );
}
