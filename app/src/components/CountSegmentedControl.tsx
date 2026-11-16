import { useTranslation } from "react-i18next";
import { Count } from "./Count";
import { SegmentedControl, type SegmentedControlProps } from "./SegmentedControl";
import { SegmentedControlItem } from "./SegmentedControlItem";

export interface CountSegment<V extends string> {
  value: V;
  label: string;
  count: number;
  title?: string;
}

export interface CountSegmentAll<V extends string> {
  value: V;
  count: number;
  ariaLabel?: string;
  hideCount?: boolean;
}

export interface CountSegmentedControlProps<V extends string>
  extends Omit<SegmentedControlProps, "value" | "onValueChange" | "children"> {
  value: V;
  onValueChange(value: V): void;
  segments: readonly CountSegment<V>[];
  all?: CountSegmentAll<V>;
}

export function CountSegmentedControl<V extends string>({
  value,
  onValueChange,
  segments,
  all,
  ...props
}: CountSegmentedControlProps<V>) {
  const { t } = useTranslation();
  return (
    <SegmentedControl value={value} onValueChange={(next) => onValueChange(next as V)} {...props}>
      {all && (
        <SegmentedControlItem value={all.value} aria-label={all.ariaLabel ?? `${t("all")} ${all.count}`}>
          {t("all")}
          {!all.hideCount && (
            <>
              {" "}
              <Count n={all.count} />
            </>
          )}
        </SegmentedControlItem>
      )}
      {segments.map((segment) => (
        <SegmentedControlItem
          key={segment.value}
          value={segment.value}
          aria-label={`${segment.label} ${segment.count}`}
          title={segment.title}
        >
          {segment.label} <Count n={segment.count} />
        </SegmentedControlItem>
      ))}
    </SegmentedControl>
  );
}
