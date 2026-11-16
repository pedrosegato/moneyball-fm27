import type { ReactNode } from "react";
import { PageToolbar } from "@/components/PageToolbar";
import { ValueModeControl } from "@/components/ValueModeControl";
import type { ValueMode } from "@/store/ui";
import type { ChipColumn } from "@/table/columns/types";
import type { PlotAxes } from "../hooks/useGraphAxes";
import type { AxisPair } from "../lib/scatter";
import { AxesFieldset } from "./AxesFieldset";

interface GraphsToolbarProps {
  options: readonly ChipColumn[];
  pair: AxisPair;
  axes: PlotAxes;
  onAxesChange(pair: AxisPair): void;
  mode: ValueMode;
  onModeChange(mode: ValueMode): void;
  filterBar: ReactNode;
  filtersPanel: ReactNode;
}

export function GraphsToolbar({
  options,
  pair,
  axes,
  onAxesChange,
  mode,
  onModeChange,
  filterBar,
  filtersPanel,
}: GraphsToolbarProps) {
  return (
    <PageToolbar className="gap-x-3 gap-y-1">
      <AxesFieldset
        options={options}
        pair={pair}
        xColumn={axes.xColumn}
        yColumn={axes.yColumn}
        onChange={onAxesChange}
      />
      {filterBar}
      <div className="ml-auto flex h-8 items-center gap-2">
        <ValueModeControl mode={mode} onChange={onModeChange} />
        {filtersPanel}
      </div>
    </PageToolbar>
  );
}
