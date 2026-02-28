# Debug Alpha Findings: Path/Config/Install Bugs

Investigation date: 2026-02-28
Investigator: Debug Alpha (Primary Hypothesis Investigator)

---

## Issue #820: gsd-tools.cjs path hardcodes $HOME, breaks local installs

**Reporter:** oren-hollander | **Date:** 2026-02-27
**Root Cause:** All workflow and reference `.md` files in the GSD source package use `$HOME/.claude/get-shit-done/bin/gsd-tools.cjs` as the path to the CLI. During installation, the installer (`bin/install.js`) performs path replacement via `copyWithPathReplacement()` (line 1069), which replaces `~/.claude/` with the computed `pathPrefix`. For **global** installs, `pathPrefix` is the full absolute path (e.g., `/Users/foo/.claude/`); for **local** installs, it's `./.claude/`. However, the source files use `$HOME/.claude/` (shell variable syntax), not `~/.claude/` (tilde syntax). The regex at line 1091 (`/~\/\.claude\//g`) only matches `~/.claude/`, so the `$HOME/.claude/` references in the source are **never replaced** during installation. This means the 128 occurrences across 35 files that use `$HOME/.claude/` always point to the global path, regardless of install type.

**Affected Code:**
- `bin/install.js:1091` -- regex only matches `~/.claude/`, not `$HOME/.claude/`
- 128 occurrences of `$HOME/.claude/get-shit-done/bin/gsd-tools.cjs` across 35 files in `get-shit-done/workflows/` and `get-shit-done/references/`
- The source files use `$HOME` (shell expansion) while the installer replaces `~` (tilde expansion) -- these are two different syntaxes for the home directory

**Severity:** critical -- all gsd-tools.cjs calls fail for local installs, making GSD completely non-functional in local install mode

**Our PR Coverage:** Not covered by PRs #821, #822, or #823

**Recommended Fix:** Two options:
1. Add a second regex to `copyWithPathReplacement()` to also replace `$HOME/.claude/` patterns: `const homeVarRegex = /\$HOME\/\.claude\//g;` then `content = content.replace(homeVarRegex, pathPrefix);`
2. Or standardize source files to use `~/.claude/` instead of `$HOME/.claude/` (larger change, 128 occurrences)

Option 1 is safer -- add the regex alongside the existing tilde regex. However, note that the source files intentionally use `$HOME` because these are bash snippets that get executed in shell context, where `$HOME` expands correctly but `~` does NOT expand inside double quotes. The real fix is that the installer should also replace `"$HOME/.claude/"` patterns.

**Quick Win?:** yes -- single regex addition to `bin/install.js:copyWithPathReplacement()` (and the parallel function `copyFlattenedCommands`)

---

## Issue #790: commit_docs: false is ignored, .planning/ files still committed

**Reporter:** AbdelrhmanHamouda | **Date:** 2026-02-25
**Root Cause:** Multi-layered failure with two distinct causes:

**Cause 1 (primary): Raw git commands bypass the commit gate.** Two workflow files perform raw `git add .planning/` + `git commit` without checking `commit_docs`:
- `workflows/plan-phase.md:503-505` (auto-advance recovery)
- `workflows/discuss-phase.md:580-582` (auto-advance recovery)

These bypass `gsd-tools.cjs commit` entirely, so the `commit_docs` check at `commands.cjs:224` never fires.

**Cause 2 (secondary): Silent fallback to defaults.** `loadConfig()` in `core.cjs:118` has a bare `catch` that returns `defaults` (which has `commit_docs: true`). If the config file fails to load for any reason -- wrong cwd from a subagent, file permission issue, malformed JSON -- the function silently defaults to `commit_docs: true`, causing commits even when the user set it to false.

**Cause 3 (interaction): isGitIgnored before our PR #821.** Without the `--no-index` flag, `isGitIgnored('.planning')` returns false for tracked files, so the gitignore safety net at `commands.cjs:231-235` also fails. This is addressed by our PR #821.

**Affected Code:**
- `get-shit-done/workflows/plan-phase.md:503-505` -- raw git add/commit bypasses commit gate
- `get-shit-done/workflows/discuss-phase.md:580-582` -- same pattern
- `get-shit-done/bin/lib/core.cjs:118-120` -- silent fallback to `commit_docs: true`
- `get-shit-done/bin/lib/commands.cjs:224-228` -- commit gate works correctly but is only effective when reached via `gsd-tools.cjs commit`

**Severity:** high -- user's explicit configuration is silently ignored across many workflows, causing 66+ unwanted commits in reporter's case

**Our PR Coverage:** Partially covered by PR #821 (isGitIgnored fix helps the safety-net path). The raw git add bypass in plan-phase.md and discuss-phase.md is NOT covered. The silent fallback in loadConfig is NOT covered.

