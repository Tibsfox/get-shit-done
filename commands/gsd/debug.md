---
name: gsd:debug
description: Systematic debugging with persistent state across context resets
argument-hint: [issue description]
allowed-tools:
  - Read
  - Bash
  - Task
  - AskUserQuestion
---

<objective>
Debug issues using scientific method with subagent isolation.

**Orchestrator role:** Gather symptoms, spawn gsd-debugger agent, handle checkpoints, spawn continuations.

**Why subagent:** Investigation burns context fast (reading files, forming hypotheses, testing). Fresh 200k context per investigation. Main context stays lean for user interaction.
</objective>

<context>
User's issue: $ARGUMENTS

Check for active sessions:
```bash
ls .planning/debug/*.md 2>/dev/null | grep -v resolved | head -5
```
</context>

<process>

## 0. Resolve Model Profile

Read model profile for agent spawning:

```bash
MODEL_PROFILE=$(cat .planning/config.json 2>/dev/null | grep -o '"model_profile"[[:space:]]*:[[:space:]]*"[^"]*"' | grep -o '"[^"]*"$' | tr -d '"' || echo "balanced")
```

Default to "balanced" if not set.

**Model lookup table:**

| Agent | quality | balanced | budget |
|-------|---------|----------|--------|
| gsd-debugger | opus | sonnet | sonnet |

Store resolved model for use in Task calls below.

## 1. Check Active Sessions

If active sessions exist AND no $ARGUMENTS:
- List sessions with status, hypothesis, next action
- User picks number to resume OR describes new issue

If $ARGUMENTS provided OR user describes new issue:
- Continue to symptom gathering

## 2. Gather Symptoms (if new issue)

Use AskUserQuestion for each:

1. **Expected behavior** - What should happen?
2. **Actual behavior** - What happens instead?
3. **Error messages** - Any errors? (paste or describe)
4. **Timeline** - When did this start? Ever worked?
5. **Reproduction** - How do you trigger it?

After all gathered, confirm ready to investigate.

## 3. Spawn gsd-debugger Agent

Fill prompt and spawn:

```markdown
<objective>
Investigate issue: {slug}

**Summary:** {trigger}
</objective>

<symptoms>
expected: {expected}
actual: {actual}
errors: {errors}
reproduction: {reproduction}
timeline: {timeline}
</symptoms>

<mode>
symptoms_prefilled: true
goal: find_and_fix
</mode>

<debug_file>
Create: .planning/debug/{slug}.md
</debug_file>
```

```
Task(
  prompt=filled_prompt,
  subagent_type="gsd-debugger",
  model="{debugger_model}",
  description="Debug {slug}"
)
```

## 4. Handle Agent Return

**If `## ROOT CAUSE FOUND`:**
- Display root cause and evidence summary
- Offer options:
  - "Fix now" - spawn fix subagent
  - "Plan fix" - suggest /gsd:plan-phase --gaps
  - "Manual fix" - done

**If `## CHECKPOINT REACHED`:**
- Present checkpoint details to user
- Get user response
- Spawn continuation agent (see step 5)

**If `## INVESTIGATION INCONCLUSIVE`:**
- Show what was checked and eliminated
- Offer options:
  - "Continue investigating" - spawn new agent with additional context
  - "Manual investigation" - done
  - "Add more context" - gather more symptoms, spawn again

## 5. Spawn Continuation Agent (After Checkpoint)

When user responds to checkpoint, spawn fresh agent:

```markdown
<objective>
Continue debugging {slug}. Evidence is in the debug file.
</objective>

<prior_state>
Debug file: @.planning/debug/{slug}.md
</prior_state>

<checkpoint_response>
**Type:** {checkpoint_type}
**Response:** {user_response}
</checkpoint_response>

<mode>
goal: find_and_fix
</mode>
```

```
Task(
  prompt=continuation_prompt,
  subagent_type="gsd-debugger",
  model="{debugger_model}",
  description="Continue debug {slug}"
)
```

</process>

<logging>

## Logging Specifications for Orchestrator

Debug sessions track investigation lifecycle from symptom gathering through root cause diagnosis. Log key events for debugging the debugger and creating audit trail.

### 1. Debug Session Start (INFO level)

