# Debug Gamma Findings — Platform & Environmental Issues

**Investigator:** Debug Gamma (Environmental & Platform Specialist)
**Date:** 2026-02-28
**Scope:** Issues #732, #706, #682, #690, #686, #750

---

## Issue #732: plan-phase agent chain freezes on Windows — Bun runtime stdio deadlock
**Reporter:** min-hinthar | **Date:** recent | **Platform:** Claude Code on Windows (Bun runtime)

**Root Cause:** Multi-factor. The primary root cause is a Claude Code platform issue (orphaned subagents + MCP server duplication, filed upstream as anthropics/claude-code#28126) that GSD's multi-agent architecture amplifies. GSD-layer contributing factors:

1. `plan-phase.md` spawns three heavyweight `Task()` agents sequentially (gsd-phase-researcher → gsd-planner → gsd-plan-checker) with no `max_turns` limit. If any agent's API call hangs, the parent blocks indefinitely with no timeout.
2. Each subagent inherits MCP servers from the parent, multiplying `node.exe` processes. After 2-3 freeze+restart cycles, 30+ orphaned processes consume enough RAM to guarantee future freezes.
3. No cleanup of stale `~/.claude/tasks/{uuid}/` directories on session init — these accumulate across crashes.

**Affected Code:**
- `get-shit-done/workflows/plan-phase.md` lines ~209-380: `Task()` calls for researcher, planner, checker — none include `max_turns` parameter
- `get-shit-done/bin/gsd-tools.cjs`: no `~/.claude/tasks/` cleanup in `state load` or init paths
- No GSD-side timeout or recovery mechanism for hung agents

**Severity:** high

**Platform Scope:** Windows primarily (Bun runtime exacerbates MCP process orphaning), but all platforms affected by missing `max_turns`

**Our PR Coverage:** not covered by #821, #822, or #823

**Fixable in GSD?:** partially — the platform bug requires Claude Code upstream fix, but GSD can add mitigations

**Recommended Fix:**
1. Add `max_turns=50` to each `Task()` call in `plan-phase.md` for gsd-phase-researcher, gsd-planner, gsd-plan-checker — prevents infinite waits
2. Use Sonnet (not inherited Opus) for `gsd-phase-researcher` — lighter agent less likely to overflow context or hang
3. Add a stale task dir sweep in `gsd-tools.cjs` `state load` or a new `cleanup` subcommand: scan `~/.claude/tasks/` for dirs older than 24h and remove them
4. Add Windows-specific docs: "If GSD freezes, run `taskkill /F /IM node.exe && rmdir /s ~/.claude/tasks` then restart"

**Quick Win?:** Partially — `max_turns` addition to Task calls is low-risk and immediately protective. The cleanup utility is a straightforward addition to `gsd-tools.cjs`.

---

## Issue #706: OpenCode gsd-tools.js is 823 lines behind Claude Code gsd-tools.cjs — missing commands cause runtime errors
**Reporter:** rtenggario | **Date:** recent | **Platform:** OpenCode (oh-my-opencode v3.7.4) on Linux

**Root Cause:** There is no separate `gsd-tools.js` source file for OpenCode in the repository — the installer copies `get-shit-done/bin/gsd-tools.cjs` (and its `lib/` modules) to the OpenCode install location via `copyWithPathReplacement()`. However, the installer's global install logic (`npx get-shit-done-cc --global`) only targets the Claude Code config directory (`~/.claude/`). OpenCode's pre-existing copy at `~/.config/opencode/get-shit-done/bin/gsd-tools.cjs` is NOT updated because the installer doesn't detect and re-install to all already-installed runtimes simultaneously.

The divergence occurs when:
1. User installs GSD for both runtimes at different times
2. Runs `npx get-shit-done-cc --global` (Claude Code default) without `--opencode` flag
3. Only `~/.claude/` gets updated; `~/.config/opencode/` keeps the older version

**Affected Code:**
- `bin/install.js` lines ~50-57: runtime selection — `selectedRuntimes` is built from flags; without `--opencode`, OpenCode is never updated
- No auto-detection logic for "update all installed runtimes" when running without flags
- `get-shit-done/bin/gsd-tools.cjs` (592 lines in repo) + `lib/` modules — this is the single source of truth; there is no separate `.js` version

**Severity:** high — causes "Unknown subcommand" runtime errors for OpenCode users who installed both runtimes and only update one

**Platform Scope:** OpenCode users who have both Claude Code and OpenCode installed (multi-runtime users)

**Our PR Coverage:** not covered by #821, #822, #823

**Fixable in GSD?:** yes

**Recommended Fix:**
1. In the installer's interactive mode and `--global` default path, detect all already-installed runtimes by probing `~/.config/opencode/get-shit-done/VERSION`, `~/.gemini/get-shit-done/VERSION`, etc. — offer to update all detected installs in a single run.
2. OR: Add a `--all-installed` flag that discovers and updates every detected runtime installation.
3. Document clearly in update instructions: "If using multiple runtimes, re-install with `--all` to update all copies."
4. Consider a single post-install validation step: compare VERSION files across all detected runtime installs and warn when they diverge.

**Quick Win?:** yes — the detection logic is straightforward and the installer already knows each runtime's config path

---

## Issue #682: OpenCode hooks have hardcoded .claude paths
**Reporter:** rtenggario | **Date:** recent | **Platform:** OpenCode on Linux

**Root Cause:** The hook source files in `hooks/` use hardcoded `'.claude'` string literals in `path.join()` calls. The installer templates these by replacing `'\.claude'` with the runtime-specific config dir string, but the templating is incomplete:

1. **`hooks/gsd-check-update.js` line 16:** `path.join(cwd, '.claude', 'get-shit-done', 'VERSION')` — the project-local version check. The installer's regex `/'\.claude'/g` matches `'.claude'` as a single quoted argument. In `path.join(cwd, '.claude', ...)`, `'.claude'` IS present as a quoted string and SHOULD be replaced. However, the installed hook at the OpenCode location may show the bug if the `hooks/dist/` build step wasn't run properly before publishing — the `hooks/dist/` directory doesn't exist in the repo until `npm run build:hooks` runs (it's generated by `scripts/build-hooks.js` via `prepublishOnly`). If contributors test locally from repo without building, hooks are installed from the wrong path.

