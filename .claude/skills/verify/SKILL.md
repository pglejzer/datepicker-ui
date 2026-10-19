---
name: verify
description: Browser-check what a change could have broken in datepicker-ui (library demo, before/after). Use at the end of a task that changed library behavior or styles (app/src), or when the user asks to check that nothing broke. Not for demo-only edits in app/docs, copy/typo/comment edits or one-line fixes (HARD RULES §5 in CLAUDE.md). Main agent only, never delegated to a subagent.
---

# /verify — before/after browser verification

Runs entirely in the **main agent** (HARD RULES in `CLAUDE.md`: subagents never run servers,
browsers or checks). Report only: never fixes code, never runs git writes, never publishes.

Files in this folder: `impact-map.md` (path → tags), `servers.md` (exact commands),
`scenarios.md` (steps per tag), `helpers.js` (served on `127.0.0.1:8299`, injected as `window.__dp`).

## Arguments
- `--base <ref>` — compare against `<ref>` (default `HEAD`; e.g. `HEAD~1` when the change is committed).
- `--no-baseline` — after phase only (expectations + screenshots, no comparison); a SHOT is the
  screenshot only, no fingerprint. Forced when the base predates the rewrite (servers.md §0).
- `--files <paths>` — select tags from these files instead of the diff. Use it when the working
  tree holds unrelated uncommitted work; pair with `--no-baseline` when the base predates that work.
- `--full` — run every scenario of every selected tag and every viewport. Use it before a release
  or when the user asks; without it the run uses the quick profile (Step 2.5).
- `--package` — also run `build` + `check:package` (servers.md §2).
- `--mcp chrome-devtools|playwright` — force the MCP.
- `--tags <@a,@b>` — add these tags to whatever the diff selects; with an empty diff the run still
  has a baseline (before = after → a determinism check).
- `--clean` — servers.md §6, then stop.

## Step 1 — Preflight
servers.md §0, then §4 (run id). Any failure → stop with the exact fix for the user.

## Step 2 — Tags
1. Changed files: the `--files` list when given, else (Bash) `git diff --name-only <base>` and
   `git ls-files --others --exclude-standard`.
2. impact-map.md §1 → tags (union) + `@smoke`; unmatched → UNCOVERED (read its diff, pick tags
   yourself, propose a map row in the report). impact-map.md §2 → maybe nothing to check.
3. Add `--tags`. Scenarios to run = every `lib/*` scenario under the heading of each selected tag
   in scenarios.md; style-rule tags also add `lib/variants-<tag>`; `@theme:<X>` runs
   `lib/theme-<X>`. Read only what runs: Grep `^## ` in scenarios.md for line numbers, then Read
   the notation block and each selected section with offset/limit, not the whole file.
4. **Quick profile** (default; `--full` skips this step):
   - desktop only — drop scenarios and SHOTs with `vp: m` unless a changed file is under
     `app/src/styles/`, is `app/src/utils/surface.ts` or `DisplayManager.ts`, or the task is about
     small screens / full screen;
   - `lib/themes`: only `basic` and the themes the task changed.
5. Tell the user in 2-4 lines: base, baseline yes/no, profile (quick: what `--full` would add),
   tags (with the triggering file), uncovered. Don't wait.

## Step 3 — Servers
servers.md §1a (helpers server, always first), then §1 (skip the before server with
`--no-baseline`), then §2 with `--package`. Every server in the background, keep task ids; §3 for
each. A failing after server → log tail into the report, abort (no verdict). A failing before
server → continue without baseline.

## Step 4 — Browser
1. **MCP** (unless `--mcp`): `mcp__chrome-devtools__list_pages`; on any error → Playwright MCP
   `browser_tabs` (`action: list`); both fail → SUMMARY.md "No browser MCP available" with both
   errors and NO verdict, go to Step 6. Before and after MUST use the same MCP; if it dies mid-run,
   delete `.verify/shots` and `.verify/fp`, switch, redo Step 4.
