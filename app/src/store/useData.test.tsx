import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import type { DataController } from "./controller";
import { appStore } from "./index";
import { testSnapshot } from "./testing";
import { DataControllerContext, useAnalyzing, useData, useLoadProgress } from "./useData";

const controller: DataController = {
  start: () => {},
  stop: () => {},
  reload: async () => {},
};
const wrapper = ({ children }: { children: ReactNode }) => (
  <DataControllerContext value={controller}>{children}</DataControllerContext>
);

describe("useData", () => {
  afterEach(() => appStore.setState(appStore.getInitialState(), true));

  it("gives the snapshot, its analysis, the rows its filters keep, the error and reload", () => {
    const snapshot = testSnapshot();
    act(() => appStore.getState().setData({ snapshot, error: "x" }));
    const { result } = renderHook(() => useData(), { wrapper });
    expect(Object.keys(result.current).sort()).toEqual(["analysis", "error", "reload", "snapshot", "visible"]);
    expect(result.current.snapshot).toBe(snapshot);
    expect(result.current.reload).toBe(controller.reload);
  });

  it("does not re-render its consumers on progress, analysing or status changes", () => {
    let renders = 0;
    renderHook(
      () => {
        renders++;
        return useData();
      },
      { wrapper },
    );
    const before = renders;
    act(() => appStore.getState().setData({ loading: true, progress: { phase: "read", done: 1, total: 10 } }));
    act(() => appStore.getState().setData({ progress: { phase: "read", done: 2, total: 10 } }));
    act(() => appStore.getState().setData({ analyzing: true }));
    act(() => appStore.getState().setData({ status: { ok: true } }));
    expect(renders).toBe(before);
  });

  it("leaves loading and progress to useLoadProgress, analysing to useAnalyzing", () => {
    const progress = renderHook(() => useLoadProgress());
    const analyzing = renderHook(() => useAnalyzing());
    act(() => appStore.getState().setData({ loading: true, progress: { phase: "scan" }, analyzing: true }));
    expect(progress.result.current).toEqual({ loading: true, progress: { phase: "scan" } });
    expect(analyzing.result.current).toBe(true);
  });
});
