# Phase 3: Agent Instrumentation - Context

**Gathered:** 2026-01-29
**Status:** Ready for planning

<domain>
## Phase Boundary

Add `<logging>` sections to 11 agent markdown files specifying what orchestrators should log during agent lifecycle events (spawn, completion, checkpoints, deviations, context pressure). These specifications guide orchestrator behavior — agents themselves don't execute logging, they contain contracts that orchestrators read and implement.

This is documentation/specification work, not logging code implementation.

</domain>

<decisions>
## Implementation Decisions

### Specification Format & Structure

- **Hybrid documentation style**: Prose descriptions of what to log + example code showing exact syntax
  - Example: "Log agent spawn at INFO level with model and phase" + `logger.info('Agent spawn', {model, phase})`
  - Provides clarity of prose with concrete implementation examples

- **Section structure**: `<logging>` for standard lifecycle, separate sections for checkpoints/deviations
  - Core lifecycle events (spawn, completion) in main `<logging>` section
  - Special events (checkpoints, deviations) in their own sections near related agent behaviors
  - Keeps exceptions separate from standard flow

- **Parameter notation**: Use template variables like `{agent_type}`, `{phase_number}`, `{duration_ms}`
  - Orchestrators substitute at runtime
  - Clear placeholders show what data is available
  - Avoids verbose explicit type definitions

- **No conditional logging**: Always log specified events
  - Filtering happens via log levels, not conditions in specs
  - Simpler for orchestrators to implement
  - Reduces complexity in agent markdown files

### Event Granularity & Timing

**Agent spawn metadata (all selected):**
- Agent identification: type, ID, subagent_type from Task() call
- Work context: phase number, plan ID, task description, parent agent
- Resource allocation: model (sonnet/opus/haiku), estimated duration, priority
- Input summary: prompt length, context file count, special flags

**Agent completion metadata (all selected):**
- Outcome summary: success/failure, tasks completed, deliverables created, exit status
- Performance metrics: duration, API calls, context window usage, token counts
- Artifacts produced: files created/modified, commits, SUMMARY.md path, verification status
- Issues encountered: deviations applied, warnings raised, retries, partial completion reasons

**Checkpoint logging**: Full checkpoint flow
- Log at pause (what's awaited, current state, progress)
- Log user interaction (what user provided, validation)
- Log at resume (continuation context)
- Complete audit trail of human-in-loop interactions

**Deviation event metadata (all selected):**
- Deviation metadata: rule number (1-4), deviation type, severity
- Triggering context: what was discovered, task being executed, how detected
- Action taken: what changed, files affected, why this fix, in/out of scope
- Impact assessment: scope change, blockers removed, dependencies, testing implications

### Log Level Assignment Rules

- **Agent spawn**: INFO level for all agent types
  - Consistent pattern across all agents
  - Provides workflow visibility at default log level
  - Shows what work is being started

- **Agent completion**: INFO level for all completions
  - Matches spawn level for lifecycle symmetry
  - Shows what was accomplished
  - Success/failure indicated in message content, not level

- **Checkpoints**: INFO level for user-awaiting checkpoints
  - User action required is significant workflow event
  - INFO level shows when workflow pauses for input
  - Checkpoint flow details visible at INFO

- **Deviations**: Claude's discretion
  - Determine appropriate level based on deviation severity and impact
  - Consider rule number (1-4) and scope change implications
  - Balance between visibility and noise

### Context Pressure Tracking

- **Timing**: Hybrid approach
  - Threshold-based warnings (e.g., 75%, 90%, 95% of context window)
  - Completion snapshot (before/after token usage)
  - Provides both proactive alerts and final measurement

- **Warning thresholds**: Claude's discretion
  - Determine thresholds based on agent behavior and context budget
  - Balance between early warning and noise
  - Consider agent type (some agents naturally use more context)

- **Log level**: Claude's discretion
  - Determine level based on threshold severity
  - Lower thresholds may be DEBUG, high thresholds may be WARN
  - Consider whether pressure is diagnostic info or actionable warning

- **Metadata to include (all selected)**:
  - Absolute usage: tokens used, remaining, total window size
  - Percentage & rate: percent used, tokens/turn average, estimated turns remaining
  - Content breakdown: tokens by category (tool results, messages, system)
  - Comparison baseline: current vs budget, current vs typical for agent type

</decisions>

<specifics>
## Specific Ideas

- Logging specs are contracts for orchestrators, not code that agents execute
- Orchestrators read `<logging>` sections and implement the specified behavior
- Template variables like `{phase_number}` get substituted with actual runtime values
- Example code snippets show exact logger method calls orchestrators should make
- All 11 agent types get consistent specifications (executor, verifier, planner, researchers, debugger, integration checker, etc.)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 03-agent-instrumentation*
*Context gathered: 2026-01-29*
