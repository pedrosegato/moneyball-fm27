import { formatCount } from "@/lib/format";

export function Count({ n }: { n: number }) {
  return <span className="tabular-nums text-fg-faint">{formatCount(n)}</span>;
}
