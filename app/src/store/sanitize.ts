import { isRecord } from "@/lib/guards";

export const CLUB_UID = /^[1-9]\d{0,14}$/;

export const fieldsOf = (v: unknown): Record<string, unknown> => (isRecord(v) ? v : {});

export function finiteIn(v: unknown, min: number, max: number): number | null {
  return typeof v === "number" && Number.isFinite(v) && v >= min && v <= max ? v : null;
}

export function oneOf<T extends string>(v: unknown, options: readonly T[]): T | null {
  return typeof v === "string" && (options as readonly string[]).includes(v) ? (v as T) : null;
}

export function text(v: unknown, maxLength: number): string | null {
  return typeof v === "string" && v.length > 0 && v.length <= maxLength ? v : null;
}

export const positiveInt = (v: unknown): number | null =>
  typeof v === "number" && Number.isSafeInteger(v) && v > 0 ? v : null;

export function listOf<T>(v: unknown, item: (raw: unknown) => T | null, max: number): T[] {
  if (!Array.isArray(v)) return [];
  const out: T[] = [];
  for (const raw of v) {
    if (out.length >= max) break;
    const value = item(raw);
    if (value !== null) out.push(value);
  }
  return out;
}

export function uniqueBy<T>(items: readonly T[], key: (item: T) => unknown): T[] {
  const seen = new Set<unknown>();
  return items.filter((item) => {
    const k = key(item);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

const RESERVED_KEYS = new Set(["__proto__", "constructor", "prototype"]);

export function recordOf<T>(v: unknown, value: (raw: unknown, key: string) => T | null, max = 500): Record<string, T> {
  const out: Record<string, T> = {};
  let count = 0;
  for (const [key, raw] of Object.entries(fieldsOf(v))) {
    if (count >= max) break;
    if (RESERVED_KEYS.has(key)) continue;
    const restored = value(raw, key);
    if (restored === null) continue;
    out[key] = restored;
    count++;
  }
  return out;
}
