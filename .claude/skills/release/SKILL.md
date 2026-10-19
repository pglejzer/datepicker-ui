---
name: release
description: Cut a new datepicker-ui release. Use when the user wants to bump the version, prepare a release, or write/update the changelog and README for a release. Drives the build-release subagent in an audit → approve → apply flow, then runs tests and a sanity build. Does NOT git-commit/tag or npm-publish — proposes those for the user to run.
disable-model-invocation: true
---

# Release

Prepare a complete, consistent `datepicker-ui` release in one flow. This skill is a thin
orchestrator: the real work is done by the **`build-release`** subagent. The skill exists to
decide the version with you and to hold the **approval gate** the subagent can't run itself.

The version source of truth is the **root `package.json`** (`@pglejzer/datepicker-ui`) — the
ONLY `version` field a release changes. `app/package.json` (build workspace) keeps its own
version.

**The changelog is about the library.** `CHANGELOG.md` records changes to the published package
only. The demo in `app/docs/` and repo tooling (`.claude/`, CI) are never logged and never bump
the version. If a release touched only those, there is no library release to cut — say so.

## Arguments (optional)
- A version or bump type: `/release patch`, `/release minor`, `/release major`, or an explicit
  number `/release 0.2.0`. If omitted, the skill proposes a bump from the changes since the last
  release and asks you to confirm.
- `--apply-all` skips the approval prompt and applies the whole audited plan (still reports +
  sanity-builds at the end). Use only for an explicitly unattended run.

## Workflow

### Phase 1 — Decide the version (gate)
1. Read the current version from root `package.json`. Skim what changed since the last release
   (read-only `git log` / `git diff` against the last release tag/commit, plus the working tree)
   to judge magnitude. The branch name is a hint at intent.
2. Propose a bump with a one-line rationale. Pre-1.0 (`0.x.y`): breaking change → minor,
   feature or fix → patch. From 1.0.0 on: standard SemVer (breaking change to the public API,
   option groups, `getValue()` shape, exports or the `dp-ui` class contract → major, with
   migration notes).
3. **Use AskUserQuestion** to confirm the exact new version before anything else. If the user
   passed a version/bump as an argument, still confirm it.

### Phase 2 — Audit (read-only)
Dispatch the `build-release` subagent (Agent tool, `subagent_type: build-release`) in
**audit mode** with the confirmed new version and the list of changed files / commits you
gathered (the subagent runs no git). The prompt starts with the HARD RULES line from
`CLAUDE.md` §4. Ask it to return a file-level plan, making NO edits:
1. Every place that must be bumped (root `package.json`; README snippets/badges; README sections
   affected by this release).
2. The historical version references it will leave untouched.
3. A drafted **CHANGELOG.md** entry (`## [x.y.z] - YYYY-MM-DD` with the date the user gave, else
   `Unreleased`; grouped Added/Changed/Fixed/…; entries per `.claude/rules/writing.md`) derived
   from the actual changes — not invented.
4. Any `package.json` contract issue that affects this release (`exports`, `sideEffects`,
   `files`).

### Phase 3 — Present & approve (gate)
Relay the plan concisely: proposed version, the drafted changelog, the bump list, and the
"leave historical" list. **Use AskUserQuestion** to approve as-is, edit the changelog copy, set
the release date (or keep `Unreleased`), or narrow scope. Capture the approved version + final
changelog text. Do not skip this gate unless `--apply-all` was passed.

### Phase 4 — Apply
Dispatch `build-release` again in **apply mode** with the approved version and final changelog.
It edits root `package.json`, README and `CHANGELOG.md`, bumping only current-version references.

### Phase 5 — Sanity build & report
- Run the checks and a build (main agent, from `app/`): `npm run lint && npm run typecheck &&
  npm test && npm run build && npm run check:package`, then `npm pack --dry-run` from the repo
  root to list the published files, then a click-through of every demo section in `npm run dev`.
  Report pass/fail with the real output — never claim green without running it, and name the
  known gaps from `CLAUDE.md` that are still open (e.g. lint debt) instead of hiding them. Skip a
  step only when the user says so.
- Convert files the subagent created to CRLF.
- Summarize: new version, every file changed, and confirmation that `exports` / `sideEffects` /
  entry points / zero-dependency are intact.
- **Propose the release commands for the user to run** — git is theirs: a commit message, the
  tag (`vX.Y.Z`), and the publish step (`npm publish --access public` from the repo root, after
  `npm run build`). Do NOT run `git add/commit/tag/push` or `npm publish` yourself.

## Guardrails
- One source of truth for the version (root `package.json`); never touch `app/package.json`'s
  `version`.
- Never rewrite historical version references or past changelog entries.
- Keep `.claude/` and library files CRLF.
- This skill prepares a release; it does not execute git or npm publish.
