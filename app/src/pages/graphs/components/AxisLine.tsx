import { useTranslation } from "react-i18next";
import { VALUE_MODE } from "@/store/ui";
import { shownValue } from "../lib/plotText";
import type { Axis } from "../lib/scatter";

export function AxisLine({ axis, i }: { axis: Axis; i: number }) {
  const { t } = useTranslation("graphs");
  return (
    <>
      <dt className="text-fg-muted">{axis.abbr}</dt>
      <dd className="text-right">
        <b className="font-[560] text-fg">{shownValue(axis, i, VALUE_MODE.value)}</b>
        <span className="text-fg-muted">
          {" "}
          ({t("tooltip.pct", { value: shownValue(axis, i, VALUE_MODE.percentile) })})
        </span>
      </dd>
    </>
  );
}
