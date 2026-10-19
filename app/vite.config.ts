import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import { svgText } from "./vite-plugin-svg-text.ts";

export default defineConfig({
  root: "docs",
  plugins: [svgText()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    port: 8006,
    open: true,
  },
  build: {
    outDir: "../dist-demo",
    emptyOutDir: true,
  },
});
