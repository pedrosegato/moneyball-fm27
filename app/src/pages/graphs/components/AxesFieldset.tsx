import { ArrowLeftRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import type { ChipColumn } from "@/table/columns/types";
import type { AxisPair } from "../lib/scatter";
import { AxisPicker } from "./AxisPicker";

interface AxesFieldsetProps {
  options: readonly ChipColumn[];
  pair: AxisPair;
  xColumn: ChipColumn;
  yColumn: ChipColumn;
  onChange(pair: AxisPair): void;
}

export function AxesFieldset({ options, pair, xColumn, yColumn, onChange }: AxesFieldsetProps) {
  const { t } = useTranslation("graphs");
  return (
    <fieldset aria-label={t("toolbar.axes")} className="flex items-center gap-1">
      <AxisPicker name="X" options={options} value={xColumn} onChange={(id) => onChange({ x: id, y: pair.y })} />
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={t("toolbar.swap")}
        title={t("toolbar.swap")}
        onClick={() => onChange({ x: pair.y, y: pair.x })}
      >
        <ArrowLeftRight />
      </Button>
      <AxisPicker name="Y" options={options} value={yColumn} onChange={(id) => onChange({ x: pair.x, y: id })} />
    </fieldset>
  );
}