Log when debug session begins (new or resumed) to record investigation lifecycle for tracking active debugging work.

**Message format:** "Debug session started: {issue_slug} ({active_sessions_count} active)"

**Context to include:**
- `event`: "debug.session_start"
- `session_id`: Unique session identifier (e.g., "debug-auth-timeout-20260129")
- `issue_slug`: Issue slug identifier
- `trigger`: Brief issue description
- `active_sessions_count`: Number of active debug sessions

**Example code:**

```javascript
logger.info(`Debug session started: ${issueSlug} (${activeSessionsCount} active)`, {
  event: 'debug.session_start',
  session_id: sessionId,
  issue_slug: issueSlug,
  trigger: triggerDescription,
  active_sessions_count: activeSessionsCount
});
```

### 2. Symptom Gathering (DEBUG level)

Log when each symptom question is answered to track symptom collection completeness.

**Message format:** "Symptom gathered: {symptom_type}"

**Context to include:**
- `event`: "debug.symptom_gathered"
- `session_id`: Session identifier
- `symptom_type`: Type of symptom (e.g., "expected_behavior", "actual_behavior", "errors")
- `response_received`: Whether response was received (boolean)

**Example code:**

```javascript
logger.debug(`Symptom gathered: ${symptomType}`, {
  event: 'debug.symptom_gathered',
  session_id: sessionId,
  symptom_type: symptomType,
  response_received: true
});
```

### 3. Debugger Spawn (DEBUG level)

Log when spawning gsd-debugger agent (initial or continuation) to track debugger agent spawning for correlation.

**Message format:** "Spawning debugger agent [{mode}]: {session_id}"

**Context to include:**
- `event`: "agent.spawn"
- `agent_type`: "gsd-debugger"
- `session_id`: Session identifier
- `model`: Claude model being used
- `mode`: "initial" or "continuation"

**Example code:**

```javascript
logger.debug(`Spawning debugger agent [${mode}]: ${sessionId}`, {
  event: 'agent.spawn',
  agent_type: 'gsd-debugger',
  session_id: sessionId,
  model: debuggerModel,
  mode: mode
});
```

### 4. Checkpoint Handling (INFO level)

Log when debugger agent returns checkpoint requiring user action to track user interaction points in debugging workflow.

**Message format:** "Debug checkpoint reached: {checkpoint_type}"

**Context to include:**
- `event`: "debug.checkpoint"
- `session_id`: Session identifier
- `checkpoint_type`: Type of checkpoint (e.g., "human-verify", "decision")
- `awaiting`: Description of what's needed from user

**Example code:**

```javascript
logger.info(`Debug checkpoint reached: ${checkpointType}`, {
  event: 'debug.checkpoint',
  session_id: sessionId,
  checkpoint_type: checkpointType,
  awaiting: awaitingDescription
});
```

### 5. Investigation Outcome (INFO level)

Log when investigation completes to record investigation results for audit trail.

**Message format:** "Debug session {outcome}: {session_id} [{hypotheses_tested} hypotheses tested]"

**Context to include:**
- `event`: "debug.investigation_complete"
- `session_id`: Session identifier
- `outcome`: "root_cause_found" or "inconclusive"
- `duration_ms`: Investigation duration in milliseconds
- `hypotheses_tested`: Number of hypotheses tested

**Example code:**

```javascript
// Root cause found
logger.info(`Debug session root_cause_found: ${sessionId} [${hypothesesTested} hypotheses tested]`, {
  event: 'debug.investigation_complete',
  session_id: sessionId,
  outcome: 'root_cause_found',
  duration_ms: duration,
  hypotheses_tested: hypothesesTested
});

// Inconclusive
logger.info(`Debug session inconclusive: ${sessionId} [${hypothesesTested} hypotheses tested]`, {
  event: 'debug.investigation_complete',
  session_id: sessionId,
  outcome: 'inconclusive',
  duration_ms: duration,
  hypotheses_tested: hypothesesTested
});
```

</logging>

<success_criteria>
- [ ] Active sessions checked
- [ ] Symptoms gathered (if new)
- [ ] gsd-debugger spawned with context
- [ ] Checkpoints handled correctly
- [ ] Root cause confirmed before fixing
</success_criteria>
