import { compareNatural } from "@/lib/text";

export function textRank(n: number, text: (i: number) => string | null): () => Float64Array {
  let rank: Float64Array | null = null;
  return () => {
    if (rank) return rank;
    const texts = Array.from({ length: n }, (_, i) => text(i));
    const order = Array.from(texts.keys()).filter((i) => texts[i]);
    order.sort((a, b) => compareNatural(texts[a] ?? "", texts[b] ?? ""));
    rank = new Float64Array(n).fill(NaN);
    for (let k = 0; k < order.length; k++) rank[order[k]] = k;
    return rank;
  };
}

export function sortRows(rows: Uint32Array, key: ArrayLike<number>, desc: boolean): Uint32Array {
  const present: number[] = [];
  const missing: number[] = [];
  for (let k = 0; k < rows.length; k++) (Number.isNaN(key[rows[k]]) ? missing : present).push(k);
  const keys = Float64Array.from(present, (k) => key[rows[k]]);
  const order = Uint32Array.from(present.keys());
  const sign = desc ? -1 : 1;
  order.sort((a, b) => sign * (keys[a] - keys[b]) || a - b);
  const out = new Uint32Array(rows.length);
  let at = 0;
  for (let p = 0; p < order.length; p++) out[at++] = rows[present[order[p]]];
  for (const k of missing) out[at++] = rows[k];
  return out;
}
