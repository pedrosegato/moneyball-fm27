import { useState } from "react";

export function visibleRows(candidates: ArrayLike<number>, visible: Uint8Array | null): Uint32Array {
  const out = new Uint32Array(candidates.length);
  let n = 0;
  for (let k = 0; k < candidates.length; k++) {
    const i = candidates[k];
    if (visible && !visible[i]) continue;
    out[n++] = i;
  }
  return out.subarray(0, n);
}

export const currentMask = (mask: Uint8Array | null | undefined, count: number): Uint8Array | null =>
  mask?.length === count ? mask : null;

export function indicesOf(listed: ArrayLike<number>, uids: Uint32Array): Uint32Array {
  const at = new Map<number, number>();
  for (let i = 0; i < uids.length; i++) at.set(uids[i], i);
  const out: number[] = [];
  for (let k = 0; k < listed.length; k++) {
    const i = at.get(listed[k]);
    if (i !== undefined) out.push(i);
  }
  return Uint32Array.from(out);
}

function sameRows(a: Uint32Array, b: Uint32Array): boolean {
  if (a.length !== b.length) return false;
  for (let k = 0; k < a.length; k++) if (a[k] !== b[k]) return false;
  return true;
}

export function useStableRows(rows: Uint32Array): Uint32Array {
  const [kept, setKept] = useState(rows);
  if (kept === rows || sameRows(kept, rows)) return kept;
  setKept(rows);
  return rows;
}
