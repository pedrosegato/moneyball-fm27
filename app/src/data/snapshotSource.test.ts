import fs from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createSnapshotSource } from "./snapshotSource";
import type { PlayerRecord, Snapshot } from "./types";

const PLAYER_RECORD_KEYS = [
  "uid",
  "name",
  "pos",
  "position",
  "age",
  "dob",
  "nat",
  "nation",
  "club",
  "club_uid",
  "owner",
  "owner_uid",
  "division",
  "team",
  "owner_team",
  "wage",
  "contract_end",
  "value",
  "height",
  "foot",
  "ca",
  "pa",
  "attrs",
  "personality",
  "season",
  "record",
  "keeper",
  "partial_detail",
] as const satisfies readonly (keyof PlayerRecord)[];

const FIXTURE = path.resolve(import.meta.dirname, "../../../.dev-data/snapshots/2026-11-11-raw-competitive.json");

afterEach(() => vi.unstubAllGlobals());

function stubFetch(routes: Record<string, unknown>) {
  const fetchMock = vi.fn(async (url: string) =>
    url in routes ? new Response(JSON.stringify(routes[url]), { status: 200 }) : new Response("nope", { status: 404 }),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("snapshotSource", () => {
  const snapshot = {
    build: "B1",
    scope: "competitive",
    date: "2026-11-11",
    my_clubs: [{ name: "MFC", uid: 1 }],
    seconds: 1,
    players: [],
  };

  it("loads players and status from dev routes", async () => {
    const fetchMock = stubFetch({
      "/__dev/snapshot": snapshot,
      "/__dev/status": { ok: true, build: "B1", date: "2026-11-11", busy: false },
    });
    const source = createSnapshotSource();
    const progress = vi.fn();

    expect(await source.status()).toEqual({ ok: true, build: "B1", date: "2026-11-11", busy: false });
    expect(await source.loadPlayers("league", true, progress)).toEqual(snapshot);
    expect(progress).toHaveBeenCalledWith({ phase: "read", done: 1, total: 1 });
    expect(await source.myClubs()).toEqual([{ name: "MFC", uid: 1 }]);
    expect(await source.finances()).toBeNull();
    expect(fetchMock.mock.calls.filter(([u]) => u === "/__dev/snapshot")).toHaveLength(1);
  });

  it("surfaces a missing snapshot as an error", async () => {
    stubFetch({});
    await expect(createSnapshotSource().loadPlayers("all", false)).rejects.toThrow("404");
  });
});

describe.skipIf(!fs.existsSync(FIXTURE))("tauri types", () => {
  it("tauri types match fixture keys", () => {
    const snap = JSON.parse(fs.readFileSync(FIXTURE, "utf8")) as Snapshot;
    const player = snap.players[0];
    expect(Object.keys(player).sort()).toEqual([...PLAYER_RECORD_KEYS].sort());
    const withSeason = snap.players.find((p) => p.season && p.keeper) ?? player;
    if (withSeason.season) expect(Object.keys(withSeason.season)).toHaveLength(14);
  });
});
