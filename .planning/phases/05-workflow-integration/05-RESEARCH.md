# Phase 5: Workflow Integration - Research

**Researched:** 2026-01-28
**Domain:** Workflow orchestration logging, parallel execution observability, orchestrator event tracking
**Confidence:** HIGH

## Summary

This phase integrates logging specifications into all 27 workflow orchestration files (commands/gsd/*.md) so that phase, plan, and wave execution is fully observable. The research focused on three key areas: (1) orchestrator logging patterns for control-flow operations distinct from agent execution, (2) wave-based parallel execution correlation and aggregation, and (3) checkpoint/resume state logging for workflow continuity.

Key findings:
- Orchestrators own control flow and coordination, logging different events than agents (wave start/complete, aggregation, subagent spawning)
- Wave-based parallel execution requires correlation IDs to track which plans executed together and timing across parallel operations
- Modern orchestration platforms (Azure Durable Functions, AWS Lambda, Microsoft Agent Framework) use checkpoint-based state tracking with explicit logging at pause/resume points
- The existing logger infrastructure (Phase 1-2) and agent specifications (Phase 3-4) provide the foundation; this phase adds orchestrator-specific logging

The standard approach: Add `<logging>` sections to workflow orchestration markdown files using the same hybrid format (prose + code examples) established in Phase 3, but focusing on orchestrator events (wave execution, aggregation, subagent coordination) rather than agent lifecycle events.

**Primary recommendation:** Use orchestrator-specific logging events at INFO level for workflow milestones (wave start/complete, phase completion, verification launch), DEBUG level for coordination operations (plan discovery, wave grouping, result collection), and structured context including wave numbers and correlation data for parallel execution traceability.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Node.js logger.js | v1 (internal) | Core logging API with level-based methods | GSD's zero-dependency logger from Phase 1 |
| logger.child() | v1 (internal) | Category-based child loggers | Enables orchestrator-specific logging categories |
| Task() tool | Claude Code | Subagent spawning mechanism | Built-in orchestration primitive for parallel execution |
| Markdown workflows | N/A | Orchestrator specification format | GSD's existing pattern for workflow documentation |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| logger-metrics.js | v1 (internal) | Timer utilities | Duration tracking for wave execution, phase timing |
| Bash tool | Claude Code | Shell execution for state queries | Reading frontmatter, discovering plans, grouping waves |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Child logger categories | Separate logger instances | Child loggers share session ID for better correlation |
| Wave correlation IDs | Plan-level tracking only | Wave IDs enable parallel execution analysis and bottleneck identification |
| Inline logging specs | Separate logging docs | Inline specs in workflow markdown keep logging close to orchestration logic |

**Installation:**
```bash
# Logger already installed in Phase 1-2
# No additional dependencies needed
```

## Architecture Patterns

### Recommended Logging Section Placement

Workflow orchestration files follow a consistent structure. Logging specs should be added as a dedicated section:

```
commands/gsd/
├── execute-phase.md
│   ├── <objective>
│   ├── <execution_context>
│   ├── <context>
│   ├── <process>           # Main orchestration steps
│   ├── <logging>           # NEW: Orchestrator logging specs
│   ├── <offer_next>
│   └── <success_criteria>
```

### Pattern 1: Orchestrator vs Agent Logging Distinction

**What:** Orchestrators log control-flow events (coordination, aggregation, spawning), not execution events (task completion, file modifications)

**When to use:** All workflow orchestration logging specifications

**Example:**
```javascript
// ORCHESTRATOR LOGS (workflow files):
logger.info('Wave start', { wave: 1, plans: ['03-01', '03-02'], phase: '03' });
logger.info('Subagent spawn', { agent_type: 'gsd-executor', plan: '03-01' });
logger.info('Wave complete', { wave: 1, duration_ms: 45000, plans_completed: 2 });

// AGENT LOGS (agent files - already specified in Phase 3):
logger.info('Agent spawn: gsd-executor', { plan: '03-01', model: 'sonnet-4' });
logger.info('Task complete', { task: 1, files: ['src/auth.ts'] });
logger.info('Agent completion: gsd-executor', { outcome: 'success' });
```

**Why:**
- Clear separation of concerns: orchestrators coordinate, agents execute
- Enables filtering by category (orchestrator vs agent logs)
- Prevents duplicate logging (orchestrator logs spawn, agent logs its own startup)
- Aligns with modern orchestration patterns where control and execution are separated

**Source:** [The Orchestrator Pattern: Managing AI Work at Scale](https://ronie.medium.com/the-orchestrator-pattern-managing-ai-work-at-scale-a0f798d7d0fb) (2026)

### Pattern 2: Wave-Based Correlation

**What:** Log wave start/complete with all plan IDs in that wave, enabling correlation of parallel execution

**When to use:** execute-phase.md wave execution loop

**Example:**
```javascript
// Wave start - logs before spawning parallel agents
logger.info('Wave start', {
  phase: '03',
  wave: 1,
  plans: ['03-01', '03-02', '03-03'],
  plan_count: 3
});

// Subagent spawn - individual spawn events with wave context
for (const plan of wave1Plans) {
  logger.debug('Subagent spawn', {
    agent_type: 'gsd-executor',
    plan: plan.id,
    wave: 1,
    phase: '03'
  });
}

// Wave complete - logs after all parallel agents complete
logger.info('Wave complete', {
  phase: '03',
  wave: 1,
  duration_ms: 45000,
  plans_completed: 3,
  outcomes: { success: 3, failure: 0, partial: 0 }
});
```

**Why:**
- Enables reconstruction of which plans ran in parallel
- Duration tracking shows wave bottlenecks (if wave 1 takes 45s but wave 2 takes 5s, investigate wave 1)
- Outcome aggregation at wave level shows failure patterns
- Supports analysis: "Did parallel execution help? Or did plans wait on resources?"

**Source:** [FastDAG: Low-Latency Parallel Wave-Execution Consensus](https://pure.bit.edu.cn/en/publications/fastdag-a-low-latency-andparallel-wave-execution-consensus-withad/) (2026)

### Pattern 3: Checkpoint State Logging

**What:** Log checkpoint pause/resume with full state context for workflow continuity

**When to use:** execute-phase.md checkpoint handling, verify-work.md UAT sessions

**Example:**
```javascript
// Checkpoint pause - agent hit checkpoint, orchestrator handling
logger.info('Checkpoint pause', {
  phase: '03',
  plan: '03-02',
  checkpoint_type: 'human-verify',
  task_current: 3,
  tasks_completed: 2,
  tasks_total: 5,
  awaiting: 'User approval of database migration',
  state_snapshot: {
    completed_commits: ['abc123', 'def456'],
    modified_files: ['migrations/001.sql', 'migrations/002.sql']
  }
});

// Checkpoint resume - user responded, orchestrator continuing
logger.info('Checkpoint resume', {
  phase: '03',
  plan: '03-02',
  checkpoint_type: 'human-verify',
  user_response: 'approved',
  continuation_agent_id: 'task-xyz-789'
});
```

**Why:**
- Enables reconstruction of workflow state across sessions
- Duration between pause and resume shows user response time
- State snapshots support debugging: "What was the state when the checkpoint fired?"
- Critical for long-running workflows that span multiple Claude sessions

**Source:** [Microsoft Agent Framework - Checkpoints](https://learn.microsoft.com/en-us/agent-framework/user-guide/workflows/checkpoints), [AWS Lambda Durable Functions](https://aws.amazon.com/blogs/aws/build-multi-step-applications-and-ai-workflows-with-aws-lambda-durable-functions/) (2026)

### Pattern 4: Result Aggregation Logging

**What:** Log summary statistics after collecting results from parallel operations

**When to use:** After wave completes, after phase completes, after verification completes

**Example:**
```javascript
// Phase aggregation - after all waves complete
logger.info('Phase complete', {
  phase: '03',
  plans_total: 7,
  plans_completed: 7,
  waves_executed: 3,
  total_duration_ms: 120000,
  outcomes: { success: 6, failure: 0, partial: 1 },
  artifacts_created: ['03-01-SUMMARY.md', '03-02-SUMMARY.md', /* ... */],
  verification_status: 'passed'
});

