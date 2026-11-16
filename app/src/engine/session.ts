import type { Snapshot } from "@/data/types";
import { messageOf } from "@/lib/errors";
import { analysisColumns } from "./analysis/columns";
import { analyzeDisplay, type DisplayAnalysis } from "./analysis/display";
import type { AnalysisInput } from "./analysis/input";
import { type ModelAnalysis, type RoleModel, scoreModel, weighModel } from "./analysis/model";
import { type PreparedSnapshot, prepareSnapshot, type SnapshotAnalysis } from "./analysis/prepare";
import { type RoleAnalysis, viewRoles } from "./analysis/roles";
import { type ScoreAnalysis, scorePlayers } from "./analysis/score";
import { type SquadRoleAnalysis, squadRoles } from "./analysis/squadRoles";
import { poolFlags } from "./club";
import { applyPeriod, CURRENT_SEASON, type Period } from "./period";
import { applyFilters, type Columns, type FilterSpec } from "./universe";

export type AnalysisRequest = Omit<AnalysisInput, "snapshot">;

export type EngineRequest =
  | { id: number; type: "analyze"; snapshotId: number; snapshot?: Snapshot; input: AnalysisRequest }
  | { id: number; type: "filter"; snapshotId: number; filters: readonly FilterSpec[] };

export type EngineResponse =
  | {
      id: number;
      type: "analyze";
      ok: true;
      snapshotId: number;
      snapshot?: SnapshotAnalysis;
      analysis: DisplayAnalysis & ScoreAnalysis & RoleAnalysis & SquadRoleAnalysis & { period: Period };
    }
  | { id: number; type: "filter"; ok: true; mask: Uint8Array }
  | { id: number; type: EngineRequest["type"]; ok: false; error: string; loaded: number | null };

export interface EngineSession {
  handle(request: EngineRequest): { response: EngineResponse; transfer: Transferable[] };
}

function transferableCopy<T>(value: T, transfer: Transferable[]): T {
  if (ArrayBuffer.isView(value)) {
    const copy = (value as unknown as Uint8Array).slice();
    transfer.push(copy.buffer);
    return copy as T;
  }
  if (Array.isArray(value)) return value.map((v) => transferableCopy(v, transfer)) as T;
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, transferableCopy(v, transfer)])) as T;
  }
  return value;
}

interface Loaded {
  id: number;
  snapshot: Snapshot;
  period: Period;
  prepared: PreparedSnapshot;
  delivered: boolean;
}

interface Cached<T> {
  key: string;
  analysis: T;
}

interface PeriodWork {
  prepared: PreparedSnapshot;
  display: Cached<DisplayAnalysis> | null;
  model: Cached<RoleModel> | null;
  weighed: Cached<ModelAnalysis> | null;
  scores: Cached<ScoreAnalysis> | null;
  squad: Cached<SquadRoleAnalysis> | null;
}

const KEPT_PERIODS = 2;

