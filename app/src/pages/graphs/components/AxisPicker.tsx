import { useTranslation } from "react-i18next";
import type { ChipColumn } from "@/table/columns/types";
import { StatPicker } from "@/table/StatPicker";

interface AxisPickerProps {
  name: "X" | "Y";
  options: readonly ChipColumn[];
  value: ChipColumn;
  onChange(id: string): void;
}

export function AxisPicker({ name, options, value, onChange }: AxisPickerProps) {
  const { t } = useTranslation("graphs");
  return (
    <StatPicker
      prefix={name}
      name={t("axis.name", { name })}
      searchLabel={t("axis.search", { name })}
      options={options}
      value={value}
      onChange={onChange}
    />
  );
}
