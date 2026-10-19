# Contributing

Thanks for your interest in **datepicker-ui**. Bug reports, ideas and pull requests are welcome.

Please read the [code of conduct](CODE_OF_CONDUCT.md) first. For a security problem, follow
[SECURITY.md](../SECURITY.md) instead of opening an issue.

## Before you start

- For a bug, open an issue with a minimal reproduction: the options you pass, the browser and
  what you expected.
- For a new feature or option, open an issue first so we can agree on the API before you write
  code. The library aims to follow Material Design 3, so changes that break that look need a good
  reason.

## Setup

The source, build, demo and tests all live in `app/`. Use the Node version from `.nvmrc` (24).

```bash
cd app
npm install
npm run dev        # demo on http://localhost:8006
```

## Checks

Run these before opening a pull request. CI runs the same steps.

```bash
npm run lint
npm run format:check
npm run typecheck
npm test
npm run build
npm run check:package
```

A pre-commit hook runs ESLint and Prettier on the staged files.

## Code guidelines

- **No runtime dependencies.** The package ships with none.
- **SSR-safe.** Nothing may touch `window` or `document` when a module is imported.
- **Strict TypeScript.** No `any`, no type assertions and no non-null `!` in `app/src`.
- **Composition, not inheritance.** No `extends`. Dependencies come in through the constructor.
- **Small files.** One responsibility per file. Split a file that grows past about 300 lines.
- **Timings** come from `app/src/constants/timings.ts`, never from hardcoded numbers.
- **Text** shown to users or screen readers comes from the `labels` options.
- Prettier owns formatting, and files use CRLF line endings (see `.editorconfig`).

## Tests

Tests use Vitest with jsdom and mirror the source tree under `app/tests/unit/`. A fix comes with
a test that fails without it, and a feature comes with tests for its main cases.

## Pull requests

1. Keep a pull request to one change.
2. Update `README.md` when you change an option, method, event or CSS class.
3. Add a line under the `Unreleased` section of `CHANGELOG.md`.
4. Make sure every check above passes.

The maintainer reviews and merges. Releases and version numbers are handled by the maintainer.