// Verification aggregation - after verifier checks all must_haves
logger.info('Verification complete', {
  phase: '03',
  status: 'gaps_found',
  score: '8/10',
  truths_verified: 8,
  truths_total: 10,
  gaps_count: 2,
  duration_ms: 15000
});
```

**Why:**
- Single log entry shows complete phase outcome
- Statistics enable trend analysis: "Are phases getting faster?"
- Outcome aggregation shows quality: "What percentage of plans succeed first time?"
- Supports metrics: success rate, average duration, gap rate

**Source:** [Prefect - Event-Based Orchestration](https://airbyte.com/top-etl-tools-for-sources/data-orchestration-tools), [Data Observability Best Practices](https://www.getorchestra.io/guides/data-observability-best-practices-for-workflow-orchestration) (2026)

### Anti-Patterns to Avoid

- **Logging agent execution details in orchestrator:** Don't log "Task 3 complete" from orchestrator. That's agent responsibility. Orchestrator logs "Agent completion detected".

- **Missing wave correlation:** Don't log plan execution without wave context. Without wave numbers, can't reconstruct parallel execution.

- **Aggregating without raw data:** Don't log only "7 plans complete" without logging individual plan outcomes. Need both aggregate (overview) and detail (debugging).

- **Checkpoint logging without state:** Don't log "Checkpoint pause" without state snapshot. Can't resume without knowing what was completed.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Correlation across parallel agents | Manual correlation ID passing | logger.child() with inherited session ID | Session ID automatically flows through all child loggers, no manual propagation needed |
| Wave timing | Manual Date.now() calculations | logger-metrics.js Timer class with wave tagging | High-resolution timing with context tagging, automatic duration calculation |
| Result aggregation logic | Custom aggregation code | Structured context objects logged at completion | Log outcome per plan at DEBUG, aggregate at wave/phase complete at INFO - aggregation happens in log analysis, not code |
| Checkpoint state serialization | JSON.stringify() ad-hoc | Log state snapshot as structured context | Logger already handles structured data serialization, preserves types, integrates with syslog structured data format |

**Key insight:** Orchestrators should log events with structured context, not implement aggregation logic. Analysis tools (journalctl, log aggregators) handle aggregation and correlation. Keep orchestrators lean.

## Common Pitfalls

### Pitfall 1: Over-Logging Orchestrator Operations

**What goes wrong:** Logging every bash command, every file read, every grep operation at INFO level

**Example:**
```javascript
// BAD - too verbose at INFO level
logger.info('Reading plan file', { path: '03-01-PLAN.md' });
logger.info('Parsing frontmatter', { plan: '03-01' });
logger.info('Extracting wave number', { wave: 1 });
logger.info('Grouping into wave', { wave: 1, plan: '03-01' });

