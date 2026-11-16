import { useTranslation } from "react-i18next";
import { perWagePeriod, rateText } from "@/lib/money";
import { useGameMoney } from "@/store/index";
import { Row } from "./Row";
import { Section } from "./Section";

export function GameCurrency() {
  const { t } = useTranslation("settings");
  const money = useGameMoney();
  return (
    <Section title={t("currency.title")}>
      <Row
        label={t("currency.label")}
        description={money ? t("currency.hintRead", { rate: rateText(money) }) : t("currency.hintUnread")}
      >
        <span className="type-label text-fg-secondary">
          {money
            ? t("currency.value", { name: money.name, symbol: money.symbol, wage: perWagePeriod(money) })
            : t("currency.unread")}
        </span>
      </Row>
    </Section>
  );
}
