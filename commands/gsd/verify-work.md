---
name: gsd:verify-work
description: Validate built features through conversational UAT
argument-hint: "[phase number, e.g., '4']"
allowed-tools:
  - Read
  - Bash
  - Glob
  - Grep
  - Edit
  - Write
  - Task
---

<objective>
Validate built features through conversational testing with persistent state.

Purpose: Confirm what Claude built actually works from user's perspective. One test at a time, plain text responses, no interrogation. When issues are found, automatically diagnose, plan fixes, and prepare for execution.

Output: {phase}-UAT.md tracking all test results. If issues found: diagnosed gaps, verified fix plans ready for /gsd:execute-phase
</objective>

<execution_context>
@~/.claude/get-shit-done/workflows/verify-work.md
@~/.claude/get-shit-done/templates/UAT.md
</execution_context>

<context>
Phase: $ARGUMENTS (optional)
- If provided: Test specific phase (e.g., "4")
- If not provided: Check for active sessions or prompt for phase

@.planning/STATE.md
@.planning/ROADMAP.md
</context>

<process>
1. Check for active UAT sessions (resume or start new)
2. Find SUMMARY.md files for the phase
3. Extract testable deliverables (user-observable outcomes)
4. Create {phase}-UAT.md with test list
5. Present tests one at a time:
   - Show expected behavior
   - Wait for plain text response
   - "yes/y/next" = pass, anything else = issue (severity inferred)
6. Update UAT.md after each response
7. On completion: commit, present summary
8. If issues found:
   - Spawn parallel debug agents to diagnose root causes
   - Spawn gsd-planner in --gaps mode to create fix plans
   - Spawn gsd-plan-checker to verify fix plans
   - Iterate planner ↔ checker until plans pass (max 3)
   - Present ready status with `/clear` then `/gsd:execute-phase`
</process>

<anti_patterns>
- Don't use AskUserQuestion for test responses — plain text conversation
- Don't ask severity — infer from description
- Don't present full checklist upfront — one test at a time
- Don't run automated tests — this is manual user validation
- Don't fix issues during testing — log as gaps, diagnose after all tests complete
</anti_patterns>

<offer_next>
Output this markdown directly (not as a code block). Route based on UAT results:

| Status | Route |
|--------|-------|
| All tests pass + more phases | Route A (next phase) |
| All tests pass + last phase | Route B (milestone complete) |
| Issues found + fix plans ready | Route C (execute fixes) |
| Issues found + planning blocked | Route D (manual intervention) |

---

**Route A: All tests pass, more phases remain**

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► PHASE {Z} VERIFIED ✓
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Phase {Z}: {Name}**

{N}/{N} tests passed
UAT complete ✓

───────────────────────────────────────────────────────────────

## ▶ Next Up

**Phase {Z+1}: {Name}** — {Goal from ROADMAP.md}

/gsd:discuss-phase {Z+1} — gather context and clarify approach

<sub>/clear first → fresh context window</sub>

───────────────────────────────────────────────────────────────

**Also available:**
- /gsd:plan-phase {Z+1} — skip discussion, plan directly
- /gsd:execute-phase {Z+1} — skip to execution (if already planned)

───────────────────────────────────────────────────────────────

---

**Route B: All tests pass, milestone complete**

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► PHASE {Z} VERIFIED ✓
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Phase {Z}: {Name}**

{N}/{N} tests passed
Final phase verified ✓

───────────────────────────────────────────────────────────────

## ▶ Next Up

**Audit milestone** — verify requirements, cross-phase integration, E2E flows

/gsd:audit-milestone

<sub>/clear first → fresh context window</sub>

───────────────────────────────────────────────────────────────

**Also available:**
- /gsd:complete-milestone — skip audit, archive directly

───────────────────────────────────────────────────────────────

---

**Route C: Issues found, fix plans ready**

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► PHASE {Z} ISSUES FOUND ⚠
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Phase {Z}: {Name}**

{N}/{M} tests passed
{X} issues diagnosed
Fix plans verified ✓

### Issues Found

{List issues with severity from UAT.md}

───────────────────────────────────────────────────────────────

## ▶ Next Up

**Execute fix plans** — run diagnosed fixes

/gsd:execute-phase {Z} --gaps-only

<sub>/clear first → fresh context window</sub>

───────────────────────────────────────────────────────────────