// GOOD - single INFO log for milestone, DEBUG for operations
logger.debug('Plan discovery', { phase: '03', plans_found: 7 });
logger.debug('Wave grouping', { waves: { 1: ['03-01', '03-02'], 2: ['03-03'] } });
logger.info('Wave start', { phase: '03', wave: 1, plans: ['03-01', '03-02'] });
```

**Why it happens:** Treating orchestration operations like agent tasks (which do need detailed logging)

**How to avoid:** Use this rule:
- INFO: Workflow milestones (wave start/complete, phase complete, verification launch)
- DEBUG: Coordination operations (discovery, grouping, result collection)
- TRACE: Individual file reads, bash commands (rarely needed)

**Warning signs:** More than 5 INFO logs between wave start and wave complete

### Pitfall 2: Logging Before Operations vs After

**What goes wrong:** Logging "Wave complete" before actually checking if all plans completed successfully

**Example:**
```javascript
// BAD - premature logging
logger.info('Wave complete', { wave: 1, plans: ['03-01', '03-02'] });
// ... then checks if SUMMARYs exist ...
// ... discovers 03-02 failed ...

// GOOD - log after verification
// ... spawn agents ...
// ... wait for completion ...
// ... verify SUMMARYs created ...
const outcomes = { success: 1, failure: 1 };
logger.info('Wave complete', { wave: 1, outcomes: outcomes });
```

**Why it happens:** Logging at the start of a code block rather than after outcome is determined

**How to avoid:** Log completion events only after outcome is verified. For start events, log immediately. For completion events, verify then log.

**Warning signs:** Logs say "success" but workflow actually failed

### Pitfall 3: Missing Context for Debugging

**What goes wrong:** Logging "Error spawning agent" without plan, phase, model, or error details

**Example:**
```javascript
// BAD - insufficient context
logger.error('Failed to spawn agent');

