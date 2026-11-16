import type { StateCreator } from "zustand";
import { SCOPES, type Scope } from "@/data/types";
import { DEFAULT_ENGINE_SETTINGS, type EngineSettings } from "@/engine/analysis/input";
import type { LeagueFilter } from "@/engine/league";
import { LEAGUE_WEIGHTINGS } from "@/engine/leagueStrength";
import { isRecord } from "@/lib/guards";
import type { AppState } from "./index";
import { fieldsOf, finiteIn, oneOf, text } from "./sanitize";

export const THEMES = ["dark", "light"] as const;
export type Theme = (typeof THEMES)[number];

export const POLL_SECONDS = { min: 2, max: 60, default: 5 } as const;

export interface Settings {
  theme: Theme;
  pollSeconds: number;
  scope: Scope;
  engine: EngineSettings;
}

export function defaultSettings(): Settings {
  return {
    theme: "dark",
    pollSeconds: POLL_SECONDS.default,
    scope: "competitive",
    engine: structuredClone(DEFAULT_ENGINE_SETTINGS),
  };
}

export interface SettingsSlice {
  settings: Settings;
  updateSettings(patch: Partial<Settings>): void;
  resetSettings(): void;
}

export const createSettingsSlice: StateCreator<AppState, [], [], SettingsSlice> = (set) => ({
  settings: defaultSettings(),
  updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),
  resetSettings: () => set({ settings: defaultSettings() }),
});

interface Limits {
  min: number;
  max: number;
}

export const ENGINE_LIMITS = {
  poolMinutes: { min: 1, max: 100_000 },
  moneyball: {
    minRatio: { min: 0, max: 1000 },
    minPerf: { min: 0, max: 100 },
    minFair: { min: 0, max: 1_000_000_000 },
  },
  sellKeep: {
    devVsAge: { min: 0, max: 1000 },
    loanVsAge: { min: 0, max: 1000 },
    youngAge: { min: 0, max: 60 },
    contractMonths: { min: 0, max: 240 },
    sellHighRatio: { min: 0, max: 1000 },
    declineAge: { min: 0, max: 60 },
    gkDeclineAge: { min: 0, max: 60 },
  },
  fit: {
    lvl: { min: 0, max: 30 },
    styleMin: { min: 0, max: 100 },
  },
} as const satisfies {
  poolMinutes: Limits;
  moneyball: Partial<Record<keyof EngineSettings["moneyball"], Limits>>;
  sellKeep: Partial<Record<keyof EngineSettings["sellKeep"], Limits>>;
  fit: Partial<Record<keyof EngineSettings["fit"], Limits>>;
};

const ANY_OPTION: Limits = { min: 0, max: 1e12 };

function numbersLike<T extends object>(defaults: T, raw: unknown, limits: Partial<Record<keyof T, Limits>>): T {
  const fields = fieldsOf(raw);
  const out: Record<string, unknown> = {};
  for (const [key, fallback] of Object.entries(defaults)) {
    const { min, max } = limits[key as keyof T] ?? ANY_OPTION;
    out[key] = typeof fallback === "number" ? (finiteIn(fields[key], min, max) ?? fallback) : fallback;
  }
  return out as T;
}

const LEAGUE_FILTER_KINDS = [
  "any",
  "top5",
  "myLeagueOrStronger",
  "myLeague",
] as const satisfies readonly LeagueFilter["kind"][];

function restoreLeagueFilter(raw: unknown, fallback: LeagueFilter): LeagueFilter {
  if (!isRecord(raw)) return fallback;
  if (raw.kind === "league") {
    const key = text(raw.key, 80);
    return key ? { kind: "league", key } : fallback;
  }
  const kind = oneOf(raw.kind, LEAGUE_FILTER_KINDS);
  return kind ? { kind } : fallback;
}

function restoreEngine(raw: unknown): EngineSettings {
  const d = structuredClone(DEFAULT_ENGINE_SETTINGS);
  const r = fieldsOf(raw);
  return {
    poolMinutes: finiteIn(r.poolMinutes, ENGINE_LIMITS.poolMinutes.min, ENGINE_LIMITS.poolMinutes.max) ?? d.poolMinutes,
    fairValue: numbersLike(d.fairValue, r.fairValue, {}),
    moneyball: numbersLike(d.moneyball, r.moneyball, ENGINE_LIMITS.moneyball),
    sellKeep: numbersLike(d.sellKeep, r.sellKeep, ENGINE_LIMITS.sellKeep),
    fit: {
      ...numbersLike(d.fit, r.fit, ENGINE_LIMITS.fit),
      leagueFilter: restoreLeagueFilter(fieldsOf(r.fit).leagueFilter, d.fit.leagueFilter),
    },
    leagueWeighting: oneOf(r.leagueWeighting, LEAGUE_WEIGHTINGS) ?? d.leagueWeighting,
  };
}

export function restoreSettings(raw: unknown): Settings {
  const d = defaultSettings();
  const r = fieldsOf(raw);
  return {
    theme: oneOf(r.theme, THEMES) ?? d.theme,
    pollSeconds: Number.isInteger(r.pollSeconds)
      ? (finiteIn(r.pollSeconds, POLL_SECONDS.min, POLL_SECONDS.max) ?? d.pollSeconds)
      : d.pollSeconds,
    scope: oneOf(r.scope, SCOPES) ?? d.scope,
    engine: restoreEngine(r.engine),
  };
}
