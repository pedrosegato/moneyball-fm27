import { useTranslation } from "react-i18next";
import type { Axis } from "../lib/scatter";

export function AxisDirection({ where, axis }: { where: string; axis: Axis }) {
  const { t } = useTranslation("graphs");
  return (
    <>
      {t(axis.lowerIsBetter ? "howToRead.less" : "howToRead.more", { where, abbr: axis.abbr })}
      <span className="text-fg-muted"> ({axis.label})</span>
    </>
  );
}