// GOOD - actionable context
logger.error('Failed to spawn agent', {
  agent_type: 'gsd-executor',
  phase: '03',
  plan: '03-02',
  model: 'claude-sonnet-4',
  error: error.message,
  stack: error.stack
});
```

**Why it happens:** Rushing to add logging without considering what's needed for debugging

**How to avoid:** For error logs, always include:
- What operation failed (agent_type, operation_name)
- Context identifiers (phase, plan, wave)
- Error details (message, stack if available)
- Current state (tasks_completed, plans_completed)

**Warning signs:** Error logs that require reading code to understand what failed

### Pitfall 4: Inconsistent Event Naming

**What goes wrong:** Using "Wave execution started", "Wave start", "Begin wave", "Wave starting" across different workflows

**Example:**
```javascript
// BAD - inconsistent across files
// execute-phase.md:
logger.info('Wave execution started', { wave: 1 });

// plan-phase.md (hypothetically):
logger.info('Starting wave assignment', { wave: 1 });

// GOOD - consistent naming convention
logger.info('Wave start', { wave: 1, operation: 'execution' });
logger.info('Wave assignment', { wave: 1, operation: 'planning' });
```

**Why it happens:** Different developers/agents working on different files without coordination

**How to avoid:** Establish standard event names:
- "Wave start" / "Wave complete" for execution
- "Phase complete" for phase-level aggregation
- "Verification start" / "Verification complete" for verification
- "Subagent spawn" for agent creation
- "Checkpoint pause" / "Checkpoint resume" for checkpoints

**Warning signs:** Can't grep for consistent event names, need multiple patterns to find same type of event

## Code Examples

Verified patterns for workflow orchestration logging:

### Example 1: execute-phase.md Wave Execution Loop

```javascript
// Context: Orchestrator has grouped plans into waves and is executing wave 1

// Log wave start before spawning agents
logger.info('Wave start', {
  phase: phaseNumber,
  wave: waveNumber,
  plans: wavePlans.map(p => p.id),
  plan_count: wavePlans.length
});

// Spawn agents in parallel (Task tool handles execution)
const results = [];
for (const plan of wavePlans) {
  logger.debug('Subagent spawn', {
    agent_type: 'gsd-executor',
    plan: plan.id,
    wave: waveNumber,
    phase: phaseNumber,
    model: executorModel
  });

  // Task() blocks until agent completes - result contains agent outcome
  const result = await Task(/* ... */);
  results.push(result);
}

// Collect outcomes after all agents complete
const outcomes = {
  success: results.filter(r => r.outcome === 'success').length,
  failure: results.filter(r => r.outcome === 'failure').length,
  partial: results.filter(r => r.outcome === 'partial').length
};

// Log wave completion with aggregated results
const waveEndTime = Date.now();
logger.info('Wave complete', {
  phase: phaseNumber,
  wave: waveNumber,
  duration_ms: waveEndTime - waveStartTime,
  plans_completed: results.length,
  outcomes: outcomes
});
```

**Source:** GSD execute-phase.md process step 4, [Parallel Execution Patterns](https://www.kore.ai/blog/boost-ai-agent-performance-with-parallel-execution) (2026)

### Example 2: plan-phase.md Research and Planning Orchestration

```javascript
// Context: Orchestrator determining if research needed before planning

logger.debug('Research check', {
  phase: phaseNumber,
  research_exists: researchFileExists,
  force_research: hasResearchFlag,
  decision: needsResearch ? 'spawn_researcher' : 'skip_to_planning'
});

if (needsResearch) {
  logger.info('Research start', {
    phase: phaseNumber,
    mode: hasResearchFlag ? 'forced' : 'automatic'
  });

  // Spawn researcher subagent
  logger.debug('Subagent spawn', {
    agent_type: 'gsd-phase-researcher',
    phase: phaseNumber,
    model: researcherModel
  });

  const researchResult = await Task(/* researcher prompt */);

  logger.info('Research complete', {
    phase: phaseNumber,
    duration_ms: researchDuration,
    outcome: researchResult.status,
    confidence: researchResult.confidence
  });
}

// Spawn planner
logger.info('Planning start', {
  phase: phaseNumber,
  mode: isGapClosure ? 'gap_closure' : 'standard',
  research_available: researchFileExists
});

logger.debug('Subagent spawn', {
  agent_type: 'gsd-planner',
  phase: phaseNumber,
  model: plannerModel
});

const planResult = await Task(/* planner prompt */);

logger.info('Planning complete', {
  phase: phaseNumber,
  duration_ms: planningDuration,
  plans_created: planResult.plans.length,
  waves_count: planResult.waves.length
});
```

**Source:** GSD plan-phase.md process steps 5-8, [Orchestration Layer Best Practices](https://www.acceldata.io/blog/orchestration-layer-explained-functions-tools-and-best-practices) (2026)

### Example 3: verify-work.md UAT Session Management

```javascript
// Context: Orchestrator managing conversational UAT testing with checkpoints

