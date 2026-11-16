import { describe, expect, it } from "vitest";
import type { Snapshot } from "@/data/types";
import { type AnalysisInput, DEFAULT_ENGINE_SETTINGS } from "./analysis/input";
import { createEngineClient, type EngineTransport, SupersededError } from "./client";
import { POS_NAMES } from "./positions";
import { createEngineSession, type EngineRequest, type EngineResponse } from "./session";
import { playerRecord, snapshotOf } from "./testing/records";

const ST = POS_NAMES.map((name) => (name === "ST" ? 20 : 1));
const range = (n: number, from = 1) => Array.from({ length: n }, (_, k) => from + k);
const list = (a: ArrayLike<number>) => Array.from(a);

const strikers = (n: number) =>
  snapshotOf(range(n).map((k) => playerRecord({ pos: ST, minutes: k % 2 ? 1000 : 500, season: { goals: k } })));
const pooled = (r: { pool: Uint8Array }) => r.pool.reduce((n, v) => n + v, 0);

function fakeWorker() {
  const session = createEngineSession();
  const requests: EngineRequest[] = [];
  const queue: EngineRequest[] = [];
  let respond: (response: EngineResponse) => void = () => {};
  let fail: (error: Error) => void = () => {};
  let terminated = false;
  const transport: EngineTransport = {
    post(request) {
      const copy = structuredClone(request);
      requests.push(copy);
      queue.push(copy);
    },
    listen(onResponse, onFailure) {
      respond = onResponse;
      fail = onFailure;
    },
    terminate() {
      terminated = true;
    },
  };
  async function deliver() {
    while (queue.length) {
      const { response, transfer } = session.handle(queue.shift()!);
      respond(structuredClone(response, { transfer }));
      await Promise.resolve();
    }
  }
  const analyses = () => requests.filter((r) => r.type === "analyze");
  return { transport, requests, analyses, deliver, crash: (e: Error) => fail(e), terminated: () => terminated };
}

const inputFor = (snapshot: Snapshot, poolMinutes = 900): AnalysisInput => ({
  snapshot,
  composites: [],
  myClubUid: null,
  settings: { ...DEFAULT_ENGINE_SETTINGS, poolMinutes },
});

async function settled<T>(worker: ReturnType<typeof fakeWorker>, pending: Promise<T>): Promise<T> {
  await worker.deliver();
  return pending;
}

