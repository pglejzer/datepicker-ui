# /verify — impact map

Apply to every changed file (paths from the repo root). Tags are a union; `@smoke` is always
added. A file matches at most one row — the first matching row wins.

## §1 Changed path → tags

| Changed path (glob) | Tags |
|---|---|
| `app/src/managers/range/**` | `@range @presets @months` |
| `app/src/managers/calendar/**`, `app/src/managers/swipe/**` | `@single @multiple @menus @keyboard` |
| `app/src/managers/pickers/**` | `@menus @input` |
| `app/src/managers/renderers/**`, `app/src/managers/DisplayManager.ts` | `@docked @modal @inline @range` |
| `app/src/managers/ValidationManager.ts`, `app/src/utils/selection/**` | `@rules @range @multiple` |
| `app/src/managers/InputManager.ts`, `app/src/utils/date/**` | `@input @single` |
| `app/src/managers/TriggerManager.ts` | `@keyboard @docked` |
| `app/src/managers/FormManager.ts` | `@form` |
| `app/src/managers/ThemeManager.ts`, `app/src/utils/colorScheme.ts` | `@themes` |
| `app/src/utils/surface.ts` | `@months @presets @range @modal` |
| `app/src/utils/popoverLayout.ts`, `app/src/utils/scrollLock.ts` | `@docked @modal` |
| `app/src/constants/timings.ts`, `app/src/utils/motion.ts` | `@docked @modal @range` |
| `app/src/datepicker/**` | `@api @single @range` |
| `app/src/utils/**`, `app/src/constants/**`, `app/src/index.ts`, `app/src/index.umd.ts`, `app/src/kit.ts` | `@api` |
| `app/src/types/**`, `app/src/typings/**` | none (types only) |
| `app/src/styles/themes/theme-<X>.scss` | `@theme:<X>` |
| `app/src/styles/base/**`, `app/src/styles/main.scss`, `app/src/styles/index.scss` | `@themes @single @range` |
| `app/src/styles/components/_presets.scss` | `@presets` + style rule |
| `app/src/styles/components/_range.scss` | `@range @months` + style rule |
| `app/src/styles/components/_motion.scss` | `@docked @modal @presets` + style rule |
| `app/src/styles/components/_container.scss` | `@single @range @months` + style rule |
| `app/src/styles/components/_text-field.scss` | `@input` + style rule |
| `app/src/styles/components/_menu.scss`, `_year-selection.scss`, `_navigation.scss`, `_header.scss` | `@menus @single` + style rule |
| `app/src/styles/components/_grid.scss`, `_pager.scss` | `@single @multiple` + style rule |
| `app/src/styles/components/**` (other) | `@single @range` + style rule |
| `app/docs/**` | `@smoke` |
| `app/vite.config.ts`, `app/vite-plugin-svg-text.ts`, `app/assets/**` | `@smoke` |
| `app/package.json`, `app/tsdown.config.ts`, `package.json` | `@smoke` + suggest `--package` |
| `app/tests/**`, `**/*.md`, `.claude/**`, `docs/**`, `.github/**`, `.verify/**`, `.gitignore` | none (no browser impact) |

**Style rule:** a tag selected because of a `styles/components` file also runs its theme
variants (scenarios.md "Theme variants").

## §2 Rules

- No row matches → the file goes to UNCOVERED: read its diff, choose tags yourself, propose a row
  in the report.
- No tag besides `@smoke` and no file under `app/` → nothing to check in a browser; say so and
  stop after Step 2 (no servers).