logger.info('UAT session start', {
  phase: phaseNumber,
  tests_total: testList.length,
  session_id: uatSessionId,
  resume: isResume
});

// Test loop - one test at a time
for (let i = 0; i < testList.length; i++) {
  const test = testList[i];

  logger.debug('Test present', {
    session_id: uatSessionId,
    test_number: i + 1,
    test_total: testList.length,
    test_id: test.id,
    expected_behavior: test.expected
  });

  // Present test, wait for user response (plain text)
  // ... user responds ...

  const testResult = parseUserResponse(response);

  logger.info('Test result', {
    session_id: uatSessionId,
    test_number: i + 1,
    test_id: test.id,
    status: testResult.status, // 'pass' | 'fail'
    severity: testResult.severity, // 'critical' | 'major' | 'minor' (if fail)
    issue: testResult.issue // user description (if fail)
  });

  // Checkpoint: Save state every 5 tests
  if ((i + 1) % 5 === 0) {
    logger.debug('UAT checkpoint', {
      session_id: uatSessionId,
      tests_completed: i + 1,
      tests_remaining: testList.length - (i + 1)
    });
    // ... write UAT.md with current state ...
  }
}

// Session complete - aggregate results
const issuesFound = testResults.filter(r => r.status === 'fail');

logger.info('UAT session complete', {
  phase: phaseNumber,
  session_id: uatSessionId,
  duration_ms: sessionDuration,
  tests_total: testList.length,
  tests_passed: testList.length - issuesFound.length,
  tests_failed: issuesFound.length,
  critical_issues: issuesFound.filter(i => i.severity === 'critical').length
});
```

**Source:** GSD verify-work.md process steps 5-7, [Human-in-the-Loop Implementation](https://www.moxo.com/blog/hitl-implementation-checklist) (2026)

### Example 4: Checkpoint Pause and Resume

```javascript
// Context: Orchestrator detected checkpoint, presenting to user

logger.info('Checkpoint pause', {
  phase: phaseNumber,
  plan: planId,
  checkpoint_type: checkpointTask.type,
  task_current: currentTaskNumber,
  tasks_completed: completedTasks.length,
  tasks_total: totalTasks,
  awaiting: checkpointTask.resume_signal,
  state_snapshot: {
    completed_commits: completedTasks.map(t => t.commit),
    modified_files: filesModified,
    variables: checkpointTask.state
  }
});

// ... present checkpoint to user, wait for response ...

logger.info('Checkpoint resume', {
  phase: phaseNumber,
  plan: planId,
  checkpoint_type: checkpointTask.type,
  user_response: userResponse,
  validation_status: isValid ? 'valid' : 'invalid',
  continuation_agent_id: continuationTaskId
});

