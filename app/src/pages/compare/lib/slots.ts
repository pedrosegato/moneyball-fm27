export function assignSlots(uids: readonly number[], previous: ReadonlyMap<number, number>): Map<number, number> {
  const taken = new Set<number>();
  for (const uid of uids) {
    const slot = previous.get(uid);
    if (slot !== undefined) taken.add(slot);
  }
  const next = new Map<number, number>();
  let free = 0;
  for (const uid of uids) {
    if (next.has(uid)) continue;
    const kept = previous.get(uid);
    if (kept !== undefined) {
      next.set(uid, kept);
      continue;
    }
    while (taken.has(free)) free++;
    next.set(uid, free);
    taken.add(free);
  }
  return next;
}
