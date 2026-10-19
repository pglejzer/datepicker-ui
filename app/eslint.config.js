import js from "@eslint/js";
import { defineConfig, globalIgnores } from "eslint/config";
import eslintConfigPrettier from "eslint-config-prettier/flat";
import tseslint from "typescript-eslint";

export default defineConfig([
  globalIgnores(["node_modules/", "coverage/", "dist/", "dist-demo/"]),
  js.configs.recommended,
  {
    files: ["src/**/*.ts", "tests/**/*.ts", "docs/**/*.ts"],
    extends: [
      tseslint.configs.strictTypeChecked,
      tseslint.configs.stylisticTypeChecked,
    ],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    files: ["*.config.ts", "*.config.js", "vite-plugin-svg-text.ts"],
    extends: [tseslint.configs.recommended],
  },
  {
    files: ["src/**/*.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/consistent-type-assertions": [
        "error",
        { assertionStyle: "never" },
      ],
      "@typescript-eslint/no-non-null-assertion": "error",
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { ignoreRestSiblings: true },
      ],
      "no-nested-ternary": "error",
      "no-restricted-syntax": [
        "error",
        {
          selector: "ClassDeclaration[superClass], ClassExpression[superClass]",
          message: "Composition only: no extends (see CLAUDE.md).",
        },
      ],
    },
  },
  {
    files: ["tests/**/*.ts"],
    rules: {
      "@typescript-eslint/consistent-type-assertions": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/no-empty-function": "off",
      "no-restricted-syntax": "off",
    },
  },
  eslintConfigPrettier,
]);