// Spawn continuation agent (fresh context)
logger.debug('Subagent spawn', {
  agent_type: 'gsd-executor',
  plan: planId,
  wave: waveNumber,
  phase: phaseNumber,
  model: executorModel,
  mode: 'continuation',
  resume_from_task: currentTaskNumber + 1
});
```

**Source:** GSD execute-phase.md checkpoint_handling section, [Checkpointing Workflows](https://learn.microsoft.com/en-us/agent-framework/tutorials/workflows/checkpointing-and-resuming) (2026)

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Agents log everything | Orchestrators log coordination, agents log execution | 2026 | Clear separation: orchestrator category shows control flow, agent category shows work |
| Sequential execution only | Wave-based parallel execution with correlation | 2026 | Can now analyze: did parallelization help? Where are bottlenecks? |
| Logging after completion | Logging at checkpoints for state recovery | 2026 | Long-running workflows can resume from checkpoints, not restart from beginning |
| Ad-hoc log messages | Structured events with consistent naming | 2026 | Can grep for "Wave start", aggregate metrics, build dashboards |
| Per-plan logging only | Wave-level aggregation logging | 2026 | Single log entry shows phase outcome, enables trend analysis |

**Deprecated/outdated:**
- **Monolithic logging:** Combining orchestrator and agent logs in single category - now separated via child loggers for better filtering
- **Synchronous logging assumptions:** Assuming logs appear in execution order - parallel execution requires correlation IDs (wave, phase) to reconstruct order
- **String-only log messages:** "Wave 1 complete: 03-01, 03-02" - now use structured context with arrays and counts for aggregation

## Open Questions

Things that couldn't be fully resolved:

1. **Cross-wave correlation for debugging**
   - What we know: Wave-level correlation via wave number works within a phase
   - What's unclear: Best pattern for correlating across phases when debugging multi-phase issues
   - Recommendation: Use phase + wave combination as correlation key; investigate phase-level session IDs if needed

2. **Optimal checkpoint frequency**
   - What we know: Microsoft Agent Framework checkpoints at superstep boundaries; AWS Lambda uses replay mechanism
   - What's unclear: How often GSD workflows should create state snapshots (every N tasks? every checkpoint task only?)
   - Recommendation: Log checkpoint pause/resume only when explicit checkpoint tasks are hit; investigate adding periodic state snapshots if resume failures occur

3. **Aggregation logging verbosity**
   - What we know: Need both detail (per-plan outcomes) and summary (wave outcomes) for effective debugging
   - What's unclear: Should aggregation logs include full outcome arrays or just counts?
   - Recommendation: Use counts at INFO level for readability, full arrays at DEBUG level for detailed analysis

4. **Verification logging integration**
   - What we know: Verifier agent (gsd-verifier) already has logging specs from Phase 3-4
   - What's unclear: Should execute-phase orchestrator log "Verification start/complete" or rely solely on verifier's logs?
   - Recommendation: Orchestrator logs "Subagent spawn: gsd-verifier" and "Phase complete: verification_status={status}" for workflow continuity; verifier logs its detailed verification operations

## Sources

### Primary (HIGH confidence)
- GSD lib/logger.js - Core logging API with child logger support
- GSD agents/gsd-executor.md - Agent logging specifications (lines 773-900+)
- GSD commands/gsd/execute-phase.md - Wave execution orchestration pattern
- GSD commands/gsd/plan-phase.md - Research and planning orchestration flow
- GSD .planning/phases/03-agent-instrumentation/03-RESEARCH.md - Agent logging patterns and hybrid format

### Secondary (MEDIUM confidence)
- [The Orchestrator Pattern: Managing AI Work at Scale](https://ronie.medium.com/the-orchestrator-pattern-managing-ai-work-at-scale-a0f798d7d0fb) (2026) - Orchestrator control flow vs execution separation
- [Microsoft Agent Framework - Checkpoints](https://learn.microsoft.com/en-us/agent-framework/user-guide/workflows/checkpoints) (2026) - Checkpoint state management and resume patterns
- [AWS Lambda Durable Functions](https://aws.amazon.com/blogs/aws/build-multi-step-applications-and-ai-workflows-with-aws-lambda-durable-functions/) (2026) - Checkpoint and replay mechanism
- [Data Observability Best Practices for Workflow Orchestration](https://www.getorchestra.io/guides/data-observability-best-practices-for-workflow-orchestration) (2026) - Real-time monitoring and logging strategies
- [FastDAG: Low-Latency Parallel Wave-Execution Consensus](https://pure.bit.edu.cn/en/publications/fastdag-a-low-latency-andparallel-wave-execution-consensus-withad/) (2026) - Parallel wave execution patterns
- [Boost AI Agent Performance with Parallel Execution](https://www.kore.ai/blog/boost-ai-agent-performance-with-parallel-execution) (2026) - Parallel task execution for AI agents

### Tertiary (LOW confidence - WebSearch only)
- [11 Key Observability Best Practices You Should Know in 2026](https://spacelift.io/blog/observability-best-practices) - Build observability into development lifecycle
- [Why Structured Logging is Fundamental to Observability](https://betterstack.com/community/guides/logging/structured-logging/) - Structured logging benefits
- [Human in the Loop Implementation Checklist 2026](https://www.moxo.com/blog/hitl-implementation-checklist) - HITL logging patterns

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Using existing GSD logger infrastructure, well-understood patterns
- Architecture: HIGH - Wave execution, checkpoint patterns verified in GSD codebase and modern platforms
- Orchestrator vs agent distinction: HIGH - Clear separation in code and referenced 2026 patterns
- Aggregation patterns: MEDIUM - Best practices established but specific implementation details may need iteration
- Cross-phase correlation: MEDIUM - Wave-level correlation is clear, multi-phase correlation needs validation

**Research date:** 2026-01-28
**Valid until:** ~60 days (stable domain - orchestration patterns change slowly, existing codebase provides solid foundation)