2. **Pages** — chrome-devtools: `new_page` per phase (`lib-before`, `lib-after`), note each
   `pageId`; on each `emulate` `viewport: "1280x800x1"`, `colorScheme: "light"`. Playwright MCP
   (one page): run phases one after another; `browser_resize` 1280×800, `browser_emulate_media`
   `colorScheme: "light"`. chrome-devtools can restart its browser between calls ("No page found",
   page ids change) → `list_pages`, `new_page` + `emulate` again, and redo the current scenario
   from its navigation.
3. **Run** every selected scenario (below): all before-phase runs first, then after. Before a
   phase starts, `select_page` its page with `bringToFront: true` — a background tab throttles
   `requestAnimationFrame` (used by `settle()` and `openStable()`) and keyboard focus.
4. **Close** what you opened (`close_page`, keep one blank page / `browser_close`).

### Running a scenario
Header: `page` (lib → 8205 before / 8206 after), `vp` (d = `1280x800x1`, m = `390x844x1,mobile,touch`),
`path`, ready call. `S` = the open docked popover or dialog container (scenarios.md notation).

1. Set the viewport if `vp` differs from the page's current one (`emulate` / `browser_resize` 390×844).
2. Navigate to server + `path` (never paste `helpers.js` itself — the loader fetches it from 8299):
   - chrome-devtools: `navigate_page` `type: "url"`, `url`, `initScript` =
     `(()=>{try{const x=new XMLHttpRequest();x.open('GET','http://127.0.0.1:8299/helpers.js',false);x.send();(0,eval)(x.responseText);}catch(e){window.__dpLoadError=String(e);}})()`
   - playwright: `browser_navigate`, then `browser_evaluate`
     `async () => { const r = await fetch('http://127.0.0.1:8299/helpers.js'); (0, eval)(await r.text()); return !!window.__dp; }`.
   - `window.__dp` missing → read `window.__dpLoadError`; check §1a is listening; redo the navigation.
3. Run the ready call. `helpers.js` freezes transitions and animations for stable shots;
   `openStable()` lifts the freeze while it samples the opening frames.
4. Steps in order:
   - `DO <call>` → `evaluate_script` / `browser_evaluate` with `async () => await window.__dp.<call>`
     (`waitForStableDom: false`). Both phases; compare `→ EXPECT` only in after. Consecutive DO /
     CHECK steps without a KEY or SHOT between them may go in one evaluate call.
   - `CHECK <call> → EXPECT …` → after phase only.
   - `KEY <key>` → `press_key` / `browser_press_key`. Both phases.
   - `SHOT <name> root=<sel> ignore=<sel>` → both phases: `DO settle()`; screenshot (viewport) to
     `.verify/shots/<phase>/<scenario-id-with-/-replaced-by-_>-<name>-<vp>.png`
     (`take_screenshot` `filePath` / `browser_take_screenshot` `filename`, `scale: "css"`);
     fingerprint (skipped with `--no-baseline`) `() => window.__dp.fingerprint('<root>', '<ignore>')`
     to the same path under `.verify/fp/…` with `.json` (`evaluate_script` `filePath` /
     `browser_evaluate` `filename`). The screenshot and the fingerprint may share one message;
     the next step that changes the page goes in a later message.
5. End: `CHECK errors()` in both phases (record both; "new" = in after, not in before). Playwright:
   also `browser_console_messages` (errors). A `favicon.ico` 404 is known noise — ignore it.
6. A step failing in **before** → note it, continue. In **after** → record the failed
   expectation; skip the rest of that scenario except its SHOT steps.
7. After-phase failure with a baseline → rerun that scenario on the before page WITH its
   CHECK/EXPECT lines: fails there too = `broken-on-base`, passes = `regression`.
8. Dates depend on today: compare `<iso>` / `<today>` placeholders against what the step
   returned, never against a date written in scenarios.md.

## Step 5 — Compare and classify
1. Normalize all fingerprints (Bash):
   ```bash
   find .verify/fp -name '*.json' -print0 | xargs -0 -r node -e "const fs=require('fs');for(const f of process.argv.slice(1)){const s=fs.readFileSync(f,'utf8');if(s.startsWith('{\"root\"')&&s.trim().split('\n').length>1)continue;let d;try{d=JSON.parse(s)}catch{d=JSON.parse(s.slice(s.indexOf('{'),s.lastIndexOf('}')+1))}if(typeof d==='string')d=JSON.parse(d);fs.writeFileSync(f,[JSON.stringify({root:d.root,viewport:d.viewport,count:d.count,missing:d.missing||false}),...(d.nodes||[]).map(n=>JSON.stringify(n))].join('\n')+'\n')}"
   ```
