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

## Log Events

Debug sessions track investigation lifecycle from symptom gathering through root cause diagnosis. Log key events for debugging the debugger and audit trail.

### 1. Debug Session Start

**Level:** INFO (3)
**When:** Debug session begins (new or resumed)
**Purpose:** Record investigation lifecycle for tracking active debugging work

**Message Format:**
```
Debug session started: {issue_slug} ({active_sessions_count} active)
```

**Context:**
```javascript
{
  event: "debug.session_start",
  session_id: "debug-auth-timeout-20260129",
  issue_slug: "auth-timeout-on-refresh",
  trigger: "Token refresh fails with 401 after 15 minutes",
  active_sessions_count: 2
}
```

### 2. Symptom Gathering

**Level:** DEBUG (4)
**When:** Each symptom question answered
**Purpose:** Track symptom collection completeness

**Message Format:**
```
Symptom gathered: {symptom_type}
```

**Context:**
```javascript
{
  event: "debug.symptom_gathered",
  session_id: "debug-auth-timeout-20260129",
  symptom_type: "expected_behavior",
  response_received: true
}
```

### 3. Debugger Spawn

**Level:** DEBUG (4)
**When:** Spawning gsd-debugger agent (initial or continuation)
**Purpose:** Track debugger agent spawning for correlation

**Message Format:**
```
Spawning debugger agent [{mode}]: {session_id}
```

**Context:**
```javascript
{
  event: "agent.spawn",
  agent_type: "gsd-debugger",
  session_id: "debug-auth-timeout-20260129",
  model: "claude-sonnet-4-5-20250929",
  mode: "initial"  // or "continuation"
}
```

### 4. Checkpoint Handling

**Level:** INFO (3)
**When:** Debugger agent returns checkpoint requiring user action
**Purpose:** Track user interaction points in debugging workflow

**Message Format:**
```
Debug checkpoint reached: {checkpoint_type}
```

**Context:**
```javascript
{
  event: "debug.checkpoint",
  session_id: "debug-auth-timeout-20260129",
  checkpoint_type: "human-verify",
  awaiting: "Reproduce auth timeout with network inspector open"
}
```

### 5. Investigation Outcome

**Level:** INFO (3)
**When:** Investigation completes (root cause found or inconclusive)
**Purpose:** Record investigation results for audit trail

**Message Format:**
```
Debug session {outcome}: {session_id} [{hypotheses_tested} hypotheses tested]
```

**Context:**
```javascript
// Root cause found
{
  event: "debug.investigation_complete",
  session_id: "debug-auth-timeout-20260129",
  outcome: "root_cause_found",
  duration_ms: 892000,
  hypotheses_tested: 4
}

// Inconclusive
{
  event: "debug.investigation_complete",
  session_id: "debug-auth-timeout-20260129",
  outcome: "inconclusive",
  duration_ms: 1456000,
  hypotheses_tested: 7
}
```

</logging>

<success_criteria>
- [ ] Active sessions checked
- [ ] Symptoms gathered (if new)
- [ ] gsd-debugger spawned with context
- [ ] Checkpoints handled correctly
- [ ] Root cause confirmed before fixing
</success_criteria>
