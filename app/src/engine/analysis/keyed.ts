import type { CellValue, Columns } from "../universe";

export function byKey<T>(keys: readonly string[], values: readonly T[]): Record<string, T> {
  return Object.fromEntries(keys.map((k, j) => [k, values[j]]));
}

export function withNumbers(cols: Columns, numbers: Readonly<Record<string, ArrayLike<number>>>): Columns {
  const out: Record<string, (i: number) => CellValue> = { ...cols };
  for (const [id, values] of Object.entries(numbers)) {
    if (Object.hasOwn(cols, id)) throw new Error(`column "${id}" is defined twice`);
    out[id] = (i) => values[i];
  }
  return out;
}