2. `git diff --no-index --stat -- .verify/fp/before .verify/fp/after 2>/dev/null` → changed files
   (stderr carries LF→CRLF warnings only; exit code 1 just means "differs"). For each:
   `git diff --no-index -U0 -- <before> <after> 2>/dev/null` (which nodes/styles changed), then
   Read both PNGs. Identical fingerprints → don't open the PNGs.
3. Verdicts:
   - **intended** — the difference is in the area the task changed (task context +
     `git diff --stat <base>`) and looks like that change.
   - **regression** — difference outside the intended change; visual break (overlap, clipping,
     misalignment, missing element, unreadable contrast, a layout jump in `openStable`); failed
     expectation; new error.
   - **broken-on-base** — expectation failing on before too.
   - **unclear** — cannot tell; say why. `/verify` run without task context → visual differences
     are `unclear` with a description, never `intended`.
4. Owners: `styles/` → `styling-themes`; `managers/calendar|swipe|pickers|renderers` →
   `calendar-engine-dev`; `managers/range`, `datepicker/`, `utils/`, managers in `managers/` →
   `core-architect` (range DOM → `calendar-engine-dev`); ARIA / keyboard / focus semantics →
   `accessibility`; build / package → `build-release`.
5. New `broken-on-base` library bugs → append a row to `docs/not_to_commit_this/verify-findings.md`
   (create it with a `| Area | What happens vs expected | file:line | Owner | Repro |` table if
   missing). Log only — fixing is a separate task the user starts.
6. Write `.verify/SUMMARY.md`:
   ```markdown
   # /verify — <RUN_ID>
   MCP: <chrome-devtools|playwright> · Base: <ref> · Baseline: <yes|no> · Profile: <quick|full>
   Tags: <@smoke, @presets (← app/src/styles/components/_presets.scss), …>

   ## Verdicts
   | Scenario | Shot / step | VP | Verdict | Evidence | Owner |
   |---|---|---|---|---|---|

   ## Expectations (after)
   | Scenario | Step | Expected | Observed | Result |
   |---|---|---|---|---|

   ## New errors (after)
   ## Package check (with --package)
   ## Uncovered changes → proposed impact-map rows
   ## Notes (blocked steps, MCP switch, no baseline and why, server log tails)
   ```

## Step 6 — Stop servers (always, also after any failure in Steps 3-5)
servers.md §5 (TaskStop for every task id, then the port kill — TaskStop alone leaves node
listening on Windows); the count must be `0`. Then unlink the junction (servers.md §0 "unlink
junction" row) so a later manual delete of `.verify/` cannot reach `app/node_modules`.

## Step 7 — Report (in Polish)
Relay SUMMARY.md briefly: MCP, baseline, counts per verdict, each regression (PNG paths + owner),
broken-on-base (newly logged), uncovered + proposed rows, new errors. Offer to route regressions
to their owners (they only edit code; you run `/verify` again afterwards). Fix nothing inside
`/verify`.

## Guardrails
- Main agent only — never dispatch a subagent for any part of `/verify`.
- Local only — never `npm publish`, deploy, `git push` or any remote-changing command.
- Never install or remove packages (`npm install` / `ci` / `uninstall` / `update` / `audit fix`),
  not even inside `.verify/` — missing `node_modules` → ask the user to run the install and wait.
- Git read-only — never `add` / `commit` / `stash` / `checkout` / `restore` / `reset` / … (HARD RULES §6).
- Never edit `app/` or `dist/` by hand; writes go to `.verify/**` and the findings log
  (`--package` builds also write `dist/`).
- Leave the user's own dev server (port 8006) running; /verify uses 8205 / 8206 / 8299 only.
- Junction safety — servers.md §0 / §6.
- Never a false PASS — every abort ends with an abort report, not a verdict.
- Maintenance — new demo section / option / uncovered file: propose scenario + map rows; add them
  after the user agrees.
