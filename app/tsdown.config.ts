import { defineConfig } from "tsdown";

const DECLARATION = /\.d\.[cm]?ts$/;

export default defineConfig([
  {
    entry: { index: "src/index.ts", kit: "src/kit.ts" },
    format: {
      esm: { outDir: "../dist/esm" },
      cjs: { outDir: "../dist/cjs" },
    },
    dts: true,
    platform: "browser",
    target: "es2022",
    minify: true,
    sourcemap: false,
    clean: ["../dist/esm", "../dist/cjs", "../dist/umd", "../dist/*.*"],
    fixedExtension: false,
    hash: false,
    loader: { ".svg": "text" },
    outputOptions: {
      exports: "named",
      codeSplitting: {
        groups: [
          {
            name: (id) => (DECLARATION.test(id) ? "shared.d" : "shared"),
            minShareCount: 2,
          },
        ],
      },
    },
  },
  {
    entry: { index: "src/index.umd.ts" },
    format: "umd",
    globalName: "DatepickerUI",
    outDir: "../dist/umd",
    dts: false,
    platform: "browser",
    target: "es2022",
    minify: true,
    sourcemap: false,
    clean: false,
    loader: { ".svg": "text" },
    outputOptions: { entryFileNames: "[name].js", exports: "default" },
  },
  {
    entry: { kit: "src/kit.ts" },
    format: "umd",
    globalName: "DatepickerUIKit",
    outDir: "../dist/umd",
    dts: false,
    platform: "browser",
    target: "es2022",
    minify: true,
    sourcemap: false,
    clean: false,
    loader: { ".svg": "text" },
    outputOptions: { entryFileNames: "[name].js", exports: "named" },
  },
]);
