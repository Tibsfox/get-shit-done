# GSD Needs-Triage Synthesis Report

**Date:** 2026-02-28
**Scope:** 27 open `needs-triage` issues (#682-#820), 3 open PRs (#821-#823)
**Author:** Tibsfox triage team

---

## 1. Executive Summary

- **Path handling is the #1 systemic issue.** 7 issues (#820, #735, #721, #706, #703, #682, and partially #790) trace to hardcoded paths, local-vs-global confusion, or cross-runtime path mismatches. This is the single largest bug cluster and affects every install type.
- **Phase lifecycle scanning has a confirmed duplicate pair.** #757 and #709 describe the identical `is_last_phase` bug (directory-only scan misses roadmap-defined phases). #754 is a user-facing symptom of the same root cause. Our PR #822 fixes this.
- **AskUserQuestion auto-answering (#803) is a Claude Code runtime regression, not a GSD bug.** Confirmed by multiple reporters as a Claude Code v2.1.63 behavior change. #743 (type validation error) is a separate, GSD-side issue. #778 is a UX design gap. GSD cannot fix #803 directly but could document the workaround or version pin.
- **State parsing (#730) is a cascade failure, and PR #822's fix is incomplete.** PR #822 fixes `cmdStateSnapshot` and `buildStateFrontmatter` (2 of 8 bold-only regex locations) but leaves 6 write-path functions unfixed: `cmdStateGet`, `cmdStatePatch`, `cmdStateUpdate`, `stateExtractField`, `stateReplaceField`, `cmdStateUpdateProgress`. This creates a read/write inconsistency where reads succeed with plain format but writes still expect bold format — potentially worse than the current all-nulls behavior.
- **6 issues are feature requests, not bugs.** #817 (Kimi CLI), #749 (local LLM offloading), #724 (Cursor integration), #710 (graph memory), #708 (workflow hooks), #707 (quick task branching) are enhancements. Some are substantial proposals with implementation detail.

---

## 2. Duplicate Map

| Primary Issue | Duplicate(s) | Relationship |
|---|---|---|
| **#709** — `is_last_phase` bug (filesystem-only scan) | **#757** — same bug, same root cause, same fix | Exact duplicate |
| **#709 + #757** | **#754** — "milestone reported complete early" | User-facing symptom of #709/#757 |
| **#703** — `isGitIgnored` missing `--no-index` | **#790** — `commit_docs: false` ignored | #790 is partially caused by #703 (auto-detection fails for tracked files). #790 also has an independent config-loading issue |
| **#735** — update.md same-path bug | **#721** — global install corrupted from $HOME | Both caused by local-vs-global path detection in update.md; #721 is a more severe manifestation |
| **#686** — auto-advance nested session error | **#668** (referenced, not in triage set) — dropped commits in auto-advance | #686 is the freeze, #668 is the data loss; both from deeply nested Task agents |

**Recommendation:** Close #757 as duplicate of #709. Add cross-reference comments on #754 pointing to #709. Close #735 as subset of #721 (or merge fix).

---

## 3. Pattern Clusters

### Cluster A: Path Handling (7 issues)

Root cause: Hardcoded paths, no runtime detection abstraction, local-vs-global confusion.

| Issue | Specific Problem | Severity |
|---|---|---|
| #820 | `gsd-tools.cjs` path hardcodes `$HOME`, 128 occurrences across 35 files | Critical — breaks all local installs |
| #721 | `/gsd:update` from $HOME corrupts global install; self-reinforcing | Critical — corrupts install permanently |
| #735 | `update.md` checks same path for LOCAL and GLOBAL | High — GLOBAL detection unreachable |
| #706 | OpenCode `gsd-tools.js` 823 lines behind `.cjs` | High — missing commands cause errors |
| #682 | OpenCode hooks hardcode `.claude` paths | Moderate — 3 remaining hardcoded paths |
| #703 | `isGitIgnored` missing `--no-index` for tracked files | Moderate — safety net silently fails |
| #790 | `commit_docs: false` ignored (related to #703 + config loading) | High — 66 unwanted commits |

**Architectural insight:** GSD needs a centralized path resolution layer. Every file independently guesses install location. The installer (`install.js`) does path templating, but relative paths (`./.claude/`) and hook JS files bypass it.

### Cluster B: Phase Lifecycle & State (6 issues)

Root cause: Disk-only scanning, regex format assumptions, cascading null failures.

| Issue | Specific Problem | Severity |
|---|---|---|
| #709 / #757 | `is_last_phase` true when future phases lack dirs | Critical — wrong milestone completion |
| #754 | Milestone reported complete prematurely (symptom of #709) | Critical — user-facing |
| #730 | `state-snapshot` returns all nulls (regex mismatch) | Critical — freezes progress workflow |
| #725 | `nyquist_validation_enabled` always absent from init JSON | Moderate — config field dropped |
| #760 | Progress bar crash when summaries > plans (>100%) | Moderate — RangeError crash |

**Architectural insight:** The phase/state layer mixes two data sources (filesystem dirs vs. ROADMAP.md content) without a reconciliation strategy. The fix pattern is consistent: scan filesystem first, fall back to roadmap parsing.

**PR #822 coverage gap (from debug-beta analysis):** The state.cjs fix in PR #822 addresses only the read path (2 of 8 bold-regex locations). Six write-path functions remain unfixed: `cmdStateGet`, `cmdStatePatch`, `cmdStateUpdate`, `stateExtractField`, `stateReplaceField`, `cmdStateUpdateProgress`. This creates a dangerous asymmetry — reads will succeed with plain-format STATE.md files, but writes will silently fail to match/replace the same fields. **PR #822 should be amended to fix all 8 locations before merge, or a follow-up PR should immediately address the remaining 6.**

### Cluster C: AskUserQuestion / Interactive UX (3 issues)

Root cause: Claude Code runtime behavior, tool contract issues, UX design gaps.

| Issue | Specific Problem | Severity |
|---|---|---|
| #803 | All questions auto-answered (since v1.22.0) | Critical — interactive workflows broken |
| #743 | `questions` parameter type error (string vs array) | Critical — workflow crashes |
| #778 | Freeform answers loop through prefilled UI repeatedly | Moderate — frustrating UX |

**Root cause finding (from debug-beta):** #803 is confirmed as a **Claude Code v2.1.63 runtime regression**, not a GSD bug. Multiple reporters have confirmed the auto-answering behavior is a Claude Code issue. GSD cannot fix this directly. #743 remains a GSD-side bug — prompt templates are constructing the `questions` parameter as a string instead of an array.

### Cluster D: Cross-Platform / Cross-Runtime (4 issues)

Root cause: Platform-specific behaviors (Windows shell quoting, Gemini hook events, Cursor rendering).

| Issue | Specific Problem | Severity |
|---|---|---|
| #733 | Commit messages truncated to first word (shell quoting) | High — silent data loss |
| #732 | Plan-phase freezes on Windows (Bun stdio deadlock) | High — Windows unusable |
| #750 | Gemini install uses `PostToolUse` instead of `AfterTool` | Moderate — hook disabled |
| #690 | "Click to expand" not clickable in Cursor terminal | Low — Cursor-specific rendering |

**PR #822 coverage gap (from debug-beta analysis):** The `args[1]` single-word truncation pattern fixed for `commit` in PR #822 also exists unfixed in the `generate-slug` and `websearch` CLI commands. While less impactful (slugs tend to be short, websearch queries vary), these should be addressed in a follow-up PR for consistency.

### Cluster E: Auto-Advance Chain (2 issues)

Root cause: Deeply nested Task agents, no timeout, no commit persistence.

| Issue | Specific Problem | Severity |
|---|---|---|
| #686 | Auto-advance freezes at execute-phase (nested session) | High — chain breaks |
| #668 (ref) | Dropped commits in auto-advance chain | High — silent data loss |

**Our PR #823** partially addresses #668 with commit recovery. The nested session issue (#686) requires using `SlashCommand` or `Skill` instead of `Task(general-purpose)`.

### Cluster F: Feature Requests (6 issues)

| Issue | Request | Effort |
|---|---|---|
| #817 | Add Kimi CLI runtime support | Large — new runtime adapter |
| #749 | Local LLM offloading for hooks | Large — new subsystem |
| #724 | Cursor Code Editor integration | Medium — new runtime |
| #710 | Graph memory for specs instead of markdown | Large — architectural shift |
| #708 | Workflow override hooks (customization layer) | Medium — extension system |
| #707 | Branch support for quick tasks (parallel execution) | Small — extend existing pattern |

---

## 4. PR Coverage Matrix

| Issue | PR #821 | PR #822 | PR #823 | Not Covered |
|---|---|---|---|---|
| #820 — hardcoded `$HOME` paths | | | | X |
| #817 — Kimi CLI support | | | | X (feature) |
| #803 — auto-answered questions | | | | X (Claude Code runtime bug) |
| #790 — `commit_docs: false` ignored | Partial (gitignore detection) | | | Partially |
| #778 — freeform answer UX loop | | | | X |
| #760 — progress bar RangeError | | | | Already fixed (3704829) |
| #757 — `is_last_phase` (dup of #709) | | **FIXED** | | |
| #754 — milestone complete early (symptom) | | **FIXED** (via #709) | | |
| #750 — Gemini `PostToolUse` hook | | | | X |
| #749 — local LLM offloading | | | | X (feature) |
| #743 — AskUserQuestion type error | | | | X |
| #735 — update.md same path | | | | X |
| #733 — commit message truncation | | **FIXED** (commit only; `generate-slug` and `websearch` still affected) | | Partially |
| #732 — Windows plan-phase freeze | | | | X (platform) |
| #730 — state-snapshot all nulls | | **PARTIAL** (read path only; 6 write-path functions unfixed) | | Partially |
| #725 — nyquist_validation missing | | | | X |
| #724 — Cursor integration | | | | X (feature) |
| #721 — global install corrupted from $HOME | | | | X |
| #710 — graph memory | | | | X (feature) |
| #709 — `is_last_phase` filesystem-only | | **FIXED** | | |
| #708 — workflow override hooks | | | | X (feature) |
| #707 — quick task branching | | | | X (feature) |
| #706 — OpenCode gsd-tools.js behind | | | | X |
| #703 — `isGitIgnored` `--no-index` | **FIXED** | | | |
| #690 — Cursor click-to-expand | | | | X (platform) |
| #686 — auto-advance nested freeze | | | Partial (#668 recovery) | Partially |
| #682 — OpenCode hardcoded .claude paths | | | | X |

**Summary:** Our 3 PRs directly fix 4 issues (#703, #709, #754, #757), partially fix 4 more (#668, #686, #730, #733), and partially address 1 (#790). PR #822 needs follow-up work for full #730 and #733 coverage. 18 issues remain fully uncovered.

### PR #822 Gaps Requiring Follow-Up

| Gap | Detail | Risk if Not Addressed |
|---|---|---|
| **state.cjs write paths** | 6 of 8 bold-regex locations unfixed (`cmdStateGet`, `cmdStatePatch`, `cmdStateUpdate`, `stateExtractField`, `stateReplaceField`, `cmdStateUpdateProgress`) | Read/write asymmetry — reads succeed on plain-format STATE.md but writes silently fail to match fields. Could cause silent state corruption where updates appear to succeed but don't modify the file. |
| **CLI args[1] in other commands** | `generate-slug` and `websearch` have same single-word truncation | Lower impact — slugs are typically short and websearch may not be widely used. But inconsistent fix leaves a known pattern unfixed. |

---

## 5. Priority Ranking

Scoring: **Severity (1-4) x Frequency (1-3) x Fixability (1-3)** — max 36

| Rank | Issue | Title | S | F | Fix | Score | Cluster | Status |
|---|---|---|---|---|---|---|---|---|
| 1 | **#709** | `is_last_phase` filesystem-only | 4 | 3 | 3 | 36 | Lifecycle | PR #822 |
| 2 | **#757** | `is_last_phase` (dup of #709) | 4 | 3 | 3 | 36 | Lifecycle | PR #822 (dup) |
| 3 | **#733** | Commit messages truncated | 3 | 3 | 3 | 27 | CLI | PR #822 (partial) |
| 4 | **#754** | Milestone complete early (symptom) | 3 | 3 | 3 | 27 | Lifecycle | PR #822 |
| 5 | **#820** | `gsd-tools.cjs` hardcodes `$HOME` | 4 | 2 | 3 | 24 | Path | Not covered |
| 6 | **#730** | state-snapshot all nulls | 4 | 2 | 3 | 24 | State | PR #822 (partial) |
| 7 | **#803** | All questions auto-answered | 4 | 3 | 1 | 12 | AskUserQuestion | Claude Code bug |
| 8 | **#735** | update.md same path for LOCAL/GLOBAL | 3 | 2 | 3 | 18 | Path | Not covered |
| 9 | **#750** | Gemini PostToolUse hook name | 3 | 2 | 3 | 18 | Platform | Not covered |
| 10 | **#743** | AskUserQuestion type error | 4 | 2 | 2 | 16 | AskUserQuestion | Not covered |
| 11 | **#721** | Global install corrupted from $HOME | 4 | 1 | 3 | 12 | Path | Not covered |
| 12 | **#686** | Auto-advance nested session freeze | 3 | 2 | 2 | 12 | Auto-advance | PR #823 (partial) |
| 13 | **#790** | `commit_docs: false` ignored | 3 | 2 | 2 | 12 | Config | PR #821 (partial) |
| 14 | **#725** | nyquist_validation missing from init | 2 | 2 | 3 | 12 | Config | Not covered |
| 15 | **#706** | OpenCode gsd-tools.js behind | 3 | 2 | 2 | 12 | Platform | Not covered |
| 16 | **#760** | Progress bar RangeError (>100%) | 4 | 1 | 3 | 12 | CLI | Already fixed |
| 17 | **#682** | OpenCode hardcoded .claude paths | 2 | 2 | 3 | 12 | Path | Not covered |
| 18 | **#778** | Freeform answer UX loop | 2 | 2 | 2 | 8 | AskUserQuestion | Not covered |
| 19 | **#732** | Windows plan-phase freeze | 4 | 1 | 1 | 4 | Platform | Claude Code bug |
| 20 | **#690** | Cursor click-to-expand | 1 | 1 | 1 | 1 | Platform | Not our problem |
| — | **#817** | Kimi CLI support | — | — | — | — | Feature | — |
| — | **#749** | Local LLM offloading | — | — | — | — | Feature | — |
| — | **#724** | Cursor integration | — | — | — | — | Feature | — |
| — | **#710** | Graph memory for specs | — | — | — | — | Feature | — |
| — | **#708** | Workflow override hooks | — | — | — | — | Feature | — |
| — | **#707** | Quick task branching | — | — | — | — | Feature | — |

**Note:** #803 fixability dropped from 2 to 1 because it's a Claude Code runtime bug — GSD can only document or work around it, not fix it. After our PRs merge, the top uncovered *fixable* priorities are #820 (hardcoded paths), #735/#721 (local/global confusion), #750 (Gemini hooks), and #743 (AskUserQuestion type error).

---

## 6. Quick Wins List

Issues fixable with small, targeted PRs (< 20 lines each):

| Issue | Fix Description | Lines | Risk |
|---|---|---|---|
| **#725** | Add `nyquist_validation` to `loadConfig()` return in `core.cjs` | 1 line | Very low |
| **#735** | Fix `update.md` elif to use `~/.claude/` for GLOBAL check | 1 line | Very low |
| **#750** | Change `PostToolUse` to `AfterTool` in Gemini install path | ~5 lines | Low |
| **#760** | Clamp `filled` to `barWidth` in progress bar | 1 line | Very low (already fixed in 3704829) |
| **#682** | Fix 3 remaining hardcoded `.claude` paths in OpenCode hooks | ~10 lines | Low |
| **#721** | Add canonical path comparison to disambiguate local vs global | ~8 lines | Low |

**Bundle opportunity:** #725 + #735 could ship as a single "config & path corrections" micro-PR.

**Follow-up PRs for our existing work:**
- Fix remaining 6 bold-regex locations in `state.cjs` (addresses PR #822 gap for #730)
- Fix `args[1]` in `generate-slug` and `websearch` commands (addresses PR #822 gap for #733)

---

## 7. Recommended Actions

### A. Issues to Comment On (link our PRs, confirm bugs)

| Issue | Action |
|---|---|
| **#709** | Comment: "We've confirmed this and submitted a fix in PR #822. The fix adds a ROADMAP.md fallback after the filesystem scan." |
| **#757** | Comment: "This appears to be the same root cause as #709 — PR #822 addresses both. May be worth closing as duplicate." |
| **#754** | Comment: "This is the user-facing symptom of #709. PR #822's phase lifecycle fix should resolve this." |
| **#730** | Comment: "Confirmed and partially fixed in PR #822 with dual-format state parsing (bold + plain) for the read path. We've identified 6 additional write-path functions that also need the same fix — will submit a follow-up." |
| **#733** | Comment: "Confirmed, especially on Windows. Fixed for `commit` in PR #822 by collecting all positional args before flags. Same pattern exists in `generate-slug` and `websearch` — will address in follow-up." |
| **#703** | Comment: "Fixed in PR #821 with `--no-index` flag on `git check-ignore`." |
| **#686** | Comment: "PR #823 includes commit recovery for auto-advance chains. The nested session freeze itself likely requires using SlashCommand instead of Task(general-purpose)." |
| **#790** | Comment: "PR #821 fixes the `isGitIgnored()` detection half of this. The config-loading path may also need attention." |
| **#803** | Comment: "This appears to be a Claude Code v2.1.63 runtime regression rather than a GSD-side bug. Multiple reporters have confirmed the auto-answering behavior is triggered by the Claude Code runtime itself. GSD's AskUserQuestion invocations appear correct — the runtime is not presenting the question UI to the user." |

### B. New PRs We Should Create

| Priority | Target Issues | Scope | Estimated Effort |
|---|---|---|---|
| **High** | #730 (follow-up) | Fix remaining 6 bold-regex write-path functions in `state.cjs` | 1-2 hours |
| **High** | #725 | Add `nyquist_validation` to `loadConfig()` | 30 min |
| **High** | #735 + #721 | Fix local-vs-global path detection in `update.md` | 1-2 hours |
| **Medium** | #733 (follow-up) | Fix `args[1]` in `generate-slug` and `websearch` | 30 min |
| **Medium** | #750 | Gemini `AfterTool` hook name | 1 hour |
| **Medium** | #682 | Fix remaining OpenCode hardcoded paths | 1 hour |

### C. Issues to Label

| Issue | Recommended Label | Notes |
|---|---|---|
| #757 | `duplicate` | Same as #709 |
| #754 | `bug` | Symptom of #709, already has `bug` |
| #803 | `bug`, `upstream` | Claude Code runtime regression, not GSD |
| #817 | `enhancement` | Already labeled |
| #749 | `enhancement` | Well-researched proposal |
| #724 | `enhancement` | Minimal detail |
| #710 | `enhancement` | Already labeled |
| #708 | `enhancement` | Already labeled |
| #707 | `enhancement` | Concrete proposal |
| #690 | `bug`, `platform: cursor` | Cursor-specific rendering |
| #732 | `bug`, `platform: windows` | Windows-specific, partly upstream |
| #750 | `bug`, `platform: gemini` | Gemini-specific |
| #706 | `bug`, `platform: opencode` | OpenCode-specific |
| #682 | `bug`, `platform: opencode` | OpenCode-specific |
| #760 | `bug` | Already fixed in 3704829 |

### D. Issues We Should NOT Fix (not our problem)

| Issue | Reason |
|---|---|
| #820 | Requires architectural decision from maintainer (128 occurrences, 35 files). Scope too large for community PR without design alignment. |
| #803 | Claude Code v2.1.63 runtime regression. GSD can document it but cannot fix it. |
| #732 | Root cause is Claude Code platform bug (anthropics/claude-code#28126), not GSD. Mitigations possible but not a GSD fix. |
| #690 | Cursor terminal rendering limitation. Nothing GSD can do about `<details>` tag support. |

---

## Appendix: Issue-by-Issue Reference

| # | Title | Type | Cluster | Our PR? |
|---|---|---|---|---|
| 820 | Hardcoded $HOME paths | Bug | Path | No |
| 817 | Kimi CLI support | Feature | Runtime | No |
| 803 | All questions auto-answered | Bug (upstream) | AskUserQuestion | No (Claude Code bug) |
| 790 | commit_docs: false ignored | Bug | Config/Path | #821 partial |
| 778 | Freeform answer UX loop | Bug | AskUserQuestion | No |
| 760 | Progress bar RangeError | Bug | CLI | Already fixed |
| 757 | is_last_phase (dup of #709) | Bug | Lifecycle | #822 |
| 754 | Milestone complete early | Bug | Lifecycle | #822 |
| 750 | Gemini PostToolUse hook | Bug | Platform | No |
| 749 | Local LLM offloading | Feature | Architecture | No |
| 743 | AskUserQuestion type error | Bug | AskUserQuestion | No |
| 735 | update.md same path | Bug | Path | No |
| 733 | Commit message truncation | Bug | CLI | #822 (partial) |
| 732 | Windows plan-phase freeze | Bug (upstream) | Platform | No (Claude Code bug) |
| 730 | state-snapshot all nulls | Bug | State | #822 (partial) |
| 725 | nyquist_validation missing | Bug | Config | No |
| 724 | Cursor integration | Feature | Runtime | No |
| 721 | Global install corrupted | Bug | Path | No |
| 710 | Graph memory for specs | Feature | Architecture | No |
| 709 | is_last_phase filesystem-only | Bug | Lifecycle | #822 |
| 708 | Workflow override hooks | Feature | Architecture | No |
| 707 | Quick task branching | Feature | Workflow | No |
| 706 | OpenCode gsd-tools.js behind | Bug | Platform | No |
| 703 | isGitIgnored --no-index | Bug | Path | #821 |
| 690 | Cursor click-to-expand | Bug | Platform | No |
| 686 | Auto-advance nested freeze | Bug | Auto-advance | #823 partial |
| 682 | OpenCode hardcoded paths | Bug | Path | No |
