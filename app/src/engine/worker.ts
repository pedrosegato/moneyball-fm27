import { createEngineSession, type EngineRequest } from "./session";

const session = createEngineSession();

self.onmessage = (e: MessageEvent<EngineRequest>) => {
  const { response, transfer } = session.handle(e.data);
  self.postMessage(response, { transfer });
};
