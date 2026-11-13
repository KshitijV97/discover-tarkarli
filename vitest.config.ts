import { defineConfig } from "vitest/config";
import path from "node:path";

/** Unit tests (`npm test`). Integration tests (*.int.test.ts) have their own config. */
export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  test: { include: ["src/**/*.test.ts"], exclude: ["src/**/*.int.test.ts", "node_modules/**"] },
});