**Also available:**
- cat .planning/phases/{phase_dir}/*-PLAN.md — review fix plans
- /gsd:plan-phase {Z} --gaps — regenerate fix plans

───────────────────────────────────────────────────────────────

---

**Route D: Issues found, planning blocked**

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► PHASE {Z} BLOCKED ✗
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Phase {Z}: {Name}**

{N}/{M} tests passed
Fix planning blocked after {X} iterations

### Unresolved Issues

{List blocking issues from planner/checker output}

───────────────────────────────────────────────────────────────

## ▶ Next Up

**Manual intervention required**

Review the issues above and either:
1. Provide guidance for fix planning
2. Manually address blockers
3. Accept current state and continue

───────────────────────────────────────────────────────────────

**Options:**
- /gsd:plan-phase {Z} --gaps — retry fix planning with guidance
- /gsd:discuss-phase {Z} — gather more context before replanning

───────────────────────────────────────────────────────────────
</offer_next>

<logging>

## Log Events

UAT sessions track test progress and automated gap closure workflow. Use appropriate levels for visibility to verification users.

### 1. UAT Session Start

**Level:** INFO (3)
**When:** UAT session begins
**Purpose:** Record verification session lifecycle for audit trail

**Message Format:**
```
UAT session started for phase {phase}: {N} tests
```

**Context:**
```javascript
{
  event: "uat.session_start",
  phase: "04-verification-logging",
  tests_total: 12,
  session_id: "uat-04-20260129-084523",
  resume: false
}
```

### 2. Test Present

**Level:** DEBUG (4)
**When:** Presenting individual test to user
**Purpose:** Track granular test progression for debugging UAT issues

**Message Format:**
```
Presenting test {N}/{total}: {test_id}
```

**Context:**
```javascript
{
  event: "uat.test_present",
  session_id: "uat-04-20260129-084523",
  test_number: 3,
  test_total: 12,
  test_id: "verify-logger-initialization",
  expected_behavior: "Logger initializes with correct defaults"
}
```

### 3. Test Result

**Level:** INFO (3)
**When:** User provides test result (pass/fail)
**Purpose:** Permanent record of verification outcomes

**Message Format:**
```
Test {N} {status}: {test_id} [{severity if fail}]
```

**Context:**
```javascript
// Pass
{
  event: "uat.test_result",
  session_id: "uat-04-20260129-084523",
  test_number: 3,
  test_id: "verify-logger-initialization",
  status: "pass"
}

// Fail
{
  event: "uat.test_result",
  session_id: "uat-04-20260129-084523",
  test_number: 5,
  test_id: "verify-syslog-transport",
  status: "fail",
  severity: "critical",
  issue: "Messages not appearing in journal"
}
```

### 4. UAT Checkpoint

**Level:** DEBUG (4)
**When:** Batched writes to UAT.md (every 5 tests or on issue)
**Purpose:** Track checkpoint frequency for debugging UAT persistence

**Message Format:**
```
UAT checkpoint: {completed}/{remaining} tests
```

**Context:**
```javascript
{
  event: "uat.checkpoint",
  session_id: "uat-04-20260129-084523",
  tests_completed: 5,
  tests_remaining: 7
}
```

### 5. Debug Agent Spawn

**Level:** DEBUG (4)
**When:** Spawning gsd-debugger for issue diagnosis
**Purpose:** Track parallel debug agents for correlation

**Message Format:**
```
Spawning debug agent for issue {issue_id}
```

**Context:**
```javascript
{
  event: "agent.spawn",
  agent_type: "gsd-debugger",
  session_id: "uat-04-20260129-084523",
  issue_id: "verify-syslog-transport",
  model: "claude-sonnet-4-5-20250929"
}
```

### 6. Planner Spawn

**Level:** DEBUG (4)
**When:** Spawning gsd-planner in gap closure mode
**Purpose:** Track gap closure workflow automation

**Message Format:**
```
Spawning planner for phase {phase} gap closure
```

**Context:**
```javascript
{
  event: "agent.spawn",
  agent_type: "gsd-planner",
  phase: "04-verification-logging",
  mode: "gap_closure"
}
```

### 7. UAT Session Complete

**Level:** INFO (3)
**When:** All tests completed and results committed
**Purpose:** Record verification session completion and overall results

**Message Format:**
```
UAT session complete for phase {phase}: {passed}/{total} passed [{N} critical issues]
```

**Context:**
```javascript
{
  event: "uat.session_complete",
  phase: "04-verification-logging",
  session_id: "uat-04-20260129-084523",
  duration_ms: 1247000,
  tests_total: 12,
  tests_passed: 10,
  tests_failed: 2,
  critical_issues: 1
}
```

</logging>

<success_criteria>
- [ ] UAT.md created with tests from SUMMARY.md
- [ ] Tests presented one at a time with expected behavior
- [ ] Plain text responses (no structured forms)
- [ ] Severity inferred, never asked
- [ ] Batched writes: on issue, every 5 passes, or completion
- [ ] Committed on completion
- [ ] If issues: parallel debug agents diagnose root causes
- [ ] If issues: gsd-planner creates fix plans from diagnosed gaps
- [ ] If issues: gsd-plan-checker verifies fix plans (max 3 iterations)
- [ ] Ready for `/gsd:execute-phase` when complete
</success_criteria>
