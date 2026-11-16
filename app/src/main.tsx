import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { getDataSource } from "./data/source";
import { createEngineClient } from "./engine/client";
import "./i18n";
import { trackLastInput } from "./lib/lastInput";
import { blockNativeContextMenu } from "./lib/nativeContextMenu";
import { bootApp } from "./store/boot";
import { createDataController } from "./store/controller";
import { appStore } from "./store/index";
import { DataControllerContext } from "./store/useData";
import "./index.css";

trackLastInput();
blockNativeContextMenu();

const controller = createDataController({
  source: getDataSource(),
  store: appStore,
  createEngine: () => createEngineClient(),
});
bootApp({ store: appStore, controller }).catch((e: unknown) => console.error("O app não terminou de iniciar", e));

const root = document.getElementById("root");
if (!root) throw new Error("index.html has no #root element");

createRoot(root).render(
  <StrictMode>
    <DataControllerContext value={controller}>
      <App />
    </DataControllerContext>
  </StrictMode>,
);
