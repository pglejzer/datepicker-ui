---
paths:
  - "app/src/utils/accessibility.ts"
  - "app/src/managers/**/*.ts"
---

# Accessibility rules (library)

Applies when editing managers and the view / renderer code. Standard: **WCAG 2.2 AA + WAI-ARIA
APG**. Pairs with `.claude/rules/architecture.md`.

- **Current state (stage 1):** the day grid follows the APG date-picker grid - `role="grid"` with
  `role="columnheader"` weekdays and `role="gridcell"` days, a roving `tabindex`, `aria-selected`,
  `aria-current="date"`, `aria-disabled` on disabled days, and keyboard movement from
  `managers/calendar/GridKeyboard.ts`. A polite `aria-live` region (`dp-ui__live-region`,
  `utils/accessibility.announce`) announces month changes and every selection change on the home
  panel (the headline text: the date, the range, or "N selected"). The docked popover is `role="dialog"`
  with `aria-modal="false"`, the modal is a native `<dialog>` (focus containment from the
  platform), the inline surface is `role="group"`; all carry an `aria-label`. Month / year
  menus use `role="listbox"` / `option`; header buttons carry `aria-expanded`, `aria-haspopup`
  and `aria-controls`; footer buttons expose `aria-keyshortcuts`; the input gets `aria-invalid`
  and the toggle `aria-expanded`. `utils/accessibility.trackPointerModality` separates pointer
  from keyboard focus styling. Build on this; a full pass is the `/a11y` skill.
- **Stage 5:**
  - **Presets.** A `role="group"` labelled by `labels.presets`, made of buttons with
    `aria-pressed`.
  - **Two fields.** With `ui.endInput`, both page inputs get `aria-invalid` and
    `setCustomValidity` on the failing field. Focus returns to the field that opened the picker.
  - **Inert outside days.** They carry `aria-disabled` and never take roving focus.
  - **Day content.** `renderDate` text joins the cell's accessible name.
  - **Month grid.** A listbox like the year grid: short names visible, the long name and the
    year as the option name.
  - **Several months.** The live region announces the month range (`formatMonthRange`).
- **Pattern to keep:** Arrow keys move by day / week (Left / Right flip in RTL), Home / End to month
  start / end, PageUp / PageDown by month (Shift by year), Enter / Space selects, Escape closes; focus returns to the
  input on close (`behavior.returnFocus`). `aria-pressed` only on real toggles.
- **Screen reader:** announce month / year changes and validation errors; don't announce every
  arrow step that already moves focus.
- **Text is localizable:** every visible / AT string comes from the `labels` group with English
  defaults in `DEFAULT_LABELS` (`datepicker/options/defaults.ts`); month / weekday names come from
  `Intl`. Never hardcode new AT text.
- **Motion:** gate JS-driven motion on `utils/accessibility.motionMode(ui.animation)`: `full`,
  `reduced` (`prefers-reduced-motion`: fades only, nothing moves or resizes) or `none`.
- Don't convey state by color alone (markup/role part here; CSS contrast + focus ring is
  `styling-themes`). Keep the data-vs-DOM split, the manager contract, SSR-safety, and the
  public API / `getValue()` shape unchanged.
