# Feature Request Research Findings

**Researched:** 2026-02-28
**Analyst:** researcher agent
**Scope:** 7 issues from gsd-build/get-shit-done upstream

---

## Issue #817: Add support for Kimi CLI (Moonshot AI)
**Reporter:** intranefr | **Date:** 2025 | **Type:** feature-request
**Summary:** Add Kimi CLI (Moonshot AI's terminal AI coding agent) as a supported runtime alongside Claude, OpenCode, Gemini, and Codex. Requires converting GSD command/agent/hook formats to Kimi's Agent Skills format.

**Ecosystem Context:**
Kimi CLI is a real, active project at [github.com/MoonshotAI/kimi-cli](https://github.com/MoonshotAI/kimi-cli) with documented APIs. Key technical findings:

- **Skills format**: SKILL.md with YAML frontmatter — very close to Claude's `.claude/skills/` structure. Kimi already auto-discovers `~/.claude/skills/` as one of its layered lookup paths (alongside `~/.config/agents/skills/`, `~/.kimi/skills/`).
- **Tool name mapping required**: Kimi uses module-path tool names (`kimi_cli.tools.file:ReadFile`, `kimi_cli.tools.shell:Shell`) rather than Claude's `Read`, `Bash`, etc. A tool mapping table similar to the existing Claude→Gemini mapping is needed.
- **Agent format**: YAML with separate system prompt `.md` files — similar pattern to Gemini conversion already implemented.
- **Installer path**: `~/.config/agents/skills/` is Kimi's recommended XDG-compliant path; also `~/.kimi/`.
- **Agent Skills open standard**: Kimi participates in the same Agent Skills open standard that GSD's skill-creator project targets. GSD skills could potentially auto-load in Kimi without any conversion if placed in `~/.claude/skills/` (Kimi reads that path natively).
- **Critical nuance**: The reporter notes Kimi's approach is "intentionally different" from Claude, but the discovery that Kimi already scans `~/.claude/skills/` means basic skill loading may work without a separate Kimi-specific install path. A `--kimi` installer flag would still be valuable to ensure hooks and agents are properly configured.
- **Codex precedent**: The issue reporter correctly notes this follows the Codex support pattern — the existing Codex implementation provides a clear template.

**Feasibility:** moderate
**Impact:** moderate (Kimi/Moonshot has significant traction in Asian markets and growing global presence)
**Ecosystem Fit:** excellent — GSD's multi-runtime architecture was designed for exactly this kind of addition; Kimi's architecture is close to Gemini/Codex patterns already handled
**Effort:** medium feature (new installer branch + tool name mapping table + agent YAML conversion + hook event mapping + documentation)

**Recommendation:** accept

**Notes:**
- The reporter has done substantial homework and provided all the documentation links needed. This is a well-scoped, actionable request.
- Since Kimi already reads `~/.claude/skills/`, a lightweight "works with Kimi" note in docs might satisfy many users without any code changes. The fuller `--kimi` flag implementation is the right long-term answer.
- The Codex installer branch in `bin/install.js` is the right model to follow.
- No hooks system in Kimi CLI was found in the documentation — this should be confirmed before implementing hook conversion logic.

---

## Issue #749: Local LLM offloading for hook-level operations to save tokens
**Reporter:** davesienkowski | **Date:** 2025 | **Type:** feature-request/enhancement
**Summary:** Route GSD hook-level classification tasks (file intent, commit classification, artifact detection) to a local LLM (Ollama) instead of the frontier model, saving ~3,800 frontier tokens/session. Reporter claims working implementation with real production data.

**Ecosystem Context:**
- Reporter has real production data from 9 sessions, 200 routed calls, 0% fallback rate, ~34,400 frontier tokens saved. Hardware tested: RTX 3060 with `qwen2.5-coder:7b`.
- **Ollama integration pattern**: Ollama exposes an OpenAI-compatible REST API at `localhost:11434`. Hook scripts could POST to it directly — no SDK required, just `fetch()` or `curl`. Latency of ~2.3s on Windows (faster on Linux) is acceptable for non-interactive hook operations.
- **Prior art**: Reporter has a working implementation in [Plan-Build-Run](https://github.com/SienkLogic/plan-build-run) (phases 28-34) with 8 offloadable operations, 3 routing strategies, shadow mode, adaptive thresholds. Core is ~6 files.
- **GSD hook architecture**: GSD's current hooks (`gsd-context-monitor.js`, `gsd-check-update.js`, etc.) are standalone Node.js scripts that communicate via stdin/stdout. They don't currently invoke the LLM — they do rule-based logic. The token savings from "LLM calls in hooks" suggests the reporter is tracking a different pattern than GSD's current hook behavior.
- **Complexity concern**: A complexity router, confidence-based fallback, and circuit breaker adds significant infrastructure. The value depends on whether GSD hooks actually invoke the frontier model (they don't appear to currently).
- **Opt-in requirement**: Local LLM support requires Ollama installed and a model pulled — cannot be a default behavior. Must be opt-in via config.

**Feasibility:** significant (the implementation itself is moderate, but the design questions around whether GSD hooks invoke the LLM at all need clarification first)
**Impact:** niche (benefits power users with local GPU hardware; mainstream users on cloud APIs or without GPU see no benefit)
**Ecosystem Fit:** marginal — GSD's hooks are currently rule-based, not LLM-invoked. If they're added for future agentic hook behavior, this becomes more relevant. As-is, the token savings claim needs verification against actual GSD hook behavior.
**Effort:** large refactor (requires hook architecture changes to add LLM invocation capability before offloading is meaningful)

**Recommendation:** needs-discussion

**Notes:**
- The reporter should clarify: which specific GSD hooks are they intercepting? The current hooks appear to be rule-based shell/Node scripts, not LLM calls. If they're intercepting the agent's own tool calls and routing classification sub-prompts locally, that's a fundamentally different architecture than modifying GSD hooks.
- This is genuinely interesting future work but may be ahead of GSD's current hook design. A "hooks can invoke local LLM" RFC might be the right starting point.
- The Plan-Build-Run PR offer is worth following up on — reviewing that code would clarify the actual implementation pattern.

---

## Issue #724: Kindly add integration for Cursor Code Editor
**Reporter:** muhammad-uzair-yasin | **Date:** 2025 | **Type:** feature-request
**Summary:** Add support for Cursor as a GSD runtime.

**Ecosystem Context:**
- **Cursor's extension model**: Cursor is a VS Code fork with proprietary AI features. It uses `.cursor/rules/` for custom instructions (Markdown files, previously `.cursorrules`). Cursor 2.0 introduced parallel agents using git worktrees.
- **No slash commands**: Cursor does not have a slash command system equivalent to Claude Code's `/gsd:*` commands. GSD's command-driven workflow would need a completely different interaction model.
- **No hooks system**: Cursor does not expose a hook/event system for external scripts. There is no equivalent to Claude's `PostToolUse` or Gemini's `AfterTool`.
- **MCP support**: Cursor has MCP support, which could be a bridge for some GSD functionality.
- **Rules files**: The closest Cursor analog to GSD skills/commands is `.cursor/rules/*.mdc` files (Markdown with frontmatter). These are passive instructions, not executable commands.
- **Issue quality**: The issue body is empty — just a title request with no details on what integration would look like.
- **Fundamental mismatch**: GSD's core value is the `/gsd:*` command workflow, spec-driven phases, and hook-based lifecycle management. Cursor's architecture does not support any of these primitives directly.

**Feasibility:** major (would require a completely new interaction paradigm, not an extension of existing multi-runtime support)
**Impact:** broad (Cursor has massive adoption) — but the GSD workflow benefits would be severely limited without commands and hooks
**Ecosystem Fit:** poor — GSD is fundamentally a CLI agent framework; Cursor is a GUI editor. The architectures are incompatible at a deep level.
**Effort:** large refactor (if attempted at all — would require design-from-scratch for a "Cursor mode")

**Recommendation:** close with explanation

**Notes:**
- The respectful response acknowledges Cursor's popularity while explaining the architectural mismatch. GSD's structured workflow depends on slash commands and hooks that Cursor simply doesn't have.
- A potential partial integration: GSD could install `.cursor/rules/` files with GSD's workflow documentation as passive context, helping Cursor's agent understand the GSD methodology. This would be a "works better with GSD" documentation note, not full integration.
- If Cursor ever adds a CLI mode or hook system, this becomes more tractable.
- The issue has no description, suggesting the reporter may not have investigated Cursor's extension model.

---

## Issue #710: Save specs in AI memory framework instead of Markdown
**Reporter:** qdrddr | **Date:** 2025 | **Type:** feature-request
**Summary:** Replace GSD's Markdown-based planning files with a graph memory system to reduce duplicate specs and stale file confusion.

**Ecosystem Context:**
- **Proposed tool - Hindsight (vectorize-io)**: Open-source agentic memory system achieving 91.4% on LongMemEval. Uses TEMPR (Temporal Entity Memory Priming Retrieval) with four parallel search strategies: semantic vectors, BM25 keyword, graph traversal, and temporal filtering. Impressive benchmarks, but requires significant infrastructure (vector DB, graph DB, embedding model).
- **Alternatives**: Mem0, Zep/Graphiti, Cognee — all require external services or substantial setup.
- **Community reception**: Two other community members (xcamuzx, redzrush101) have pushed back in comments, noting that GSD's phase-based structure prevents the problem described — each phase has its own isolated context, and the structured workflow keeps specs relevant. One commenter suggests the problem described is better suited to a different tool category (long-running agent training), not GSD.
- **GSD's design philosophy**: GSD uses Markdown intentionally — files are human-readable, git-trackable, diffable, and work across all runtimes without external dependencies. Adding a graph memory dependency would break this portability.
- **Problem validity**: The underlying pain (stale/duplicate docs) is real in unstructured AI workflows, but GSD's spec-driven, phase-isolated structure largely prevents it by design. The workflow keeps context focused.

**Feasibility:** significant (requires external service integration, breaks zero-dependency ethos)
**Impact:** niche (the problem is largely solved by GSD's existing structure; affects users who deviate from the structured workflow)
**Ecosystem Fit:** poor — contradicts GSD's core design principles of Markdown-first, portable, git-native spec management
**Effort:** large refactor

**Recommendation:** close with explanation

**Notes:**
- The issue can be closed warmly, acknowledging the real pain point while explaining that GSD's phase structure addresses it differently. Point to the phase isolation and Markdown conventions as the intended solution.
- If the reporter experiences stale docs despite using the full workflow, that might indicate a UX issue worth surfacing separately (e.g., better tooling to archive or flag outdated specs).
- The community comments (xcamuzx, redzrush101) already provide good resolution language — the issue is essentially self-resolving in comments.

---

## Issue #708: Offer hooks to tailor GSD workflow
**Reporter:** acanewby | **Date:** 2025 | **Type:** enhancement
**Summary:** Add a `workflow-overrides/` directory mechanism where users can place step-level override fragments that GSD merges into its workflow Markdown before processing, preventing user customizations from being overwritten by GSD updates.

**Ecosystem Context:**
- **Current behavior**: GSD workflow files (e.g., `get-shit-done/workflows/discuss-phase.md`) are installed and updated by the package. User edits are overwritten on update.
- **Proposed pattern**: Peer `workflow-overrides/` directory with same-named files containing override fragments (using `<step name="">` XML elements). GSD loads base workflow, looks for override file, merges the override step.
- **Similar patterns**: The `--patches` system in GSD (preserving local modifications across upgrades) already addresses file-level persistence. The override mechanism proposed here is more granular — step-level merging within a workflow file.
- **Patch system precedent**: GSD already has a `.gsd-patches/` mechanism for preserving user modifications across installs. The reporter may not be aware of this system, which partially addresses their need.
- **Implementation approach**: The override mechanism would need to live in the skill/command that reads workflow files — either the executor agent or the command Markdown itself would need to implement "load + merge" logic. This is non-trivial in a prompt-based system.
- **Specific ask**: The reporter wants to remove the cap on discussion areas in `discuss-phase.md` — a very reasonable customization.

**Feasibility:** moderate (the override mechanism is conceptually clean; implementation depends on where workflow files are loaded and merged)
**Impact:** moderate (every user who wants to customize workflow behavior beyond what config exposes)
**Ecosystem Fit:** good — GSD already has the patch system for file-level overrides; step-level overrides are a natural extension. The opinionated-but-customizable tension is real and the proposed solution is principled.
**Effort:** medium feature

**Recommendation:** accept (with note about existing patch system as near-term workaround)

**Notes:**
- Near-term workaround: The existing `.gsd-patches/` system and `reapply-patches` command may already solve this — point the reporter there first.
- If patches don't solve it (because patches are applied to the installed files and get re-overwritten), then the override directory is the right long-term answer.
- The XML `<step name="">` fragment format proposed is elegant and matches the kind of structured override merging that keeps changes minimal and explicit.
- This aligns with the philosophy that GSD should be opinionated by default but escapable with documented escape hatches.
- The specific example (removing discussion area caps) reveals a real UX limitation that might be better addressed by making the cap configurable in `config.json` — that's a smaller change with broader benefit.

---

## Issue #707: Branching support for quick tasks (parallel execution)
**Reporter:** WTF-Am-ID | **Date:** 2025 | **Type:** enhancement
**Summary:** Add optional `quick_branch_template` config to generate isolated branches for `/gsd:quick` tasks, mirroring the `branching_strategy` feature already available for `execute-phase`.

**Ecosystem Context:**
- **Code gap confirmed**: Source analysis confirms `cmdInitQuick` in `get-shit-done/bin/lib/init.cjs` (line 253) does not generate `branch_name` or check `branching_strategy`. The `execute-phase` equivalent in the same file (line 34) does both. This is a clear feature gap, not a design choice.
- **execute-phase branching**: `init.cjs:34` already computes `branch_name` based on `config.branching_strategy`. The pattern for extending this to quick tasks is already established.
- **quick.md**: The command file would need a branching step added before executor spawn (the reporter identified lines 31-42 of `execute-phase` as the model).
- **Git worktrees ecosystem**: 2025 has seen broad adoption of git worktrees for parallel AI agent sessions (Claude Code shipped built-in worktree support; Cursor's parallel agents use worktrees). This request aligns with the direction of the ecosystem.
- **Scope is appropriately narrow**: The reporter explicitly scopes this to branch creation only — no worktree management, no new commands. This is the right MVP scope.
- **Config backward-compatibility**: Adding `quick_branch_template` as an optional config key means zero impact on existing users.

**Feasibility:** trivial (the pattern is established; this is a ~30-line extension of existing code)
**Impact:** moderate (users running multiple parallel quick task sessions — a growing pattern as multi-agent workflows become common)
**Ecosystem Fit:** excellent — directly extends an existing, proven feature with a natural config extension
**Effort:** small PR

**Recommendation:** accept

**Notes:**
- This is probably the most actionable PR in this batch. The reporter has done the code archaeology (identified the exact lines to model), the config key name is sensible, and the scope is minimal.
- The config key `quick_branch_template` with `gsd/quick-{num}-{slug}` format matches GSD's existing template patterns.
- Uninstall/cleanup logic should also be considered — if a branch is created, should GSD offer to merge/delete it after the quick task is verified? Probably out of scope for v1.
- We could submit this PR ourselves given the clear implementation path.

---

## Issue #750: Gemini install uses invalid PostToolUse hook event (should be AfterTool)
**Reporter:** davidste | **Date:** 2025 | **Type:** bug
**Summary:** GSD's Gemini installer writes hooks under `hooks.PostToolUse` in `~/.gemini/settings.json`, but Gemini CLI uses `AfterTool` as the event name. This causes a warning on every run and silently disables the context-monitor hook.

**Ecosystem Context:**
- **Confirmed in Gemini CLI docs**: Valid hook events are `BeforeTool`, `AfterTool`, `BeforeAgent`, `AfterAgent`, `BeforeModel`, `AfterModel`, `SessionStart`, `SessionEnd`, `Notification`, `PreCompress`. `PostToolUse` is NOT a valid Gemini event name.
- **Source code confirmed**: `bin/install.js` line ~2084 writes to `settings.hooks.PostToolUse` with no Gemini-specific branching. The comment at line ~2034 even says "Gemini shares same hook system as Claude Code for now" — this was the design assumption that caused the bug.
- **Affected files identified by reporter**:
  - `bin/install.js` lines 1815-1833 (install) and 1142-1159 (uninstall) — need `AfterTool` instead of `PostToolUse` for Gemini path
  - `docs/context-monitor.md` lines 66-67 and 77-88 — documentation uses wrong event name
  - `hooks/gsd-context-monitor.js` line 112 — hardcodes `"PostToolUse"` in output metadata
- **Impact**: Every Gemini user gets a warning on startup and the context monitor is silently disabled. This is a silent failure — users see the warning but may not know what it means.
- **Fix is straightforward**: In the Gemini install path, use `AfterTool` instead of `PostToolUse`. The `isGemini` flag is already available throughout the install function.
- **Backward compat**: Should also migrate existing installs — if `hooks.PostToolUse` contains the gsd-context-monitor entry, move it to `hooks.AfterTool` during re-install.
- **Uninstall path**: Must also clean up `hooks.AfterTool` (not just `PostToolUse`) for Gemini.

**Feasibility:** trivial
**Impact:** broad (affects ALL Gemini users — the context monitor hook is broken for everyone on Gemini)
**Ecosystem Fit:** excellent — this is simply a bug fix
**Effort:** small PR

**Recommendation:** accept (high priority — this is a regression affecting all Gemini users)

**Notes:**
- This is the clearest bug in the batch and should be prioritized over the feature requests.
- The fix is 3-4 lines in `bin/install.js` plus documentation updates.
- The `gsd-context-monitor.js` metadata output (`hookEventName: "PostToolUse"`) should be made runtime-aware — or at minimum corrected for the Gemini case.
- The reporter's suggested 5-point fix list is accurate and complete.
- We have an open PR opportunity here — this directly affects Gemini users and has a clear, verified fix.

---

## Summary Table

| Issue | Title | Type | Feasibility | Impact | Ecosystem Fit | Effort | Recommendation |
|-------|-------|------|-------------|--------|---------------|--------|----------------|
| #817 | Kimi CLI support | feature | moderate | moderate | excellent | medium | accept |
| #749 | Local LLM offloading | feature | significant | niche | marginal | large | needs-discussion |
| #724 | Cursor integration | feature | major | broad | poor | large | close w/ explanation |
| #710 | AI memory for specs | feature | significant | niche | poor | large | close w/ explanation |
| #708 | Workflow override hooks | enhancement | moderate | moderate | good | medium | accept |
| #707 | Quick task branching | enhancement | trivial | moderate | excellent | small | accept |
| #750 | Gemini PostToolUse bug | bug | trivial | broad | excellent | small | accept (priority) |

## High-Confidence PR Candidates

Issues we could confidently submit PRs for ourselves:

1. **#750** (Gemini hook event) — Trivial fix, fully verified against source and Gemini docs. High confidence fix.
2. **#707** (Quick branching) — Small extension of existing pattern. Clear implementation path confirmed in source.
