---
paths:
  - "app/src/styles/**/*.scss"
---

# Styling & theme rules

Applies when working in `app/src/styles/`. Pairs with `.claude/rules/architecture.md`.

- **Class names are a contract** with the TypeScript (Contract C2 in
  `docs/superpowers/plans/2026-10-17-stage-1-foundation.md`): block `dp-ui`, BEM elements
  `dp-ui__*`, modifiers `--*`. Key ones: `dp-ui__container--docked|modal|inline|menu-open|rtl`,
  `dp-ui__calendar`, `table` cells `td.dp-ui__date[data-date]` with `span.dp-ui__date-indicator`
  and `--selected|--today|--disabled|--outside-month|--empty`, `dp-ui__navigation--year-grid`,
  `dp-ui__pager--swipe|--dragging`. Stage 5 (contract in the stage-5 plan): `span.dp-ui__date-content`
  + `--has-content` (rows grow to `--dp-ui-date-content-row-height`, state stays on the 40 px
  indicator), inert outside days `--outside-month.--disabled` (dimmed once),
  `dp-ui__month-selection(-item)` (shares the year grid rules), `dp-ui__navigation--month-grid`,
  `dp-ui__container--multi-month` + inline `--dp-ui-visible-months`, `dp-ui__months`,
  `dp-ui__navigation--months` (range row arrows), `dp-ui__presets` / `dp-ui__preset`
  (`_presets.scss`; chip row by default, column with `dp-ui__container--presets`). Widths mirror
  the JS layout constants (`--dp-ui-month-width` 336, `--dp-ui-month-gap` 24,
  `--dp-ui-presets-width` 168). Attributes: `data-positioning`, `data-placement`,
  `data-theme`, `data-color-scheme`; variable `--dp-ui-anchor-name`. Don't rename a class without
  coordinating (`core-architect` / `calendar-engine-dev`); cross-check selectors against the live
  view and renderer code - dead selectors silently break styling.
- **No `@layer`.** Layered library CSS loses to any unlayered page reset (e.g. Tailwind
  preflight), so the library does not use layers. Reset selectors in `base/_reset.scss` are
  wrapped in `:where()` (zero specificity) so component rules win; keep new resets that way.
- **Files:** `main.scss` (the core) `@use`s `base/` (`_tokens`, `_reset`, `_utilities`) and
  `components/` (`_container`, `_header`, `_navigation`, `_buttons`, `_grid`, `_pager`, `_menu`,
  `_year-selection`, `_range`, `_text-field`, `_actions`, `_motion`, `_accessibility`);
  `index.scss` = `main` + every `themes/theme-*.scss`. Look lives in tokens, not in component
  rules.
- **Tokens:** system tokens `--dp-ui-sys-*` (M3 roles, `light-dark()` values, scheme from
  `data-color-scheme` or the OS) in `base/_tokens.scss`; component tokens `--dp-ui-*` derive from
  them. Timings arrive as `--dp-ui-motion-*` from `TIMINGS` / `EASING`. Reuse tokens instead of
  hardcoding colors, sizes or durations.
- **Themes:** `basic` (light + dark, `light-dark()` in `base/_tokens.scss`) plus one standalone
  file per theme in `themes/` (m3-green, crane, crane-straight, m2, glassmorphic, pastel, ai,
  cyberpunk, blueprint). A theme only sets tokens (`--dp-ui-sys-*` roles, a few
  component tokens such as `--dp-ui-container-shape-*`, `--dp-ui-container-elevation`,
  `--dp-ui-container-backdrop-filter`) in one block
  `:is(.dp-ui, .dp-ui__dialog, .dp-ui__container)[data-theme="name"]` (0,2,0, after the base so
  it beats `[data-color-scheme]`); one-version themes pin `color-scheme`, `blueprint` uses
  `light-dark()` to follow it. Ports from timepicker-ui follow the `--tp-*` → `--dp-ui-*` table
  (contract T2 in `docs/superpowers/plans/2026-10-17-stage-3-themes.md`). `ThemeManager` sets
  `data-theme` and `data-color-scheme` on the host and surface root. `build:css` compiles every
  file in `themes/`; a new theme also needs an `@use` in `index.scss`, the root `package.json`
  `exports` subpath and the `ThemeName` union in `types/options.ts` (flag those for
  `build-release` / `core-architect`). Never leak theme color into `base/` or `components/`.
- **Never break a theme's visual identity / Material Design 3.** Do NOT use `font-weight: 700`
  or `text-decoration: line-through` as state cues - that breaks the look and is not MD3. MD3
  conveys selected/active with **state layers / tonal containers** (fill) and disabled with
  **reduced opacity / dimmed color**. For a WCAG 1.4.1 non-color cue, first check if a
  fill/container/opacity cue already exists (then add nothing); otherwise pick the lightest
  MD3-consistent affordance, never exceed weight 500, and flag real WCAG-vs-design tradeoffs.
- **Visible focus** (`:focus-visible`) on every focusable control - date cells, header buttons,
  menu items, footer buttons - with ring contrast >= 3:1 on light and dark; never
  `outline: none` without a replacement. Honor `prefers-reduced-motion` (`_motion.scss`).
- Date states to keep distinct: today, selected, disabled, outside-month, hover and focus
  (range states arrive in stage 2).
- Vitest does not process CSS, so visual regressions are invisible to tests - the main agent
  checks them in the demo at the end; name the display modes / schemes / viewports it must cover
  (docked, modal, inline; light and dark; below and above 600 px). `build:css` (main agent)
  verifies SCSS compiles.
