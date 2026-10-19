import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import { svgText } from "./vite-plugin-svg-text.ts";

export default defineConfig({
  plugins: [svgText()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    globals: false,
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.test.ts"],
    testTimeout: 10000,
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.d.ts", "src/types/**", "src/styles/**"],
      reporter: ["text", "lcov", "html"],
    },
  },
});
