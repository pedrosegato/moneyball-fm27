import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { dataBounds } from "@/lib/histogram";
import { RangeFilterBody } from "./RangeFilterBody";
import { sliderScale } from "./rangeScale";

export interface NumberRange {
  min: number;
  max: number;
}

export interface RangeFilterProps {
  values: Float64Array;
  distribution?: Float64Array;
  distributionLabel?: string;
  min?: number;
  max?: number;
  onChange: (range: NumberRange) => void;
}

export function RangeFilter({ values, distribution, distributionLabel, min, max, onChange }: RangeFilterProps) {
  const { t } = useTranslation();
  const bounds = useMemo(() => dataBounds(values), [values]);
  const spread = useMemo(() => (distribution ? dataBounds(distribution) : null), [distribution]);
  const scale = useMemo(
    () => (spread && bounds ? sliderScale(spread, bounds, min, max) : bounds),
    [spread, bounds, min, max],
  );
  if (!bounds || !scale) return <p className="py-4 text-center text-fg-muted">{t("range.empty")}</p>;
  return (
    <RangeFilterBody
      values={values}
      distribution={spread ? distribution : undefined}
      distributionLabel={distributionLabel}
      bounds={bounds}
      scale={scale}
      min={min}
      max={max}
      onChange={onChange}
    />
  );
}
