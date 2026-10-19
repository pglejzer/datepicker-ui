# datepicker-ui build workspace

This folder holds the library source, the demo page, the tests and the build tooling for
`@pglejzer/datepicker-ui`. It is a private workspace and is never published. The published
manifest is the `package.json` one level up.

## Requirements

Node.js 22.18 or a later 22.x release, or Node.js 24.11 or later.

## Installation

```bash
npm install
```

The `prepare` script installs the Git pre-commit hook with Husky.

## Scripts

Run every script from this folder.

| Script                  | Description                                                           |
| ----------------------- | --------------------------------------------------------------------- |
| `npm run dev`           | Start the Vite dev server with the demo page on http://localhost:8006 |
| `npm run build`         | Build the library: JavaScript, type declarations and CSS              |
| `npm run build:js`      | Bundle ESM, CJS and UMD with tsdown and emit the type declarations    |
| `npm run build:css`     | Compile the base styles and every theme to minified CSS with Sass     |
| `npm run build:demo`    | Build the demo page as a static site                                  |
| `npm run preview`       | Serve the built demo page                                             |
| `npm run typecheck`     | Type-check the source, tests, demo and config files with `tsc`        |
| `npm run lint`          | Lint with ESLint                                                      |
| `npm run lint:fix`      | Lint and apply the automatic fixes                                    |
| `npm run format`        | Format all files with Prettier                                        |
| `npm run format:check`  | List the files Prettier would change                                  |
| `npm test`              | Run the tests once with Vitest                                        |
| `npm run test:watch`    | Run Vitest in watch mode                                              |
| `npm run test:coverage` | Run the tests with V8 coverage                                        |
| `npm run check:package` | Check the packed package with publint and Are the Types Wrong         |

`check:package` packs the published package, so run `npm run build` first.

Before each commit, lint-staged runs ESLint and Prettier on the staged files.

## Build output

`npm run build` writes to the `dist` folder in the repository root:

- `esm/` holds the ES modules (`index.js`, `kit.js`) with their `.d.ts` type declarations, plus a
  `shared.js` file with the code both entries use
- `cjs/` holds the CommonJS build (`index.cjs`, `kit.cjs`, `shared.cjs`) with `.d.cts` declarations
- `umd/` holds `index.js` (global `DatepickerUI`) and `kit.js` (global `DatepickerUIKit`)
- every JavaScript file is minified and targets ES2022
- `css/index.css` (core and every theme), `css/main.css` (core only) and one file per theme in
  `css/themes/`

The source imports the SVG icons as markup strings. tsdown, the dev server and Vitest all load
them as text.

`npm run build:demo` writes the demo page to `dist-demo`. It is not part of the package.

## Themes

`build:css` compiles every theme in the styles folder: `theme-m3-green`, `theme-crane`,
`theme-crane-straight`, `theme-m2`, `theme-glassmorphic`, `theme-pastel`, `theme-ai`,
`theme-cyberpunk` and `theme-blueprint`. `index.css` contains the core and
every theme, `main.css` contains only the core, and each theme also compiles to its own file. The
`basic` theme is the default look and needs no extra file.

## Tools

- [TypeScript](https://www.typescriptlang.org/): library source and type checking
- [tsdown](https://tsdown.dev/): JavaScript bundles and type declarations
- [Sass](https://sass-lang.com/): styles and themes
- [Vite](https://vite.dev/): dev server and demo build
- [Vitest](https://vitest.dev/) with jsdom and Testing Library: tests
- [ESLint](https://eslint.org/) with typescript-eslint: linting
- [Prettier](https://prettier.io/): formatting with CRLF line endings
- [Husky](https://typicode.github.io/husky/) and lint-staged: pre-commit hook
- [publint](https://publint.dev/) and [Are the Types Wrong](https://arethetypeswrong.github.io/):
  package checks before a release

## Author

Created by [@pglejzer](https://github.com/pglejzer)

## License

[MIT](../LICENSE)