export function createEngineSession(): EngineSession {
  let loaded: Loaded | null = null;
  let display: Cached<DisplayAnalysis> | null = null;
  let model: Cached<RoleModel> | null = null;
  let weighed: Cached<ModelAnalysis> | null = null;
  let scores: Cached<ScoreAnalysis> | null = null;
  let squad: Cached<SquadRoleAnalysis> | null = null;
  let columns: Columns | null = null;
  const kept = new Map<Period, PeriodWork>();

  function switchPeriod(held: Loaded, period: Period) {
    kept.set(held.period, { prepared: held.prepared, display, model, weighed, scores, squad });
    const back = kept.get(period);
    kept.delete(period);
    while (kept.size > KEPT_PERIODS) kept.delete(kept.keys().next().value as Period);
    held.prepared = back?.prepared ?? prepareSnapshot(applyPeriod(held.snapshot, period));
    display = back?.display ?? null;
    model = back?.model ?? null;
    weighed = back?.weighed ?? null;
    scores = back?.scores ?? null;
    squad = back?.squad ?? null;
    columns = null;
    held.period = period;
    held.delivered = false;
  }

  function holding(snapshotId: number): Loaded {
    if (loaded?.id !== snapshotId) throw new Error(`snapshot ${snapshotId} is not loaded`);
    return loaded;
  }

  function analyze({ snapshotId, snapshot, input }: Extract<EngineRequest, { type: "analyze" }>) {
    const period = input.period ?? CURRENT_SEASON;
    if (snapshot) {
      loaded = display = model = weighed = scores = squad = columns = null;
      kept.clear();
      const prepared = prepareSnapshot(applyPeriod(snapshot, period));
      loaded = { id: snapshotId, snapshot, period, prepared, delivered: false };
    }
    const held = holding(snapshotId);
    if (held.period !== period) switchPeriod(held, period);
    const { prepared } = held;
    const { poolMinutes, leagueWeighting } = input.settings;
    const { composites, myClubUid } = input;
    const displayKey = JSON.stringify([poolMinutes, composites]);
    const nextDisplay =
      display?.key === displayKey
        ? display
        : { key: displayKey, analysis: analyzeDisplay(prepared, { poolMinutes, composites }) };
    const modelKey = JSON.stringify([poolMinutes, myClubUid]);
    const nextModel =
      model?.key === modelKey
        ? model
        : {
            key: modelKey,
            analysis: scoreModel(prepared, { poolMinutes, myClubUid }),
          };
    const weighedKey = JSON.stringify([modelKey, leagueWeighting]);
    const nextWeighed =
      weighed?.key === weighedKey
        ? weighed
        : { key: weighedKey, analysis: weighModel(prepared, nextModel.analysis, leagueWeighting) };
    const scoresKey = JSON.stringify([weighedKey, input.settings, input.lineup ?? null]);
    const nextScores =
      scores?.key === scoresKey
        ? scores
        : { key: scoresKey, analysis: scorePlayers(prepared, nextWeighed.analysis, input) };
    const nextSquad =
      squad?.key === weighedKey
        ? squad
        : {
            key: weighedKey,
            analysis: {
              squadRoles: squadRoles(
                prepared.records,
                nextWeighed.analysis.roles,
                myClubUid,
                poolFlags(prepared.records, poolMinutes),
              ),
            },
          };
    const analysis = {
      ...nextDisplay.analysis,
      ...nextScores.analysis,
      ...viewRoles(prepared.records, prepared.groups, nextWeighed.analysis.roles, input.role ?? null),
      ...nextSquad.analysis,
      period,
    };
    [display, model, weighed, scores, squad, columns] = [
      nextDisplay,
      nextModel,
      nextWeighed,
      nextScores,
      nextSquad,
      analysisColumns(prepared, analysis),
    ];
    const first = !held.delivered;
    held.delivered = true;
    return { snapshot: first ? prepared.result : undefined, analysis };
  }

  function filter({ snapshotId, filters }: Extract<EngineRequest, { type: "filter" }>): Uint8Array {
    const { prepared } = holding(snapshotId);
    if (!columns) throw new Error(`snapshot ${snapshotId} has no analysis to filter`);
    return applyFilters(prepared.records, columns, filters);
  }

  return {
    handle(request) {
      try {
        if (request.type === "filter") {
          const mask = filter(request);
          return { response: { id: request.id, type: "filter", ok: true, mask }, transfer: [mask.buffer] };
        }
        const { snapshot, analysis } = analyze(request);
        const transfer: Transferable[] = [];
        return {
          response: {
            id: request.id,
            type: "analyze",
            ok: true,
            snapshotId: request.snapshotId,
            snapshot: snapshot && transferableCopy(snapshot, transfer),
            analysis: transferableCopy(analysis, transfer),
          },
          transfer,
        };
      } catch (e) {
        return {
          response: {
            id: request.id,
            type: request.type,
            ok: false,
            error: messageOf(e),
            loaded: loaded?.id ?? null,
          },
          transfer: [],
        };
      }
    },
  };
}
