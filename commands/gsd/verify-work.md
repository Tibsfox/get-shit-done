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

## Logging Specifications for Orchestrator

UAT sessions track test progress and automated gap closure workflow. Log key events for verification audit trail and debugging UAT issues.

### 1. UAT Session Start (INFO level)

Log when UAT session begins to record verification session lifecycle for audit trail.

**Message format:** "UAT session started for phase {phase}: {N} tests"

**Context to include:**
- `event`: "uat.session_start"
- `phase`: Phase identifier (e.g., "04-verification-logging")
- `tests_total`: Number of tests to execute
- `session_id`: Unique session identifier (e.g., "uat-04-20260129-084523")
- `resume`: Whether resuming existing session (boolean)

**Example code:**

```javascript
logger.info(`UAT session started for phase ${phase}: ${testsTotal} tests`, {
  event: 'uat.session_start',
  phase: phase,
  tests_total: testsTotal,
  session_id: sessionId,
  resume: false
});
```

### 2. Test Present (DEBUG level)

Log when presenting individual test to user to track granular test progression for debugging UAT issues.

**Message format:** "Presenting test {N}/{total}: {test_id}"

**Context to include:**
- `event`: "uat.test_present"
- `session_id`: Session identifier
- `test_number`: Current test number
- `test_total`: Total test count
- `test_id`: Test identifier
- `expected_behavior`: Expected behavior description

**Example code:**

```javascript
logger.debug(`Presenting test ${testNumber}/${testTotal}: ${testId}`, {
  event: 'uat.test_present',
  session_id: sessionId,
  test_number: testNumber,
  test_total: testTotal,
  test_id: testId,
  expected_behavior: expectedBehavior
});
```

### 3. Test Result (INFO level)

Log when user provides test result to create permanent record of verification outcomes.

**Message format:** "Test {N} {status}: {test_id} [{severity if fail}]"

**Context to include:**
- `event`: "uat.test_result"
- `session_id`: Session identifier
- `test_number`: Test number
- `test_id`: Test identifier
- `status`: "pass" or "fail"
- `severity`: (if fail) "critical", "high", "medium", or "low"
- `issue`: (if fail) Issue description

**Example code:**

```javascript
// Pass
logger.info(`Test ${testNumber} pass: ${testId}`, {
  event: 'uat.test_result',
  session_id: sessionId,
  test_number: testNumber,
  test_id: testId,
  status: 'pass'
});

// Fail
logger.info(`Test ${testNumber} fail: ${testId} [${severity}]`, {
  event: 'uat.test_result',
  session_id: sessionId,
  test_number: testNumber,
  test_id: testId,
  status: 'fail',
  severity: 'critical',
  issue: issueDescription
});
```

### 4. UAT Checkpoint (DEBUG level)

Log batched writes to UAT.md to track checkpoint frequency for debugging UAT persistence.

**Message format:** "UAT checkpoint: {completed}/{remaining} tests"

**Context to include:**
- `event`: "uat.checkpoint"
- `session_id`: Session identifier
- `tests_completed`: Number of tests completed
- `tests_remaining`: Number of tests remaining

**Example code:**

```javascript
logger.debug(`UAT checkpoint: ${testsCompleted}/${testsRemaining} tests`, {
  event: 'uat.checkpoint',
  session_id: sessionId,
  tests_completed: testsCompleted,
  tests_remaining: testsRemaining
});
```

### 5. Debug Agent Spawn (DEBUG level)

Log when spawning gsd-debugger for issue diagnosis to track parallel debug agents for correlation.

**Message format:** "Spawning debug agent for issue {issue_id}"

**Context to include:**
- `event`: "agent.spawn"
- `agent_type`: "gsd-debugger"
- `session_id`: Session identifier
- `issue_id`: Issue identifier
- `model`: Claude model being used

**Example code:**

```javascript
logger.debug(`Spawning debug agent for issue ${issueId}`, {
  event: 'agent.spawn',
  agent_type: 'gsd-debugger',
  session_id: sessionId,
  issue_id: issueId,
  model: debuggerModel
});
```

### 6. Planner Agent Spawn (DEBUG level)

Log when spawning gsd-planner in gap closure mode to track gap closure workflow automation.

**Message format:** "Spawning planner for phase {phase} gap closure"

**Context to include:**
- `event`: "agent.spawn"
- `agent_type`: "gsd-planner"
- `phase`: Phase identifier
- `mode`: "gap_closure"

**Example code:**

```javascript
logger.debug(`Spawning planner for phase ${phase} gap closure`, {
  event: 'agent.spawn',
  agent_type: 'gsd-planner',
  phase: phase,
  mode: 'gap_closure'
});
```

### 7. UAT Session Complete (INFO level)

Log when all tests completed and results committed to record verification session completion and overall results.

**Message format:** "UAT session complete for phase {phase}: {passed}/{total} passed [{N} critical issues]"

**Context to include:**
- `event`: "uat.session_complete"
- `phase`: Phase identifier
- `session_id`: Session identifier
- `duration_ms`: Session duration in milliseconds
- `tests_total`: Total test count
- `tests_passed`: Number of passed tests
- `tests_failed`: Number of failed tests
- `critical_issues`: Number of critical severity issues

**Example code:**

```javascript
logger.info(`UAT session complete for phase ${phase}: ${testsPassed}/${testsTotal} passed [${criticalIssues} critical issues]`, {
  event: 'uat.session_complete',
  phase: phase,
  session_id: sessionId,
  duration_ms: duration,
  tests_total: testsTotal,
  tests_passed: testsPassed,
  tests_failed: testsFailed,
  critical_issues: criticalIssues
});
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
