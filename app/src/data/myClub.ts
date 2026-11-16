import type { ClubRef, Snapshot } from "./types";

export function myClub(snapshot: Snapshot): ClubRef | null {
  return snapshot.my_clubs.find((c) => c.uid !== null) ?? null;
}

export function myClubUid(snapshot: Snapshot): number | null {
  return myClub(snapshot)?.uid ?? null;
}
