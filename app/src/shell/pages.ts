import { type ComponentType, createElement, lazy, type ReactElement } from "react";

export interface LazyPage<P> {
  (props: P): ReactElement;
  retry(): void;
}

export function lazyPage<P extends object>(load: () => Promise<ComponentType<P>>): LazyPage<P> {
  let failed = false;
  const make = () =>
    lazy(() =>
      load().then(
        (component) => ({ default: component }),
        (error: unknown) => {
          failed = true;
          throw error;
        },
      ),
    );
  let Lazy = make();
  const Page = ((props: P) => createElement(Lazy as ComponentType<P>, props)) as LazyPage<P>;
  Page.retry = () => {
    if (!failed) return;
    failed = false;
    Lazy = make();
  };
  return Page;
}

const loaders = [
  () => import("@/pages/Elenco"),
  () => import("@/pages/Cart"),
  () => import("@/pages/Compare"),
  () => import("@/pages/Graphs"),
  () => import("@/pages/Settings"),
] as const;
const [elenco, cart, compare, graphs, settings] = loaders;

export const Elenco = lazyPage(() => elenco().then((m) => m.Elenco));
export const Cart = lazyPage(() => cart().then((m) => m.Cart));
export const Compare = lazyPage(() => compare().then((m) => m.Compare));
export const Graphs = lazyPage(() => graphs().then((m) => m.Graphs));
export const Settings = lazyPage(() => settings().then((m) => m.Settings));

const lazyPages: readonly LazyPage<never>[] = [Elenco, Cart, Compare, Graphs, Settings];

export function retryFailedPages(): void {
  for (const page of lazyPages) page.retry();
}

export function preloadPages(): () => void {
  const load = () => {
    for (const page of loaders) page().catch(() => {});
  };
  if ("requestIdleCallback" in window) {
    const id = requestIdleCallback(load, { timeout: 5000 });
    return () => cancelIdleCallback(id);
  }
  const id = setTimeout(load, 2000);
  return () => clearTimeout(id);
}