2. **`commands/gsd/gsd-reapply-patches.md` lines 17, 20:** Bash script hardcodes `.claude` paths:
   ```bash
   PATCHES_DIR="${HOME}/.claude/gsd-local-patches"
   PATCHES_DIR="./.claude/gsd-local-patches"
   ```
   The `copyWithPathReplacement()` function in `install.js` replaces `~/.claude/` with the correct prefix in `.md` files, but only replaces the global `~/` pattern — the local `./\.claude/` is replaced with `./${dirName}/`. For OpenCode where `dirName` is `.opencode`, this becomes `./.opencode/gsd-local-patches`. This particular replacement SHOULD work. However, the bash variable expansion `${HOME}/.claude/` may not match the global regex which is `~\/\.claude\/` (matches only tilde expansion, not `$HOME`).

3. **`workflows/update.md` lines 16-17, 163:** Similar bash hardcodes with `$HOME` expansion instead of tilde.

**Affected Code:**
- `hooks/gsd-check-update.js` lines 12, 16, 17: path.join with `'.claude'` literals
- `commands/gsd/gsd-reapply-patches.md` lines 17, 20: `$HOME/.claude/` pattern not replaced by `~/\.claude/` regex
- `workflows/update.md` lines 16-17, 163: same `$HOME` vs `~` mismatch
- `bin/install.js` line 1998: `content.replace(/'\.claude'/g, configDirReplacement)` — only catches single-quoted JS strings, misses bash `$HOME/.claude/` patterns
- `bin/install.js` line 1069+: `copyWithPathReplacement()` replaces `~\/\.claude\/` but not `\$HOME\/\.claude\/`

**Severity:** medium — breaks patch apply and update workflows for OpenCode users

**Platform Scope:** OpenCode users only

**Our PR Coverage:** not covered by #821, #822, #823

**Fixable in GSD?:** yes

