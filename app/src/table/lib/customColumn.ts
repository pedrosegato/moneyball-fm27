import { COLUMN_GROUP } from "../columns/ids";
import type { CustomColumn } from "../columns/types";

export type CustomColumnSpec = Omit<CustomColumn, "kind" | "group" | "local" | "descFirst"> & { descFirst?: boolean };

export function customColumn({ descFirst = false, ...spec }: CustomColumnSpec): CustomColumn {
  return { ...spec, kind: "custom", group: COLUMN_GROUP.identity, local: true, descFirst: () => descFirst };
}
