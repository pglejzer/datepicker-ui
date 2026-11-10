---
paths:
  - "app/src/**/*.ts"
  - "app/tests/**/*.ts"
  - "app/docs/**/*.ts"
---

# Coding conventions

ESLint (`app/eslint.config.js`) enforces the rules below in `app/src`; Prettier owns formatting
(its defaults: double quotes, trailing commas, 80 columns, plus CRLF) - don't hand-format.

- Facts agents need without opening configs: `app/tsconfig.json` has `target`/`lib` ES2022 +
  DOM (no ES2023+ APIs such as `findLast`, `toSorted`, `Object.groupBy`), `strict`,
  `verbatimModuleSyntax`, `isolatedModules`, `noImplicitOverride`, `noFallthroughCasesInSwitch`,
  `moduleResolution: bundler`, `types: []`, path alias `@/*` → `app/src/*` (same in Vitest);
  `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes` are off. ESLint: `app/eslint.config.js`
  = `typescript-eslint` `strictTypeChecked` + `stylisticTypeChecked` (rules below); in `tests/`
  type assertions and `!` are allowed. SVG imports are markup strings. Don't spend a read on
  these files unless a task changes them.
- **Small, modular files - KISS, DRY, YAGNI.** One responsibility per file; 200-300 lines is fine,
  split anything past ~300 into a folder of focused modules (e.g. `datepicker/lifecycle/*`,
  `managers/swipe/{dragGesture,wheelGesture,Pager}.ts`), composed through constructors /
  plain functions, never `extends`. Declaration-only files (option types with JSDoc) may be
  longer. Before writing a helper, grep `app/src/utils/` for an existing one; shared logic goes
  to `utils/`, not copied. Prefer the simplest code that meets the spec - no speculative options,
  layers or abstractions (YAGNI): nothing the spec, plan or a caller doesn't need - no extra
  exports, attributes, hooks, options or fallbacks "just in case".
- Type-only imports use `import type` (`verbatimModuleSyntax`).
- Strict TypeScript in `app/src`: no `any`, no type assertions (`as X`; `as const` is fine), no
  non-null `!`, `unknown` only at real boundaries and narrowed right away. Existing violations
  are debt: don't add new ones, fix them when you are already changing that code.
- Composition only: no `extends`, no class hierarchies. Dependencies come in through the
  constructor.
- No nested ternaries.
- ESLint runs `typescript-eslint` `strictTypeChecked` + `stylisticTypeChecked`, so code written
  without running lint must already satisfy the rules agents trip over most:
  `no-unnecessary-condition` (no `??` / `?.` / `if (x)` on values whose type can't be
  null/undefined/falsy - fix the type or drop the check), `restrict-template-expressions` (only
  strings in template literals: `${String(n)}`), `prefer-nullish-coalescing`,
  `prefer-optional-chain`, `no-confusing-void-expression` (`() => { fn(); }`, not `() => fn()`, for
  void calls), `no-floating-promises` / `no-misused-promises` (`void promise`, no async listener
  callbacks), `restrict-plus-operands`, `no-unnecessary-type-parameters`, `no-extraneous-class`,
  `consistent-type-definitions` (`interface` for object shapes), `array-type` (`T[]` /
  `readonly T[]`), `consistent-indexed-object-style` (`Record`), `prefer-for-of`,
  `dot-notation`, `no-empty-function`, `only-throw-error`, `no-inferrable-types`.
- Default export only for `DatepickerUI` (the package default); everything else, managers
  included, uses named exports.
- **No new code comments** in `app/src` — let code self-document. The only acceptable comments
  are doc-comments on TypeScript options/public types (JSDoc in `types/options.ts` and
  `types/types.ts`). Leave existing comments alone unless they are clearly stale.
