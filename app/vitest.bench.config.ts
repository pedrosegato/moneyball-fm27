import viteConfig from "./vite.config.ts";

const { projects: _projects, ...shared } = viteConfig.test ?? {};

export default {
  ...viteConfig,
  test: { ...shared, environment: "node", include: ["src/**/*.bench.ts"], fileParallelism: false },
};