describe("engine client", () => {
  it("sends a snapshot once and merges its cached columns into later results", async () => {
    const worker = fakeWorker();
    const client = createEngineClient(worker.transport);
    const snapshot = strikers(40);
    const first = await settled(worker, client.analyze(inputFor(snapshot)));
    const wide = await settled(worker, client.analyze(inputFor(snapshot, 300)));
    expect(worker.analyses().map((r) => r.type === "analyze" && r.snapshot !== undefined)).toEqual([true, false]);
    expect([pooled(first), pooled(wide)]).toEqual([20, 40]);
    expect(list(wide.cols["G/90"])).toEqual(list(first.cols["G/90"]));
    expect(list(wide.uids)).toEqual(snapshot.players.map((r) => r.uid));
  });

  it("sends a snapshot again once its build or date changed, or as a new object", async () => {
    const worker = fakeWorker();
    const client = createEngineClient(worker.transport);
    const snapshot = strikers(30);
    await settled(worker, client.analyze(inputFor(snapshot)));
    await settled(worker, client.analyze(inputFor(snapshot)));
    snapshot.date = "2026-11-12";
    await settled(worker, client.analyze(inputFor(snapshot)));
    await settled(worker, client.analyze(inputFor({ ...snapshot })));
    const sent = worker.analyses().map((r) => (r.type === "analyze" ? [r.snapshotId, r.snapshot !== undefined] : null));
    expect(sent).toEqual([
      [1, true],
      [1, false],
      [2, true],
      [3, true],
    ]);
  });

  it("filters in the worker against the analyzed snapshot", async () => {
    const worker = fakeWorker();
    const client = createEngineClient(worker.transport);
    await settled(worker, client.analyze(inputFor(strikers(30))));
    const mask = await settled(worker, client.filter([{ col: "minutes", kind: "range", min: 900 }]));
    expect(list(mask)).toEqual(range(30).map((k) => k % 2));
  });

  it("a newer analysis replaces one still waiting for the worker", async () => {
    const worker = fakeWorker();
    const client = createEngineClient(worker.transport);
    const snapshot = strikers(40);
    const running = client.analyze(inputFor(snapshot));
    const waiting = client.analyze(inputFor(snapshot, 300));
    const latest = client.analyze(inputFor(snapshot, 1000));
    await expect(waiting).rejects.toBeInstanceOf(SupersededError);
    await worker.deliver();
    expect([pooled(await running), pooled(await latest)]).toEqual([20, 20]);
    expect(worker.analyses()).toHaveLength(2);

    expect([(await running).seq, (await latest).seq]).toEqual([1, 3]);
  });

  it("a filter queued behind a new snapshot's analysis filters that snapshot", async () => {
    const worker = fakeWorker();
    const client = createEngineClient(worker.transport);
    const running = client.analyze(inputFor(strikers(30)));
    const next = client.analyze(inputFor(strikers(36)));
    const mask = client.filter([]);
    await worker.deliver();
    await Promise.all([running, next]);
    expect(await mask).toHaveLength(36);
  });

  it("rejects with the worker's error, and the next analysis still works without resending", async () => {
    const worker = fakeWorker();
    const client = createEngineClient(worker.transport);
    const snapshot = strikers(30);
    await settled(worker, client.analyze(inputFor(snapshot)));
    const bad = {
      ...inputFor(snapshot),
      composites: [{ id: "x", label: "x", kind: "weightedSum" as const, weights: { nope: 1 } }],
    };
    await expect(settled(worker, client.analyze(bad))).rejects.toThrow(/nope/);
    expect(pooled(await settled(worker, client.analyze(inputFor(snapshot, 300))))).toBe(30);
    expect(worker.analyses().map((r) => r.type === "analyze" && r.snapshot !== undefined)).toEqual([
      true,
      false,
      false,
    ]);
  });

  it("gets a new snapshot's columns with its first analysis that succeeds", async () => {
    const worker = fakeWorker();
    const client = createEngineClient(worker.transport);
    const snapshot = strikers(30);
    const bad = {
      ...inputFor(snapshot),
      composites: [{ id: "x", label: "x", kind: "weightedSum" as const, weights: { nope: 1 } }],
    };
    await expect(settled(worker, client.analyze(bad))).rejects.toThrow(/nope/);
    const result = await settled(worker, client.analyze(inputFor(snapshot)));
    expect(result.uids).toHaveLength(30);
    expect(worker.analyses().map((r) => r.type === "analyze" && r.snapshot !== undefined)).toEqual([true, false]);
  });

  it("resends the snapshot when the worker could not keep it", async () => {
    const worker = fakeWorker();
    const client = createEngineClient(worker.transport);
    const snapshot = strikers(20);
    const good = snapshot.players[0];
    snapshot.players[0] = { ...good, pos: null as unknown as number[] };
    await expect(settled(worker, client.analyze(inputFor(snapshot)))).rejects.toThrow();
    snapshot.players[0] = good;
    await settled(worker, client.analyze(inputFor(snapshot)));
    expect(worker.analyses().map((r) => r.type === "analyze" && r.snapshot !== undefined)).toEqual([true, true]);
  });

  it("filtering before any analysis rejects", async () => {
    const client = createEngineClient(fakeWorker().transport);
    await expect(client.filter([])).rejects.toThrow(/analy/);
  });

  it("a worker crash rejects every pending and later call", async () => {
    const worker = fakeWorker();
    const client = createEngineClient(worker.transport);
    const snapshot = strikers(20);
    const running = client.analyze(inputFor(snapshot));
    const queued = client.filter([]);
    worker.crash(new Error("worker script failed"));
    await expect(running).rejects.toThrow("worker script failed");
    await expect(queued).rejects.toThrow("worker script failed");
    await expect(client.analyze(inputFor(snapshot))).rejects.toThrow("worker script failed");
  });

  it("dispose terminates the worker and rejects what is pending", async () => {
    const worker = fakeWorker();
    const client = createEngineClient(worker.transport);
    const running = client.analyze(inputFor(strikers(20)));
    client.dispose();
    await expect(running).rejects.toThrow(/disposed/);
    expect(worker.terminated()).toBe(true);
  });
});
