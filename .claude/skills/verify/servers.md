# /verify — server recipes

Main agent only. Paths are relative to the repo root (`ROOT=$(git rev-parse --show-toplevel)` in
Bash). The **Tool** column says which shell runs a command. Start every server with
`run_in_background: true` and keep its task id for §5. Logs go to `.verify/logs/`.
`<base>` = base ref (default `HEAD`); `<RUN_ID>` comes from §4. Everything here is local —
never publish, deploy or push, and never install or remove packages (`npm install` / `ci` /
`uninstall` / `update` are the user's job; ask and wait when `node_modules` is missing).

Ports: 8205 lib before, 8206 lib after, 8299 helpers. They differ from timepicker-ui's `/verify` (8105 / 8106 / 8199), so
both projects can run a check at the same time — never kill a process on those ports. The user's own `npm run dev` (8006) is
left alone — /verify never uses or stops it.

## §0 Preflight (always, in this order)

| Check | Tool | Command | Pass | On failure |
|---|---|---|---|---|
| Node ≥ 22 | Bash | `node -p "process.versions.node.split('.')[0]"` | `>= 22` | stop: "Switch to Node 24 (`.nvmrc`)." |
| app deps | Bash | `test -f app/node_modules/.bin/vite && echo ok` | `ok` | stop: ask the user to run `npm install` in `app/` (agents never install packages). |
| base ref | Bash | `git rev-parse --verify "<base>^{commit}"` | a sha | stop: "Unknown --base `<base>`." |
| base has the rewrite | Bash | `git cat-file -e "<base>:app/src/datepicker/CoreState.ts" 2>/dev/null && git cat-file -e "<base>:app/vite.config.ts" 2>/dev/null && echo ok` | `ok` | no baseline: the base predates the rewrite (or the Vite demo), so run as `--no-baseline` and say so in the report. |
| ports free | PowerShell | `@(Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue \| Where-Object { $_.LocalPort -in 8205,8206,8299 } \| Select-Object LocalPort,OwningProcess)` | empty | stop, show ports + PIDs (likely a leftover `/verify`); offer §5 step 2, re-run preflight after the user agrees |
| unlink junction | PowerShell | `if (Test-Path .verify\work\before\app\node_modules) { cmd /c rmdir .verify\work\before\app\node_modules }` | — | — |
| reset run dirs | Bash | `rm -rf .verify/work .verify/shots .verify/fp .verify/SUMMARY.md && mkdir -p .verify/work/before .verify/logs .verify/shots .verify/fp` | — | — |

Unlink the junction (`cmd /c rmdir`) BEFORE any recursive delete under `.verify/work`. Never
`Remove-Item -Recurse` or `rm -rf` while it is linked — that deletes `app/node_modules`.

## §1 Library servers

1. Extract the base (Bash) — skip with `--no-baseline`:
   ```bash
   git archive --format=tar "<base>" app package.json | tar -x -C .verify/work/before
   ```
2. Link dependencies (PowerShell) — skip with `--no-baseline`:
   ```powershell
   New-Item -ItemType Junction -Path .verify\work\before\app\node_modules -Target (Resolve-Path app\node_modules) | Out-Null
   ```
3. Before server (Bash, background) — skip with `--no-baseline`:
   ```bash
   ROOT=$(git rev-parse --show-toplevel); cd "$ROOT/.verify/work/before/app" && npx vite --port 8205 --strictPort --open false > "$ROOT/.verify/logs/lib-before.log" 2>&1
   ```
4. After server (Bash, background):
   ```bash
   ROOT=$(git rev-parse --show-toplevel); cd "$ROOT/app" && npx vite --port 8206 --strictPort --open false > "$ROOT/.verify/logs/lib-after.log" 2>&1
   ```
5. §3 for `http://localhost:8205/` (if started) and `http://localhost:8206/`. Vite answers in a
   few seconds; the first page load compiles the SCSS, so the ready call waits for it.

## §1a Helpers server (always, before any browser work)

Serves `helpers.js` so pages load it with a tiny loader instead of pasting the file into every
navigation. Bash, background:

```bash
node -e "require('http').createServer((q,s)=>{s.setHeader('Access-Control-Allow-Origin','*');s.setHeader('Cache-Control','no-store');s.setHeader('Content-Type','text/javascript; charset=utf-8');s.end(require('fs').readFileSync('.claude/skills/verify/helpers.js'))}).listen(8299,'127.0.0.1')" > .verify/logs/helpers-server.log 2>&1
```

Then §3 for `http://127.0.0.1:8299/`.

## §2 Package check (`--package` only)

The build writes `dist/` (allowed); nothing is packed into or installed anywhere. Bash, from `app/`:

```bash
npm run build > ../.verify/logs/build.log 2>&1 && npm run check:package > ../.verify/logs/check-package.log 2>&1; echo "exit $?"
```

A non-zero exit is a finding: `tail -n 40` of the log into the report.

## §3 Readiness

Bash, tool `timeout` 200000 per URL:

```bash
node -e "const u=process.argv[1],ms=+process.argv[2],t=Date.now();(async function p(){try{const r=await fetch(u);if(r.ok){console.log('up',u,r.status);process.exit(0)}}catch{}if(Date.now()-t>ms){console.error('timeout',u);process.exit(1)}setTimeout(p,1000)})()" <url> 180000
```

Only a 2xx answer counts. `timeout` → `tail -n 40 .verify/logs/<log>` into the report, stop
that server (§5); a failed before server → the run continues with no baseline.

## §4 Run id

Bash: `date +%Y%m%d-%H%M%S` → `<RUN_ID>` (SUMMARY.md header).

## §5 Stop (always — also after any failure)

1. Stop every background task you started (TaskStop with each task id; load it via ToolSearch
   `select:TaskStop` if needed). On Windows this stops only the shell wrapper — the node server
   keeps listening, so step 2 is mandatory, never optional.
2. Kill anything still listening on the test ports (PowerShell):
   ```powershell
   Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue | Where-Object { $_.LocalPort -in 8205,8206,8299 } | ForEach-Object { taskkill /T /F /PID $_.OwningProcess | Out-Null }; exit 0
   ```
3. Confirm — must print `0` (PowerShell):
   ```powershell
   @(Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue | Where-Object { $_.LocalPort -in 8205,8206,8299 }).Count
   ```

## §6 Clean (`/verify --clean`)

1. §5.
2. PowerShell: `if (Test-Path .verify\work\before\app\node_modules) { cmd /c rmdir .verify\work\before\app\node_modules }`
3. Bash: `test -f app/node_modules/.bin/vite && rm -rf .verify && echo cleaned`
   (if `app/node_modules` is already missing, stop and tell the user instead of deleting).
