# Debug Beta Findings: State/CLI/UX Bugs

**Investigator:** debug-beta (adversarial)
**Date:** 2026-02-28
**Branch:** dev-bugfix

---

## Issue #803: All questions are auto-answered

**Reporter:** mrmartan | **Date:** 2026-02-28
**Additional reporters:** StefanKremen (same issue, confirmed CC 2.1.63)

**Obvious Hypothesis:** GSD workflow code is somehow auto-answering questions — maybe a code change in GSD 1.22.0 introduced a default-answer path.

**Adversarial Challenge:** The workflow markdown files (discuss-phase.md, settings.md, new-milestone.md) don't contain any logic to auto-answer questions — they simply instruct Claude to call `AskUserQuestion`. The tool call is delegated to the Claude Code runtime, not to GSD code. GSD has no JavaScript/TypeScript code that invokes or intercepts AskUserQuestion. The reporters explicitly confirmed:

1. mrmartan: "Downgraded to 1.21.1 and it's still happening. So I suppose it was Claude that brought this." Later: "It's caused by Claude Code 2.1.63. CC 2.1.62 works well for me."
2. StefanKremen: "I confirm downgrading to CC 2.1.62 worked for me, too."
3. harrynovez: "Claude Code 2.1.63 with GSD 1.21.0, everything is ok!" (contradicts — may depend on model version, platform, or Claude account settings)

This is NOT a GSD bug. It's a Claude Code runtime bug in version 2.1.63 where AskUserQuestion calls are auto-completed without presenting them to the user. GSD's workflow files are correctly structured — they instruct the model to use AskUserQuestion with proper headers, questions, and options arrays. The auto-answering behavior is in the Claude Code client, not in any GSD code path.

