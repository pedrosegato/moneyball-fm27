/// <reference types="vitest/config" />
import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { configDefaults } from "vitest/config";
import { snapshotPlugin } from "./vite-plugins/snapshot.ts";

export default defineConfig({
  plugins: [react(), tailwindcss(), snapshotPlugin()],
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "src") } },
  clearScreen: false,
  server: { port: 1420, strictPort: true },
  test: {
    globals: true,
    setupFiles: ["./src/test-setup.ts"],
    projects: [
      {
        extends: true,
        test: {
          name: "engine",
          environment: "node",
          include: ["src/engine/**/*.test.ts"],
          testTimeout: 60_000,
        },
      },
      {
        extends: true,
        test: {
          name: "app",
          environment: "jsdom",
          include: ["src/**/*.test.{ts,tsx}"],
          exclude: [...configDefaults.exclude, "src/engine/**"],
        },
      },
    ],
  },
});
