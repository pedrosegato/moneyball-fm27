import { VALUE_MODE, type ValueMode } from "@/store/ui";
import type { ExportValue, TableColumn } from "../columns/types";
import { tableText } from "./tableText";

const SEPARATOR = ";";
const BOM = String.fromCharCode(0xfeff);
const NEEDS_QUOTES = /[;"\r\n]/;
const FORMULA_START = /^[=+\-@\t\r]/;
const DECIMALS = 4;

function numberField(v: number): string {
  const rounded = Math.round(v * 10 ** DECIMALS) / 10 ** DECIMALS;
  return String(rounded === 0 ? 0 : rounded).replace(".", ",");
}

function textField(s: string): string {
  const safe = FORMULA_START.test(s) ? `'${s}` : s;
  return NEEDS_QUOTES.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe;
}

function field(v: ExportValue): string {
  if (v === null) return "";
  return typeof v === "number" ? (Number.isFinite(v) ? numberField(v) : "") : textField(v);
}

const headerOf = (column: TableColumn, header: string, primary: boolean, mode: ValueMode) =>
  mode === VALUE_MODE.percentile && column.kind === "chip" && primary
    ? tableText("csv.percentile", { header })
    : header;

export function toCsv(rows: Uint32Array, columns: readonly TableColumn[], mode: ValueMode): string {
  const fields = columns.flatMap((column) => column.exports.map((f, k) => ({ column, primary: k === 0, ...f })));
  const lines = [fields.map((f) => textField(headerOf(f.column, f.header, f.primary, mode))).join(SEPARATOR)];
  for (const i of rows) lines.push(fields.map((f) => field(f.get(i, mode))).join(SEPARATOR));
  return `${BOM}${lines.join("\r\n")}\r\n`;
}

export function downloadCsv(csv: string, fileName: string): void {
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
