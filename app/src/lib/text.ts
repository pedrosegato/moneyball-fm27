import { LOCALE } from "./constants";

export const compareText = new Intl.Collator(LOCALE).compare;

export const compareLoose = new Intl.Collator(LOCALE, { sensitivity: "base" }).compare;

export const compareNatural = new Intl.Collator(LOCALE, { sensitivity: "base", numeric: true }).compare;

export const sameText = (a: string, b: string): boolean => compareLoose(a, b) === 0;

export const foldText = (text: string): string => text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