**True Root Cause:** Claude Code 2.1.63 runtime regression in AskUserQuestion handling. The tool calls are being short-circuited or auto-resolved by the client before the user sees them. This is confirmed by StefanKremen's transcript showing `User answered Claude's questions:` with empty responses (` ⎿ `) for every question — the runtime silently fills empty answers.

The relevant GSD workflow code is correct. For example, `discuss-phase.md:140-168` properly structures AskUserQuestion calls with header, question, and options. The settings workflow (`settings.md:37-107`) similarly structures a multi-question AskUserQuestion call correctly.

**Affected Code:** None in GSD. The bug is in Claude Code 2.1.63's AskUserQuestion tool implementation.

**Severity:** critical (blocks all interactive workflows for affected CC versions)

**Shared Pattern?:** Yes — shares the AskUserQuestion tool pathway with #778 and #743. All three issues involve how Claude Code's runtime handles the AskUserQuestion tool. However, #803 is a client-side regression while #778 and #743 are more nuanced (see below).

**Our PR Coverage:** Not covered (not a GSD-side issue)

**Recommended Fix:** This needs to be reported to/fixed by the Claude Code team (Anthropic). GSD maintainers should add a note to the README or CHANGELOG about the CC 2.1.63 incompatibility. A possible GSD-side mitigation would be to detect empty AskUserQuestion responses and re-ask, but that's a workaround not a fix.

**Quick Win?:** no (requires Claude Code client fix)

---

## Issue #778: Freeform answer questions using prefilled answer UX

**Reporter:** kj800x | **Date:** 2026-02-27

**Obvious Hypothesis:** GSD's workflow files should use a different tool or parameter for freeform text questions instead of AskUserQuestion with options.

**Adversarial Challenge:** Looking at the actual interaction transcript from the issue, the workflow (new-milestone.md) is working as designed. When the user selects "Let me describe it" or "Describe in detail", the workflow correctly tells Claude to ask a freeform follow-up question. The problem is that Claude *chooses* to use AskUserQuestion with option-based questions for the follow-up instead of simply presenting text to the user and waiting for freeform input. This is a model behavior issue, not a code structure issue.

However, there IS a GSD-side contributing factor. The `questioning.md` reference guide (`get-shit-done/references/questioning.md:69-101`) explicitly encourages using AskUserQuestion for all user interactions:

> "Use AskUserQuestion to help users think by presenting concrete options to react to."

This guidance doesn't distinguish between cases where concrete options are appropriate vs. cases where freeform input is needed. The workflow files (like `new-milestone.md:31`) say "Use AskUserQuestion to explore features, priorities, constraints, scope" without providing guidance on when to stop using options and just let the user type.

**True Root Cause:** Two contributing factors:

1. **Model behavior (primary):** The LLM follows the questioning.md guidance too literally — every interaction becomes an AskUserQuestion call with prefilled options, even when the context clearly calls for freeform input (e.g., "describe your feature in detail").

2. **Workflow guidance gap (secondary):** Neither the questioning guide nor the workflow files provide instructions for when to use freeform prompts instead of AskUserQuestion. Adding explicit guidance like "When the user needs to provide detailed descriptions, explanations, or creative input, do NOT use AskUserQuestion. Instead, present your question as plain text and wait for the user's freeform response" would steer the model correctly.

**Affected Code:**
- `get-shit-done/references/questioning.md:69-101` — Missing freeform vs. options guidance
- `get-shit-done/workflows/new-milestone.md:31` — Vague "Use AskUserQuestion to explore" without freeform escape hatch
- `get-shit-done/workflows/discuss-phase.md:310-313` — "Ask 4 questions using AskUserQuestion" doesn't distinguish question types

**Severity:** medium (annoying UX friction, but users eventually get through by selecting "Other")

**Shared Pattern?:** Yes — related to #803 in that both involve AskUserQuestion UX, but different root causes. #803 is a Claude Code runtime bug; #778 is a workflow design issue + model behavior issue. They share the symptom surface (AskUserQuestion misbehavior) but not the cause.

**Our PR Coverage:** Not covered by any of our PRs (#821, #822, #823)

**Recommended Fix:**
1. Add explicit freeform guidance to `questioning.md`:
   ```markdown
   **When to NOT use AskUserQuestion:**
   - User needs to describe something in their own words
   - You're asking for detailed explanations, creative input, or free-form text
   - The user just selected "Let me describe it" or similar

   In these cases, present your question as plain text and wait for
   the user's response at the normal input prompt.
   ```
2. Add similar guidance to workflow files that use heavy AskUserQuestion patterns (discuss-phase.md, new-milestone.md)

**Quick Win?:** yes (small addition to questioning.md reference guide)

---

## Issue #743: AskUserQuestion InputValidationError crash

**Reporter:** youngqqcn | **Date:** 2026-02-24

**Obvious Hypothesis:** GSD code is passing a string instead of an array to AskUserQuestion's `questions` parameter.

**Adversarial Challenge:** GSD doesn't programmatically call AskUserQuestion — it's a Claude Code tool that the LLM invokes. The workflow markdown files describe AskUserQuestion calls in pseudo-code/documentation, and the model interprets them to make the actual tool calls. So the question is: what in the workflow instructions causes the model to format the tool call incorrectly?

Looking at the error: `The parameter 'questions' type is expected as 'array' but provided as 'string'`. This means the model generated a tool call where `questions` was a string rather than an array of question objects. This happens when:

1. The model misinterprets the workflow's AskUserQuestion pseudo-code
2. Or the model attempts to pass a single question as a string shorthand

The reporter says this happens on `/gsd:discuss-phase` and `/gsd:plan-phase`. Looking at `discuss-phase.md:140-143`, the pseudo-code shows:
```
Use AskUserQuestion:
- header: "Context"
- question: "Phase [X] already has context. What do you want to do?"
- options: [...]
```

This flat-format pseudo-code could be misinterpreted by some models as a single question dict rather than an array containing one question dict. The `settings.md:40` file uses proper array syntax: `AskUserQuestion([{...}, {...}])`. The inconsistency in pseudo-code format across workflows is likely the trigger — some workflows use array syntax, others use flat format.

**True Root Cause:** Inconsistent AskUserQuestion invocation patterns across workflow files. Some workflows (settings.md) show explicit array syntax `AskUserQuestion([...])`, while others (discuss-phase.md, plan-phase.md) use a flat pseudo-code format `Use AskUserQuestion: header/question/options`. When the model interprets the flat format, it may generate a tool call with `questions` as a string or object rather than an array. This is model-version-dependent — different Claude versions may be more or less sensitive to the pseudo-code format.

**Affected Code:**
- `get-shit-done/workflows/discuss-phase.md:140-168` — Flat pseudo-code format
- `get-shit-done/workflows/plan-phase.md` — Same flat format (not verified but likely similar)
- `get-shit-done/workflows/settings.md:40` — Correct array format (reference for fix)

**Severity:** medium (intermittent, depends on model version; the LLM usually retries correctly)

**Shared Pattern?:** Yes — part of the AskUserQuestion family with #803 and #778. All three involve the interface between GSD's prompt-level instructions and the Claude Code runtime's AskUserQuestion tool. #743 is about parameter formatting, #778 is about when to use it, #803 is about the runtime short-circuiting it.

**Our PR Coverage:** Not covered by any of our PRs

**Recommended Fix:** Standardize all AskUserQuestion invocations in workflow files to use explicit array syntax:
```markdown
AskUserQuestion([
  {
    header: "Context",
    question: "Phase [X] already has context. What do you want to do?",
    options: ["Update it", "View it", "Skip"]
  }
])
```
This makes the expected parameter format unambiguous for the model.

**Quick Win?:** yes (search-and-replace standardization across workflow files)

---

## Issue #733: gsd-tools.cjs commit silently truncates multi-word messages to first word

**Reporter:** min-hinthar | **Date:** 2026-02-24

**Obvious Hypothesis:** `args[1]` in the commit case only captures the first word when shell strips quotes.

**Adversarial Challenge:** The obvious hypothesis is correct here. But let me challenge: could there be other callers that also suffer from this pattern?

Checking the CLI router in `gsd-tools.cjs`:
- Line 350: `generate-slug` uses `args[1]` — same single-word capture problem
- Line 507: `scaffold --name` uses `args.slice(nameIndex + 1).join(' ')` — correctly handles multi-word
- Line 436: `phase add` uses `args.slice(2).join(' ')` — correctly handles multi-word
- Line 438: `phase insert` uses `args.slice(3).join(' ')` — correctly handles multi-word
- Line 577: `websearch` uses `args[1]` — same problem for multi-word queries

So the pattern is inconsistent: some commands correctly handle multi-word args with `slice().join(' ')`, while `commit`, `generate-slug`, and `websearch` use bare `args[1]`.

**True Root Cause:** `gsd-tools.cjs:260-271` (in upstream, pre-fix) uses `args[1]` for commit messages, which captures only the first positional argument. When shells strip quotes before passing args to Node.js (MINGW64, certain `execSync` invocations), multi-word messages are split into separate array entries. The exact code path:

```javascript
// BEFORE fix (upstream main):
case 'commit': {
  const amend = args.includes('--amend');
  const message = args[1];  // Only captures first word
  ...
}
```

**Affected Code:**
- `get-shit-done/bin/gsd-tools.cjs:260-271` — commit message truncation (FIXED in our PR #822)
- `get-shit-done/bin/gsd-tools.cjs:350` — `generate-slug` has same `args[1]` pattern (NOT fixed)
- `get-shit-done/bin/gsd-tools.cjs:577` — `websearch` has same `args[1]` pattern (NOT fixed)

**Severity:** high (silently corrupts every planning commit message, affecting all workflows)

**Shared Pattern?:** Yes — shares the `args[1]` single-word capture pattern with `generate-slug` and `websearch` commands. All are instances of the same class of bug: CLI router not handling shell quote-stripping for multi-word positional arguments.

**Our PR Coverage:** Commit message fix COVERED by PR #822 (lines 260-271 of gsd-tools.cjs). However, `generate-slug` and `websearch` have the same underlying pattern and are NOT covered.

**Recommended Fix:** Already implemented in our PR #822 for the commit case. The same pattern should be applied to `generate-slug` and `websearch`:
```javascript
// generate-slug: collect all positional args
case 'generate-slug': {
  const slugArgs = args.slice(1).filter(a => !a.startsWith('--'));
  commands.cmdGenerateSlug(slugArgs.join(' '), raw);
  break;
}

