import { render } from "@testing-library/react";
import type { ReactNode } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { EngineClient } from "@/engine/client";
import { createDataController, type DataController } from "@/store/controller";
import { appStore } from "@/store/index";
import { fakeSource, instantEngine } from "@/store/testing";
import { DataControllerContext } from "@/store/useData";

let running: DataController[] = [];

export function startData(fake = fakeSource(), createEngine: () => EngineClient = instantEngine) {
  const controller = createDataController({
    source: fake.source,
    store: appStore,
    createEngine,
    afterPaint: () => Promise.resolve(),
  });
  controller.start();
  running.push(controller);
  return { controller, ...fake };
}

export function renderWithData(ui: ReactNode, controller: DataController) {
  return render(
    <DataControllerContext value={controller}>
      <TooltipProvider>{ui}</TooltipProvider>
    </DataControllerContext>,
  );
}

export function resetApp() {
  for (const controller of running) controller.stop();
  running = [];
  appStore.setState(appStore.getInitialState(), true);
  window.location.hash = "";
}