**Recommended Fix:**
1. Wrap the auto-advance recovery `git add .planning/` calls in a `commit_docs` check (read config first)
2. Add warning logging in `loadConfig()` catch block instead of silent fallback
3. PR #821's `--no-index` fix provides a defense-in-depth layer

**Quick Win?:** Medium -- the auto-advance recovery paths need conditional logic, and there may be other raw git paths we haven't found

---

## Issue #760: RangeError crash in progress bar when summaries > plans

**Reporter:** kabanendenis | **Date:** 2026-02-22
**Root Cause:** In `cmdProgressRender()` (`commands.cjs:416`), the upstream code at the time of the issue computed `percent` without clamping:

```js
const percent = totalPlans > 0 ? Math.round((totalSummaries / totalPlans) * 100) : 0;
```

When `totalSummaries > totalPlans` (e.g., 18 summaries / 10 plans = 180%), the `filled` variable exceeded `barWidth`, causing `String.repeat(barWidth - filled)` to receive a negative number, crashing with `RangeError: Invalid count value`.

**Current state in our codebase:** The code at `commands.cjs:416` in our copy already includes `Math.min(100, ...)`:

```js
const percent = totalPlans > 0 ? Math.min(100, Math.round((totalSummaries / totalPlans) * 100)) : 0;
```

This clamp was verified present in `upstream/main:get-shit-done/bin/lib/commands.cjs:416`. The fix is already upstream.

**Affected Code:**
- `get-shit-done/bin/lib/commands.cjs:416` -- percent calculation
- `get-shit-done/bin/lib/commands.cjs:421-422` (table format) and `433-434` (bar format) -- bar rendering

**Severity:** critical -- causes an unhandled crash that also kills sibling tool calls in the same agent turn, breaking `/gsd:progress` entirely

**Our PR Coverage:** Not needed -- verified fixed in upstream/main (Math.min clamp present at commands.cjs:416)

**Recommended Fix:** Clamp percent to [0, 100] before use: `Math.min(100, Math.round(...))`. Our local copy already has this.

**Quick Win?:** yes -- one-line clamp (may already be fixed upstream)

---

## Issue #735: update workflow checks same path for LOCAL and GLOBAL installs

**Reporter:** j2h4u | **Date:** 2026-02-19
**Root Cause:** The original `update.md` had duplicate path checks:

```bash
if [ -f ./.claude/get-shit-done/VERSION ]; then
  echo "LOCAL"
elif [ -f ./.claude/get-shit-done/VERSION ]; then  # identical path!
  echo "GLOBAL"
```

**Current state:** This was already fixed in upstream commit `7715e6d` ("Fix /gsd:update to always install latest package (#719)"). The current `update.md` uses distinct variables:

```bash
LOCAL_VERSION_FILE="./.claude/get-shit-done/VERSION"
GLOBAL_VERSION_FILE="$HOME/.claude/get-shit-done/VERSION"
```

**Affected Code:** `get-shit-done/workflows/update.md` (version detection step)

**Severity:** medium -- global installs couldn't self-update (would report UNKNOWN)

**Our PR Coverage:** Not needed -- already fixed upstream in PR #719/commit `7715e6d`

**Recommended Fix:** Already fixed upstream. I left a comment on the issue noting this.

**Quick Win?:** Already resolved

---

## Issue #725: nyquist_validation_enabled always absent from init plan-phase JSON

**Reporter:** flavio-bongiovanni | **Date:** 2026-02-18
**Root Cause:** The issue reported that `loadConfig()` in `core.cjs` was missing `nyquist_validation` from its return object, so `config.nyquist_validation` was always `undefined` in `cmdInitPlanPhase()`, and `JSON.stringify` would drop the `undefined` key.

**Current state in our codebase:** The code at `core.cjs:113` already includes:

```js
nyquist_validation: get('nyquist_validation', { section: 'workflow', field: 'nyquist_validation' }) ?? defaults.nyquist_validation,
```

And `init.cjs:107` correctly references it:

```js
nyquist_validation_enabled: config.nyquist_validation,
```

This means the fix was already applied upstream after the issue was filed. The `loadConfig()` return object includes `nyquist_validation`, and `defaults.nyquist_validation` is `false` (line 79), so the value will always be present (never `undefined`).

**Affected Code:** `get-shit-done/bin/lib/core.cjs:113` and `get-shit-done/bin/lib/init.cjs:107`

**Severity:** medium -- Nyquist validation skip condition could never trigger, forcing unnecessary validation cycles

**Our PR Coverage:** Not needed -- already fixed upstream

**Recommended Fix:** Already fixed upstream. The one-line addition to `loadConfig()` return block was merged.

