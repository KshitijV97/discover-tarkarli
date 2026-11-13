import { defineConfig } from "vitest/config";
import path from "node:path";

/** Integration tests against real Postgres: `npm run test:integration`. Not part of `npm test`. */
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "server-only": path.resolve(__dirname, "src/test/server-only-stub.ts"),
    },
  },
  test: {
    include: ["src/**/*.int.test.ts"],
    globalSetup: ["src/test/integration/global-setup.ts"],
    testTimeout: 30_000,
    hookTimeout: 120_000,
  },
});
