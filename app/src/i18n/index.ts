import i18next from "i18next";
import { initReactI18next } from "react-i18next";
import { LOCALE } from "@/lib/constants";
import { formatCount } from "@/lib/format";
import { DEFAULT_NAMESPACE, NAMESPACES, resources } from "./resources";

void i18next.use(initReactI18next).init({
  lng: LOCALE,
  fallbackLng: LOCALE,
  resources,
  ns: NAMESPACES,
  defaultNS: DEFAULT_NAMESPACE,
  initAsync: false,
  interpolation: { escapeValue: false },
});

i18next.services.formatter?.add("count", (value: number) => formatCount(value));

export const i18n = i18next;
