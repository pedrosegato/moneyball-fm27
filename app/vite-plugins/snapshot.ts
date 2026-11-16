import fs from "node:fs";
import path from "node:path";
import { pipeline } from "node:stream";
import type { Plugin } from "vite";

const HEADER_BYTES = 8192;

function resolveSnapshot(dir: string): string | null {
  const latest = path.join(dir, "latest.json");
  if (fs.existsSync(latest)) return latest;
  if (!fs.existsSync(dir)) return null;
  const raws = fs
    .readdirSync(dir)
    .filter((f) => f.includes("raw") && f.endsWith(".json"))
    .map((f) => path.join(dir, f))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
  return raws[0] ?? null;
}

function readHeader(file: string) {
  const fd = fs.openSync(file, "r");
  try {
    const buf = Buffer.alloc(HEADER_BYTES);
    const text = buf.subarray(0, fs.readSync(fd, buf, 0, HEADER_BYTES, 0)).toString("utf8");
    return {
      build: /"build"\s*:\s*"([^"]*)"/.exec(text)?.[1] ?? null,
      date: /"date"\s*:\s*"([^"]*)"/.exec(text)?.[1] ?? null,
    };
  } finally {
    fs.closeSync(fd);
  }
}

export function snapshotPlugin(dir = path.resolve(import.meta.dirname, "../../.dev-data/snapshots")): Plugin {
  return {
    name: "dev-snapshot",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url?.split("?")[0];
        if (url !== "/__dev/snapshot" && url !== "/__dev/status") return next();

        const file = resolveSnapshot(dir);
        const missing = "Nenhum snapshot em .dev-data/snapshots";

        if (url === "/__dev/status") {
          res.setHeader("content-type", "application/json");
          if (!file) return void res.end(JSON.stringify({ ok: false, error: missing }));
          const { build, date } = readHeader(file);
          if (!build) {
            return void res.end(
              JSON.stringify({ ok: false, error: "Cabeçalho do snapshot sem build (ordem das chaves mudou?)" }),
            );
          }
          return void res.end(JSON.stringify({ ok: true, build, date, busy: false }));
        }

        if (!file) {
          res.statusCode = 404;
          res.setHeader("content-type", "text/plain; charset=utf-8");
          res.end(missing);
          return;
        }
        res.setHeader("content-type", "application/json");
        res.setHeader("content-length", fs.statSync(file).size);
        pipeline(fs.createReadStream(file), res, () => {});
      });
    },
  };
}
