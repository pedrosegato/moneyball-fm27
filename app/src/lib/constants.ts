export const LOCALE = "pt-BR";

export const EMPTY_VALUE = "—";

export const MULTIPLIER_SIGN = "×";

export const ALL = "all";
export type All = typeof ALL;

export const TOAST_ID = { compareFull: "compare-full" } as const;
export type ToastId = (typeof TOAST_ID)[keyof typeof TOAST_ID];