**Quick Win?:** Already resolved

---

## Issue #721: Global install corrupted when /gsd:update runs from $HOME

**Reporter:** jacobcxdev | **Date:** 2026-02-17
**Root Cause:** When CWD is `$HOME`, the local path `./.claude/get-shit-done/VERSION` resolves to the same file as `$HOME/.claude/get-shit-done/VERSION`. The version detection script (now fixed in #719 per issue #735) detects the global install as "LOCAL" because the local check always wins. The installer then runs `npx get-shit-done-cc --local`, which sets `pathPrefix = './.claude/'`, and `copyWithPathReplacement()` rewrites all absolute `~/.claude/` references to `./.claude/` -- corrupting 193 path references across 39 files.

**Self-reinforcing:** Once corrupted, the `update.md` file itself has `./.claude/` for both branches, so subsequent updates from any CWD perpetuate the corruption.

**Current state:** The version detection was partially improved by commit `7715e6d` (issue #735), which now uses separate variables. However, the fundamental `$HOME == CWD` collision is still present in the updated code:

```bash
LOCAL_VERSION_FILE="./.claude/get-shit-done/VERSION"
GLOBAL_VERSION_FILE="$HOME/.claude/get-shit-done/VERSION"
```

When CWD is `$HOME`, `LOCAL_VERSION_FILE` resolves to the same path as `GLOBAL_VERSION_FILE`. The `if` branch still wins because it checks local first. The fix in #719 added integrity validation (`MARKER_FILE` check + version format regex), but both checks pass for either install type since they're the same files.

**Affected Code:**
- `get-shit-done/workflows/update.md:22-30` -- version detection still has $HOME collision
- `bin/install.js:1842-1844` -- `pathPrefix` computation doesn't guard against $HOME == CWD
- `bin/install.js:1069-1094` -- `copyWithPathReplacement` blindly applies pathPrefix

**Severity:** critical -- corrupts an entire global installation, requiring full uninstall/reinstall; self-reinforcing loop prevents recovery via normal update

**Our PR Coverage:** Not covered by PRs #821, #822, or #823

**Recommended Fix:** The issue reporter's suggestion is correct: disambiguate by comparing canonical paths:

```bash
LOCAL_DIR="$(cd ./.claude 2>/dev/null && pwd)"
GLOBAL_DIR="$(cd "$HOME/.claude" 2>/dev/null && pwd)"

if [ -n "$LOCAL_DIR" ] && [ "$LOCAL_DIR" != "$GLOBAL_DIR" ] && [ -f "$LOCAL_VERSION_FILE" ]; then
  # Truly local install
elif [ -f "$GLOBAL_VERSION_FILE" ]; then
  # Global install
fi
```

Additionally, `bin/install.js` should guard `pathPrefix` computation: if `targetDir` resolves to `$HOME/.claude`, always use the global (absolute) prefix.

**Quick Win?:** Medium -- requires changes in both update.md (bash) and install.js (Node), and careful testing of the $HOME edge case

---

## Summary Matrix

| Issue | Severity | Fixed Upstream? | Our PRs Cover? | Quick Win? |
|-------|----------|-----------------|-----------------|------------|
| #820 | Critical | No | No | Yes |
| #790 | High | Partially (isGitIgnored) | Partially (#821) | Medium |
| #760 | Critical | Yes (Math.min clamp) | N/A | Resolved |
| #735 | Medium | Yes (#719) | N/A | Resolved |
| #725 | Medium | Yes | N/A | Resolved |
| #721 | Critical | No | No | Medium |

## Cross-Issue Patterns

1. **Path handling is fragile:** Issues #820, #721, and #735 all stem from inconsistent path representations (`$HOME` vs `~` vs `./` vs absolute). The installer's regex-based path replacement is a root cause for multiple bugs.

2. **Silent fallbacks hide bugs:** Issue #790's `loadConfig()` silently falls back to `commit_docs: true`. This pattern (bare `catch` returning permissive defaults) appears throughout the codebase and could mask other configuration issues.

3. **Bypass paths exist for critical gates:** The `commit_docs` gate works correctly in `gsd-tools.cjs commit`, but at least two workflow files bypass it entirely with raw `git add/commit`. Any centralized check needs to be the *only* path.

## Priority Recommendations

1. **#820** (new PR) -- High priority. Blocks all local installs. Simple regex addition.
2. **#721** (new PR) -- High priority. Corrupts global installs from $HOME. Needs careful path disambiguation.
3. **#790** (extend existing work) -- Medium priority. Partially addressed by our #821, but the raw git paths need fixing too.
4. **#760, #735, #725** -- Already fixed or likely fixed upstream. Verify and help close.