**Recommended Fix:**
1. Add `$HOME/.claude/` → `$HOME/{opencode-dir}/` replacement in `copyWithPathReplacement()` for `.md` files:
   ```javascript
   content = content.replace(/\$HOME\/\.claude\//g, `$HOME/${dirName}/`);
   ```
2. Extract a shared `detectConfigDir()` helper into the hook source files (as suggested by reporter) to eliminate templating complexity:
   ```js
   function detectConfigDir(baseDir) {
     const dirs = ['.config/opencode', '.opencode', '.claude'];
     for (const d of dirs) {
       if (fs.existsSync(path.join(baseDir, d, 'get-shit-done'))) return path.join(baseDir, d);
     }
     return path.join(baseDir, '.claude');
   }
   ```
3. Update `workflows/update.md` and `commands/gsd/gsd-reapply-patches.md` to use tilde (`~/`) instead of `$HOME/` for consistent path replacement.

**Quick Win?:** yes — the `$HOME` vs `~` regex gap is a one-line fix in `copyWithPathReplacement()`

---

## Issue #690: Click to expand isn't clickable in Cursor
**Reporter:** Romeo-mz | **Date:** recent | **Platform:** Claude Code running inside Cursor 2.5.17's integrated terminal

**Root Cause:** This is a platform capability mismatch, not a GSD bug. The "click to expand" interaction is a Claude Code UI feature built into Claude Code's own output renderer — it creates collapsible tool-output blocks that users can expand by clicking. This interactivity relies on Claude Code's terminal UI layer (likely using terminal escape sequences or a TUI framework that Cursor's integrated terminal partially suppresses).

When running Claude Code inside Cursor's terminal, Cursor renders a standard PTY terminal that does not pass through Claude Code's interactive UI events. The clickable expand areas become non-interactive text. GSD itself never emits "click to expand" instructions — Claude Code generates these automatically when tool output is too long to display inline.

**Affected Code:** None in GSD — this is a Cursor/Claude Code interop issue. GSD has no code that emits clickable UI elements.

**Severity:** low for GSD; medium for user experience on Cursor

**Platform Scope:** Cursor users only (running Claude Code inside Cursor's integrated terminal)

**Our PR Coverage:** not applicable

**Fixable in GSD?:** not directly — requires either Cursor to improve terminal compatibility or Claude Code to detect limited terminal environments and disable collapsible output

**Recommended Fix (GSD-side mitigation):**
1. Add a note in GSD's `docs/troubleshooting.md` or FAQ: "When running Claude Code inside Cursor's integrated terminal, tool output may not be expandable. Use Claude Code's standalone desktop app or a full terminal emulator for interactive output."
2. Optionally, GSD workflows could reduce verbosity of individual tool calls by batching file reads or compressing output — this reduces the frequency of collapsed-output blocks.
3. The real fix belongs to Cursor (add Claude Code terminal UI event passthrough) or Claude Code (detect limited TTY and emit plain text).

**Quick Win?:** docs only — the underlying problem requires upstream fixes

---

## Issue #686: Auto-advance chain freezes at execute-phase — nested Claude Code session error
**Reporter:** johnny2678 | **Date:** recent | **Platform:** Claude Code (standard)

**Root Cause:** When `plan-phase` auto-advances to execute-phase (step 14), it spawns execute-phase as a `Task(subagent_type="general-purpose")`. This general-purpose agent receives the execute-phase workflow via `@file` references in its prompt. However, older versions and potentially current versions of this agent may fall back to invoking `claude --model sonnet --print -p` via Bash when it doesn't understand it should use the `Task` tool internally — because `general-purpose` agents don't have the execute-phase execution context as part of their system prompt, they may interpret `/gsd:execute-phase` as a CLI command.

**Current state (repo HEAD):** `plan-phase.md` step 14 (around line 462-490) now explicitly passes `@~/.claude/get-shit-done/workflows/execute-phase.md` in the `execution_context` and includes instructions "Do NOT use the Skill tool or /gsd: commands." This mitigates the immediate Bash invocation problem, but the nested Task nesting (discuss → plan → execute → executor = 4 levels) still causes issues:

1. The chain `general-purpose` agent at level 3 receives execute-phase.md workflow and spawns `gsd-executor` agents at level 4 via `Task()`. This is the deepest allowed nesting.
2. Git operations from level-4 agents may not persist (the commit recovery in PR #823 partially addresses this).
3. The `general-purpose` agent at level 3 doesn't have the `gsd-executor` agent definition, so it may spawn with wrong context.

The issue commenter's proposed architectural fix — using `SlashCommand` to flatten the chain so only the final executor agents are nested (1 level deep) — is NOT implemented in the current codebase.

**Affected Code:**
- `get-shit-done/workflows/plan-phase.md` lines ~462-490: `Task(subagent_type="general-purpose")` for execute-phase — still uses general-purpose, not a proper execute-phase agent
- `get-shit-done/workflows/discuss-phase.md` lines ~538-565: same pattern for plan-phase
- Root issue: `general-purpose` subagent_type has no execute-phase workflow built in and must rely on `@file` context injection

**Severity:** high — the entire auto-advance chain (`--auto` flag) is unreliable

**Platform Scope:** all Claude Code users using `--auto` flag or `workflow.auto_advance: true`

**Our PR Coverage:** PR #823 partially addresses symptom (commit recovery from deep nesting, issue #668) but does NOT fix the root cause (nested session error / wrong agent type for execute-phase)

**Fixable in GSD?:** yes

**Recommended Fix:**
The cleanest fix (as proposed in issue #686 comments) is to replace `Task(general-purpose)` with `SlashCommand` for the plan→execute auto-advance transition:
```
# Instead of spawning a nested Task:
# Task(prompt="...", subagent_type="general-purpose") ← WRONG
# Use SlashCommand to invoke execute-phase at the same level:
SlashCommand("/gsd:execute-phase ${PHASE} --auto --no-transition")
```

This flattens the chain so executor agents are only 1 level deep (instead of 3-4), eliminates the nested-session problem entirely, and matches how `transition.md` already chains between phases.

**Quick Win?:** yes — replacing 10 lines of Task spawn with a SlashCommand invocation, following the pattern already used in `transition.md`

---

## Issue #750: Gemini install uses invalid PostToolUse hook event (should be AfterTool)
**Reporter:** davidste | **Date:** recent | **Platform:** Gemini CLI (gemini 0.29.7)

**Root Cause:** The installer registers the context-monitor hook under `settings.hooks.PostToolUse` for Gemini, but Gemini CLI uses `AfterTool` as its hook event name (not `PostToolUse` which is Claude Code's naming). The install path for Gemini shares the hook registration block with Claude Code — both runtimes pass through the `if (!isOpencode)` branch at `install.js` line ~2059, which unconditionally uses `PostToolUse`.

**Exact code path:**

```javascript
// bin/install.js line ~2059-2103
if (!isOpencode) {              // ← Gemini hits this branch
  // ...
  // Configure PostToolUse hook for context window monitoring
  if (!settings.hooks.PostToolUse) {
    settings.hooks.PostToolUse = [];    // ← Wrong event name for Gemini
  }
  // ...
  settings.hooks.PostToolUse.push({    // ← Installs under wrong key
    hooks: [{ type: 'command', command: contextMonitorCommand }]
  });
}
```

The uninstall path at `install.js` lines ~1406-1423 has the same error — it only cleans up `PostToolUse`, so even if a user manually moves the hook to `AfterTool`, the uninstaller won't find and remove it.

Additionally:
- `hooks/gsd-context-monitor.js` line 2: comment says `PostToolUse hook`
- `hooks/gsd-context-monitor.js` line 112: outputs `hookEventName: "PostToolUse"` in hook metadata — wrong for Gemini
- `docs/context-monitor.md` lines 3, 40, 66, 77: all reference `PostToolUse` without noting the Gemini distinction

**Affected Code:**
- `bin/install.js` lines ~2083-2097: install registers `settings.hooks.PostToolUse` for all non-OpenCode runtimes including Gemini — should use `AfterTool` for Gemini
- `bin/install.js` lines ~1406-1423: uninstall only removes from `PostToolUse` — misses `AfterTool` for Gemini
- `hooks/gsd-context-monitor.js` line 2 and line 112: hardcoded `PostToolUse` label — should be runtime-aware
- `docs/context-monitor.md` lines 3, 40, 66, 77: documentation uses `PostToolUse` without Gemini-specific note

**Severity:** medium — context monitor is silently disabled for all Gemini users, and a warning appears on every session start

**Platform Scope:** Gemini CLI users only

**Our PR Coverage:** not covered by #821, #822, #823

**Fixable in GSD?:** yes

**Recommended Fix:**
1. Split the hook registration by runtime in `install.js`:
   ```javascript
   const hookEventName = isGemini ? 'AfterTool' : 'PostToolUse';
   if (!settings.hooks[hookEventName]) {
     settings.hooks[hookEventName] = [];
   }
   const hasContextMonitorHook = settings.hooks[hookEventName].some(entry =>
     entry.hooks && entry.hooks.some(h => h.command && h.command.includes('gsd-context-monitor'))
   );
   if (!hasContextMonitorHook) {
     settings.hooks[hookEventName].push({ hooks: [{ type: 'command', command: contextMonitorCommand }] });
   }
   ```
2. Fix uninstall to clean up both `AfterTool` and `PostToolUse` (backward compat migration):
   ```javascript
   for (const eventName of ['PostToolUse', 'AfterTool']) {
     if (settings.hooks && settings.hooks[eventName]) { /* filter GSD entries */ }
   }
   ```
3. Update `docs/context-monitor.md` to show `AfterTool` for Gemini examples.
4. Update `hooks/gsd-context-monitor.js` to output the correct `hookEventName` based on which event triggered it (or make it generic: `hookEventName: process.env.GEMINI_API_KEY ? "AfterTool" : "PostToolUse"`).

**Quick Win?:** yes — the install.js fix is ~5 lines; the uninstall backward-compat adds ~5 more. High visibility impact (fixes every Gemini install).

---

## Summary Table

| Issue | Severity | Platform Scope | Our PR Coverage | Fixable in GSD | Quick Win |
|-------|----------|---------------|-----------------|----------------|-----------|
| #732 — Windows Bun stdio deadlock | high | Windows primarily | not covered | partially | partial (max_turns) |
| #706 — OpenCode gsd-tools.js behind | high | OpenCode multi-runtime users | not covered | yes | yes |
| #682 — OpenCode hardcoded .claude paths | medium | OpenCode users | not covered | yes | yes ($HOME fix) |
| #690 — Cursor click-to-expand non-functional | low | Cursor terminal users | not applicable | no (upstream) | docs only |
| #686 — Auto-advance nested session error | high | All Claude Code --auto users | PR #823 partial (symptom only) | yes | yes (SlashCommand) |
| #750 — Gemini invalid PostToolUse hook | medium | All Gemini users | not covered | yes | yes |

## Cross-Cutting Observations

**OpenCode is a second-class runtime.** Issues #706 and #682 both stem from the same structural problem: OpenCode was added as a runtime after the codebase matured, and the templating + update pipeline wasn't designed for multi-runtime parity from the start. A dedicated OpenCode integration test suite (verify-install, then invoke each command, check no `.claude` paths remain) would catch these regressions automatically.

**Hook event naming diverges across runtimes.** Issue #750 is the most concrete example, but it reflects a pattern: Claude Code's hook event names (`PreToolUse`, `PostToolUse`, `SessionStart`) are not universal. Any future runtime support will face the same naming divergence. Consider a `HOOK_EVENTS` mapping in install.js: `{ claude: { postTool: 'PostToolUse' }, gemini: { postTool: 'AfterTool' } }`.

**Auto-advance architecture (issue #686) is the highest-impact quick fix.** The `SlashCommand` approach flattens a 4-level deep Task nesting to 1 level. This affects every user of the `--auto` flag, which is a core workflow feature. The fix is small (~10 lines) and follows an existing pattern (transition.md). It should be prioritized.

**Issue #732 is the most platform-specific.** The Windows/Bun deadlock has a clear Claude Code upstream component. GSD mitigations (max_turns, cleanup) reduce exposure but won't eliminate the problem until Claude Code fixes the MCP process duplication issue. This is lower priority for a GSD PR but worth documenting in troubleshooting docs.
