import { useTranslation } from "react-i18next";
import { formatCount } from "@/lib/format";

export function PlayerCount({ listed, of }: { listed: number; of: number }) {
  const { t } = useTranslation("table");
  return (
    <p role="status" className="type-label leading-8 whitespace-nowrap text-fg-muted">
      <span className="text-fg tabular-nums">{formatCount(listed)}</span>
      {listed !== of && <span className="tabular-nums"> {t("view.of", { total: of })}</span>}{" "}
      {listed === 1 && listed === of ? t("view.player") : t("view.players")}
    </p>
  );
}
