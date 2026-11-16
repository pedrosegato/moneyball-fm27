import type { PlayerRecord } from "@/data/types";
import type { AnalysisResult } from "@/engine/index";
import type { FilterSpec } from "@/engine/universe";
import type { FilterTable } from "@/store/filters";
import type { FilterTarget } from "./targets";

export interface FilterData {
  players: readonly PlayerRecord[];
  analysis: AnalysisResult;
  gameDate: string | null;
}

export interface EditorRequest {
  target: FilterTarget;
  table: FilterTable;
  anchor: Element;
  returnFocus: HTMLElement | null;
  instant: boolean;
}

export interface EditorProps {
  target: FilterTarget;
  filter: FilterSpec | undefined;
  data: FilterData;
  onChange(filter: FilterSpec | null): void;
}

export function rangeValues({ column, percentile }: FilterTarget): Float64Array {
  const values =
    column.kind === "chip" ? (percentile ? column.pct : column.value) : column.kind === "number" ? column.value : [];
  return values instanceof Float64Array ? values : Float64Array.from(values);
}

export const within = (values: Float64Array, mask: Uint8Array): Float64Array =>
  values.map((v, i) => (mask[i] ? v : NaN));

const CONTRACTS = new WeakMap<readonly PlayerRecord[], (string | null)[]>();

export function contractDates(players: readonly PlayerRecord[]): (string | null)[] {
  let dates = CONTRACTS.get(players);
  if (!dates) {
    dates = players.map((r) => r.contract_end);
    CONTRACTS.set(players, dates);
  }
  return dates;
}

export const shownRate = ({ column, percentile }: FilterTarget): number =>
  column.kind === "number" && column.moneyScale && !percentile ? column.moneyScale : 1;

export function inPounds(filter: FilterSpec | null, rate: number): FilterSpec | null {
  if (rate === 1 || filter?.kind !== "range") return filter;
  const { min, max, ...rest } = filter;
  return { ...rest, ...(min != null && { min: min / rate }), ...(max != null && { max: max / rate }) };
}
