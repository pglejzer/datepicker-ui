---
name: a11y
description: Audit and improve the accessibility of the datepicker-ui library (app/src) - ARIA, keyboard operability of the day grid and month/year pickers, focus trap/management, screen-reader announcements, labels - against WCAG 2.2 AA and the WAI-ARIA Authoring Practices (Date Picker Dialog). Use when the user wants an a11y audit/fix of the picker. Drives the accessibility subagent in an audit → approve → apply flow.
disable-model-invocation: true
---

# Library Accessibility (a11y)

Make the `datepicker-ui` picker fully usable by keyboard and assistive technology. This skill is
a thin orchestrator: the real work is done by the **`accessibility`** subagent. The skill exists
to hold the **approval gate** the subagent can't run itself.

Standard: **WCAG 2.2 AA** + the **WAI-ARIA Authoring Practices** (Date Picker Dialog, grid,
listbox, dialog patterns). Scope is **`app/src` only**.

## Arguments (optional)
- A focus area narrows the run, e.g. `/a11y grid`, `/a11y pickers`, `/a11y modal`,
  `/a11y docked`, `/a11y input`, `/a11y keyboard`. No argument = full audit.
- `--apply-all` skips the approval prompt and applies the whole audited plan (still reports +
  verifies). Use only for an explicitly unattended run.

## Workflow

### Phase 1 — Audit (read-only)
Dispatch the `accessibility` subagent (Agent tool, `subagent_type: accessibility`) in
**audit mode**, with the focus area if given. The prompt starts with the HARD RULES line from
`CLAUDE.md` §4 and names `.claude/rules/accessibility.md`. Ask for a prioritized, file-level plan
grouped into:
1. Keyboard operability (open/close, day grid navigation, month/year pickers, footer buttons,
   view switch)
2. ARIA roles/names/states (dialog, grid/gridcell, `aria-selected/current/disabled/expanded`)
3. Screen-reader feedback (live region for month/year changes; validation/error announcements)
4. Forms, labels & relationships (input label, format hint, error description, all text via
   `labels`)
5. Non-text & motion (no color-only state; `prefers-reduced-motion`)
Each finding cites its WCAG/APG reference and the exact file + attribute/handler. No edits.

### Phase 2 — Present & approve (gate)
Relay the plan concisely (grouped, with references). **Use AskUserQuestion** to approve all,
pick which groups/items to apply, or skip. Capture the approved set. Do not skip this gate
unless `--apply-all` was passed.

### Phase 3 — Apply
Dispatch `accessibility` again in **apply mode** with the exact approved list. It implements
fixes with native ARIA, adds any new strings to the `labels` group, and stays within the
architecture (data-only calendar classes stay DOM-free; manager contract; public API unchanged;
SSR-safe; CRLF; zero new deps).

### Phase 4 — Verify & report
- Run the relevant Vitest specs (`npx vitest run tests/unit/...`), `npm run lint` and, once at
  the end, the full `npm test` in `app/`, then the demo browser check per HARD RULES §5. Report
  the real output.
- Convert files the subagent created to CRLF.
- Summarize what changed, grouped by the five areas, with the file list.
- Give the manual checklist: keyboard-only walkthrough (Tab/Shift+Tab/Arrows/PageUp/PageDown/
  Esc/Enter/Space), an NVDA/VoiceOver pass on open → navigate → select → confirm, and focus
  returning on close.
- Surface any CSS-contrast item for `styling-themes` and any structural/logic item for
  `core-architect` / `calendar-engine-dev`.

## Guardrails
- `app/src` only; never edit `dist/`.
- Don't change the public API or `getValue()` shape; visible/AT text goes through `labels`.
- Keep the data-vs-DOM split, the manager `(core, emitter)` + `destroy()` contract, SSR-safety,
  CRLF, and the zero-dependency promise intact.
- This skill audits/fixes; git and npm publish stay with the user.
