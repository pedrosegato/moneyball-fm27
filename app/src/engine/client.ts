import type { Snapshot } from "@/data/types";
import type { AnalysisInput } from "./analysis/input";
import type { SnapshotAnalysis } from "./analysis/prepare";
import type { AnalysisResult } from "./index";
import type { EngineRequest, EngineResponse } from "./session";
import type { FilterSpec } from "./universe";

export interface EngineTransport {
  post(request: EngineRequest): void;
  listen(onResponse: (response: EngineResponse) => void, onFailure: (error: Error) => void): void;
  terminate(): void;
}

export type SequencedAnalysis = AnalysisResult & {
  seq: number;
};

export interface EngineClient {
  analyze(input: AnalysisInput): Promise<SequencedAnalysis>;
  filter(filters: readonly FilterSpec[]): Promise<Uint8Array>;
  dispose(): void;
}

export class SupersededError extends Error {
  override name = "SupersededError";
}

export function workerTransport(): EngineTransport {
  const worker = new Worker(new URL("./worker.ts", import.meta.url), { type: "module" });
  return {
    post: (request) => worker.postMessage(request),
    listen(onResponse, onFailure) {
      worker.onmessage = (e: MessageEvent<EngineResponse>) => onResponse(e.data);
      worker.onerror = (e) => {
        e.preventDefault();
        onFailure(new Error(e.message || "engine worker failed"));
      };
      worker.onmessageerror = () => onFailure(new Error("engine worker sent a message that could not be read"));
    },
    terminate: () => worker.terminate(),
  };
}

type Job =
  | {
      type: "analyze";
      input: AnalysisInput;
      seq: number;
      resolve: (r: SequencedAnalysis) => void;
      reject: (e: Error) => void;
    }
  | { type: "filter"; filters: readonly FilterSpec[]; resolve: (mask: Uint8Array) => void; reject: (e: Error) => void };

const readOf = (s: Snapshot) => `${s.build}|${s.scope}|${s.date}|${s.players.length}`;

export function createEngineClient(transport: EngineTransport = workerTransport()): EngineClient {
  const waiting: Job[] = [];
  const sent = new Map<number, { job: Job; snapshotId: number }>();
  let analyzing = false;
  let nextId = 1;
  let nextSeq = 1;
  let nextSnapshotId = 1;
  let workerSnapshot: { snapshot: Snapshot; read: string; id: number } | null = null;
  let snapshotPart: { id: number; part: SnapshotAnalysis } | null = null;
  let broken: Error | null = null;

  function send(job: Job): void {
    const id = nextId++;
    let request: EngineRequest;
    if (job.type === "analyze") {
      const { snapshot, ...input } = job.input;
      const read = readOf(snapshot);
      const held = workerSnapshot?.snapshot === snapshot && workerSnapshot.read === read ? workerSnapshot : null;
      workerSnapshot = held ?? { snapshot, read, id: nextSnapshotId++ };
      request = { id, type: "analyze", snapshotId: workerSnapshot.id, snapshot: held ? undefined : snapshot, input };
      analyzing = true;
    } else {
      if (!workerSnapshot) {
        job.reject(new Error("analyze a snapshot before filtering it"));
        return;
      }
      request = { id, type: "filter", snapshotId: workerSnapshot.id, filters: job.filters };
    }
    sent.set(id, { job, snapshotId: request.snapshotId });
    try {
      transport.post(request);
    } catch (e) {
      sent.delete(id);
      if (job.type === "analyze") {
        analyzing = false;
        workerSnapshot = null;
      }
      job.reject(e instanceof Error ? e : new Error(String(e)));
    }
  }

  function flush(): void {
    while (waiting.length && !(waiting[0].type === "analyze" && analyzing)) {
      const job = waiting.shift();
      if (job) send(job);
    }
  }

  function enqueue(job: Job): void {
    if (broken) {
      job.reject(broken);
      return;
    }
    const replaced = job.type === "analyze" ? waiting.findIndex((j) => j.type === "analyze") : -1;
    if (replaced >= 0) {
      waiting[replaced].reject(new SupersededError("a newer analysis replaced this one"));
      waiting[replaced] = job;
    } else waiting.push(job);
    flush();
  }

  function settle(response: EngineResponse): void {
    const entry = sent.get(response.id);
    if (!entry) return;
    sent.delete(response.id);
    const { job, snapshotId } = entry;
    if (job.type === "analyze") analyzing = false;
    if (!response.ok) {
      if (job.type === "analyze" && response.loaded !== workerSnapshot?.id) workerSnapshot = null;
      job.reject(new Error(response.error));
    } else if (job.type === "filter" && response.type === "filter") job.resolve(response.mask);
    else if (job.type === "analyze" && response.type === "analyze") {
      if (response.snapshot) snapshotPart = { id: snapshotId, part: response.snapshot };
      if (snapshotPart?.id !== snapshotId) job.reject(new Error(`no columns for snapshot ${snapshotId}`));
      else job.resolve({ ...snapshotPart.part, ...response.analysis, seq: job.seq });
    }
    flush();
  }

  function fail(error: Error): void {
    broken = error;
    analyzing = false;
    workerSnapshot = null;
    snapshotPart = null;
    const pending = [...[...sent.values()].map((e) => e.job), ...waiting];
    sent.clear();
    waiting.length = 0;
    for (const job of pending) job.reject(error);
  }

  transport.listen(settle, fail);

  return {
    analyze(input) {
      const seq = nextSeq++;
      return new Promise((resolve, reject) => enqueue({ type: "analyze", input, seq, resolve, reject }));
    },
    filter: (filters) => new Promise((resolve, reject) => enqueue({ type: "filter", filters, resolve, reject })),
    dispose() {
      transport.terminate();
      fail(new Error("engine client disposed"));
    },
  };
}