// websearch: collect query args before flags
case 'websearch': {
  const limitIdx = args.indexOf('--limit');
  const freshnessIdx = args.indexOf('--freshness');
  const endIdx = Math.min(
    limitIdx !== -1 ? limitIdx : args.length,
    freshnessIdx !== -1 ? freshnessIdx : args.length
  );
  const query = args.slice(1, endIdx).filter(a => !a.startsWith('--')).join(' ');
  ...
}
```

**Quick Win?:** yes (same pattern as the commit fix, already proven in PR #822)

---

## Issue #730: state-snapshot returns all nulls, regex format mismatch with STATE.md

**Reporter:** min-hinthar | **Date:** 2026-02-24

**Obvious Hypothesis:** `extractField()` in `cmdStateSnapshot` only matches `**Field:**` bold format but STATE.md uses plain `Field:` format.

**Adversarial Challenge:** The obvious hypothesis is correct for `cmdStateSnapshot`, but the issue is MUCH broader than that single function. Let me trace every field extraction/replacement in state.cjs:

| Function | Line | Format Support | Fixed in PR #822? |
|----------|------|----------------|-------------------|
| `cmdStateGet` | 55-88 | Bold only (`**Field:**`) | NO |
| `cmdStatePatch` | 101-127 | Bold only | NO |
| `cmdStateUpdate` | 129-149 | Bold only | NO |
| `stateExtractField` | 153-158 | Bold only | NO |
| `stateReplaceField` | 160-167 | Bold only | NO |
| `cmdStateUpdateProgress` | 232-267 | Bold only (line 259) | NO |
| `cmdStateSnapshot` | 407-512 | Dual format | YES |
| `buildStateFrontmatter` | 521-631 | Dual format | YES |

**The deeper problem:** Our PR #822 fixes `cmdStateSnapshot` and `buildStateFrontmatter` — the two read-only/diagnostic functions. But the write functions (`cmdStateUpdate`, `cmdStatePatch`, `stateReplaceField`) and the shared extraction helper (`stateExtractField`) are NOT fixed. This means:

1. `state-snapshot` will correctly READ plain-format fields (after PR #822)
2. But `state update`, `state patch`, `state advance-plan` will FAIL to update those same fields because `stateReplaceField` only matches bold format
3. `state get <field>` will also fail to find plain-format fields

This is a cascading inconsistency: the read path is fixed but the write path isn't. After PR #822, the system can see state values but can't modify them — which may be worse than the current "all nulls" behavior because it creates a false sense of working.

The session section in `cmdStateSnapshot` (lines 483-493) also only matches bold format for `Last Date:`, `Stopped At:`, and `Resume File:`, even inside the dual-format snapshot function. This was partially missed.

**True Root Cause:** Systemic bold-only regex pattern across ALL field extraction and replacement functions in `state.cjs`. The issue reporter's fix in the issue body is more thorough than our PR #822 — they patched 8 locations across 2 files, while our PR only fixes 2 of those 8 locations.

Specific code references (upstream line numbers):
- `state.cjs:69` — `cmdStateGet` bold-only pattern
- `state.cjs:109` — `cmdStatePatch` bold-only pattern
- `state.cjs:138` — `cmdStateUpdate` bold-only pattern
- `state.cjs:155` — `stateExtractField` bold-only pattern
- `state.cjs:162` — `stateReplaceField` bold-only pattern
- `state.cjs:259` — `cmdStateUpdateProgress` bold-only pattern
- `state.cjs:486-488` — `cmdStateSnapshot` session section bold-only patterns

**Affected Code:**
- `get-shit-done/bin/lib/state.cjs:55-267` — Multiple functions with bold-only patterns
- `get-shit-done/workflows/progress.md` — No null-guard for all-null state (secondary)

**Severity:** critical (blocks all state-dependent workflows for users with plain-format STATE.md)

**Shared Pattern?:** Yes — shares root cause with the session-section parsing inside snapshot. Also thematically related to #733 (both reported by min-hinthar, both are format-assumption bugs in the CLI tooling). The common thread: GSD tools assume a specific text format and silently fail when the format doesn't match.

**Our PR Coverage:** PARTIALLY covered by PR #822. The snapshot and frontmatter functions are fixed. But 6 other functions with the same bold-only pattern are NOT fixed:
- `cmdStateGet` (line 69)
- `cmdStatePatch` (line 109)
- `cmdStateUpdate` (line 138)
- `stateExtractField` (line 155)
- `stateReplaceField` (line 162)
- `cmdStateUpdateProgress` (line 259)

**Recommended Fix:**
1. Apply dual-format parsing to `stateExtractField` and `stateReplaceField` (shared helpers used by `cmdStateAdvancePlan`, `cmdStateRecordSession`, etc.)
2. Apply dual-format parsing to `cmdStateGet`, `cmdStatePatch`, `cmdStateUpdate`, `cmdStateUpdateProgress`
3. Fix session section parsing in `cmdStateSnapshot` (lines 486-488) to support plain format
4. Add null-guard in `workflows/progress.md` for graceful degradation
5. Consider refactoring all field extraction to use the shared `stateExtractField` helper (DRY principle) — currently several functions have their own inline regex

**Quick Win?:** yes for the shared helpers (stateExtractField + stateReplaceField fix cascades to all callers), more work for the inline patterns

---

## Cross-Cutting Analysis

### AskUserQuestion Cluster (#803, #778, #743)

These three issues form a coherent cluster around the AskUserQuestion tool interface:

| Issue | Layer | Root Cause |
|-------|-------|------------|
| #803 | Claude Code runtime | CC 2.1.63 auto-answers without showing UI |
| #778 | Workflow design + model behavior | No guidance on when to use freeform vs options |
| #743 | Workflow format + model interpretation | Inconsistent pseudo-code format causes parameter type error |

The shared insight: GSD's workflows communicate AskUserQuestion intent through prompt-level pseudo-code, which is interpreted by the LLM, which then generates the actual tool call. This is a fragile chain with three failure modes: the runtime can break (#803), the model can misinterpret the intent (#778), or the model can misformat the call (#743).

**Systemic recommendation:** Create a standardized AskUserQuestion reference pattern (like a "tool call template") that all workflows import, rather than each workflow describing the call differently. This reduces the surface area for #778 and #743 type failures.

### Format Assumption Cluster (#730, #733)

Both issues stem from the same class of bug: GSD tools assume a specific input format and silently fail when the assumption is violated.

| Issue | Assumption | Reality |
|-------|------------|---------|
| #730 | STATE.md uses `**Field:**` bold format | May use plain `Field:` format |
| #733 | Shell preserves quotes in `args` | Shell may strip quotes (MINGW64, execSync) |

Both are "format mismatch" bugs where the code was written for one format but encounters another. Both fail silently — #730 returns nulls, #733 truncates messages.

**Systemic recommendation:** For text parsing, always support both formats (defensive). For CLI args, always handle multi-word positional arguments with `slice().join(' ')` (robust against shell behavior differences).

### PR #822 Coverage Assessment

Our PR #822 covers the two most impactful items (#730 partial, #733 full) but leaves gaps:

| Issue | PR #822 Coverage | Remaining Work |
|-------|------------------|----------------|
| #803 | Not applicable (CC runtime bug) | None for GSD |
| #778 | Not covered | Add freeform guidance to questioning.md |
| #743 | Not covered | Standardize AskUserQuestion format in workflows |
| #733 | Fully covered | Audit generate-slug + websearch for same pattern |
| #730 | Partially covered (2 of 8 locations) | Fix remaining 6 bold-only patterns in state.cjs |
