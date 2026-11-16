import { vi } from "vitest";
import type { DataSource } from "@/data/source";
import type { GameStatus, Snapshot } from "@/data/types";
import type { AnalysisInput } from "@/engine/analysis/input";
import { createEngineClient, type EngineClient, type SequencedAnalysis } from "@/engine/client";
import { CURRENT_SEASON } from "@/engine/period";
import { createEngineSession, type EngineResponse } from "@/engine/session";
import { playerRecord, snapshotOf } from "@/engine/testing/records";
import type { FilterSpec } from "@/engine/universe";

export function testSnapshot(parts: Partial<Omit<Snapshot, "players">> = {}): Snapshot {
  return snapshotOf([playerRecord({ name: "Matheus Ribeiro", club: "MFC", club_uid: 301344 })], {
    build: "6AE8CF77-17969000",
    date: "2026-10-30",
    my_clubs: [{ name: "MFC", uid: 301344 }],
    ...parts,
  });
}

export function fakeSource(snapshot: Snapshot = testSnapshot()) {
  let onDate: ((date: string) => void) | null = null;
  let status: GameStatus = {
    ok: true,
    pid: 4321,
    build: snapshot.build,
    build_known: true,
    date: snapshot.date ?? undefined,
  };
  const source = {
    status: vi.fn(async (): Promise<GameStatus> => status),
    loadPlayers: vi.fn<DataSource["loadPlayers"]>(async () => snapshot),
    myClubs: async () => snapshot.my_clubs,
    finances: vi.fn<DataSource["finances"]>(async () => null),
    onGameDate(cb: (date: string) => void) {
      onDate = cb;
      return () => {
        onDate = null;
      };
    },
    setPollSeconds: vi.fn(async (_seconds: number) => {}),
  } satisfies DataSource;
  return {
    source,
    emitGameDate: (date: string) => onDate?.(date),
    setStatus: (next: GameStatus) => {
      status = next;
    },
  };
}

interface Call {
  input: AnalysisInput;
  seq: number;
  resolve(extra?: Partial<SequencedAnalysis>): void;
  reject(error: Error): void;
}

interface FilterCall {
  filters: readonly FilterSpec[];
  resolve(mask: Uint8Array): void;
  reject(error: Error): void;
}

export function fakeEngine() {
  const calls: Call[] = [];
  const filters: FilterCall[] = [];
  let seq = 0;
  const client: EngineClient = {
    analyze: (input) =>
      new Promise((resolve, reject) => {
        const s = ++seq;
        const result = (extra: Partial<SequencedAnalysis>) =>
          ({ seq: s, composites: {}, period: input.period ?? CURRENT_SEASON, ...extra }) as SequencedAnalysis;
        calls.push({ input, seq: s, resolve: (extra = {}) => resolve(result(extra)), reject });
      }),
    filter: (list) => new Promise((resolve, reject) => filters.push({ filters: list, resolve, reject })),
    dispose: vi.fn(),
  };
  return { client, calls, filters };
}

export function instantEngine(): EngineClient {
  const session = createEngineSession();
  let respond: (response: EngineResponse) => void = () => {};
  return createEngineClient({
    post: (request) => queueMicrotask(() => respond(session.handle(request).response)),
    listen: (onResponse) => {
      respond = onResponse;
    },
    terminate: () => {},
  });
}
