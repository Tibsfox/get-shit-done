# Phase 3: Agent Instrumentation - Research

**Researched:** 2026-01-28
**Domain:** Agent lifecycle logging specification, structured logging patterns, markdown documentation standards
**Confidence:** HIGH

## Summary

This phase adds logging specifications to 11 agent markdown files, defining what orchestrators should log during agent operations. The research focused on three key areas: (1) specification format patterns compatible with existing GSD agent markdown structure, (2) structured logging best practices for metadata and context, and (3) agent lifecycle event patterns from multi-agent orchestration systems.

Key findings:
- GSD agents already use XML-like sections in markdown (`<role>`, `<execution_flow>`, `<checkpoint_protocol>`) — logging specs should follow this established pattern
- Structured logging best practices emphasize key-value context objects over string interpolation, with consistent metadata across all log entries
- Agent lifecycle logging should capture spawn (initialization), completion (outcome), checkpoints (pause/resume), deviations (rule applications), and context pressure (token usage)

The logger infrastructure (Phase 1-2) is complete and provides: singleton pattern with session ID tracking, 6 log levels (0-5), child logger support for categories, syslog transport, and structured context via key-value pairs.

**Primary recommendation:** Use `<logging>` XML-style sections in agent markdown files with prose descriptions + example code showing exact `logger.info(message, context)` syntax. This aligns with existing agent markdown patterns and provides clear implementation guidance for orchestrators.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Node.js logger.js | v1 (internal) | Core logging API with level-based methods | GSD's zero-dependency logger module built in Phase 1 |
| RFC 5424 Syslog | Standard | Transport for Unix logging | Industry standard, integrates with journalctl/rsyslog |
| Markdown + XML sections | N/A | Agent specification format | Existing GSD pattern for agent documentation |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| logger-metrics.js | v1 (internal) | Timer and metrics utilities | Performance tracking for duration measurements |
| logger-config.js | v1 (internal) | Configuration loading | Log level and transport configuration |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| XML sections in markdown | Pure markdown tables/lists | XML sections provide better structure for complex specifications and match existing GSD agent patterns |
| Prose-only specs | Code-only examples | Hybrid approach (prose + code) provides both clarity and concrete implementation guidance |

**Installation:**
```bash
# Logger already installed in Phase 1-2
# No additional dependencies needed
```

## Architecture Patterns

### Recommended Logging Section Structure

Agent markdown files use XML-like sections for structure. Logging specs follow this pattern:

```
agents/
├── gsd-executor.md
│   ├── <role>
│   ├── <execution_flow>
│   ├── <logging>          # NEW: Agent lifecycle logging specs
│   ├── <deviation_rules>
│   └── <checkpoint_protocol>
```

### Pattern 1: Hybrid Specification Format (Prose + Code)

**What:** Combine prose descriptions with concrete code examples showing exact logger syntax

**When to use:** All logging specifications in agent markdown files

**Example:**
```markdown
<logging>
## Agent Spawn

Log agent spawn at INFO level when orchestrator creates agent via Task().

**Message format:** "Agent spawn: {agent_type}"

**Context metadata:**
- `agent_id`: Task ID from orchestrator
- `agent_type`: Agent name (e.g., "gsd-executor")
- `phase`: Phase number (e.g., "03")
- `plan`: Plan ID (e.g., "03-01")
- `model`: Model being used (e.g., "claude-sonnet-4")
- `estimated_duration`: Expected execution time in seconds

**Example:**
\`\`\`javascript
logger.info('Agent spawn: gsd-executor', {
  agent_id: taskId,
  agent_type: 'gsd-executor',
  phase: '03',
  plan: '03-01',
  model: 'claude-sonnet-4',
  estimated_duration: 180
});
\`\`\`
</logging>
```

**Why this works:**
- Prose explains WHAT to log and WHEN
- Metadata list shows WHICH fields to include
- Code example shows exact SYNTAX to use
- Orchestrators can copy-paste the pattern

### Pattern 2: Structured Context Objects

**What:** Pass metadata as key-value context objects, not string interpolation

**When to use:** All logger method calls

**Example:**
```javascript
// GOOD: Structured context
logger.info('Agent completion', {
  agent_id: taskId,
  outcome: 'success',
  duration_ms: elapsed,
  tasks_completed: 3,
  artifacts_created: ['SUMMARY.md']
});

// BAD: String interpolation
logger.info(`Agent ${taskId} completed in ${elapsed}ms with ${outcome}`);
```

**Why:**
- Enables log aggregation and querying by field
- Consistent structure across all log entries
- Integrates with syslog structured data (RFC 5424)
- Tools can parse and analyze metadata

**Source:** [Structured Logging Best Practices](https://uptrace.dev/glossary/structured-logging), [Log Aggregation Best Practices](https://medium.com/@sohail_saifii/log-aggregation-structured-logging-best-practices-5eefebc9699a)

### Pattern 3: Child Logger Categories

**What:** Use child loggers to namespace log entries by agent type or operation

**When to use:** When orchestrator spawns multiple agents or tracks distinct operation types

**Example:**
```javascript
// Create child logger for specific agent
const agentLogger = logger.child('agent.executor');

// All logs from this logger include category 'agent.executor'
agentLogger.info('Agent spawn', { plan: '03-01' });
agentLogger.info('Task complete', { task: 1 });
```

**Why:**
- Automatic category tagging for filtering
- Inherits parent session ID (correlation)
- Simplifies log queries (filter by category)

**Source:** Implemented in lib/logger.js, follows [Pino Logger patterns](https://signoz.io/guides/pino-logger/)

### Pattern 4: Template Variable Notation

**What:** Use `{variable_name}` placeholders to show runtime substitution in specs

**When to use:** All logging specifications showing dynamic values

**Example:**
```markdown
**Message format:** "Agent spawn: {agent_type}"
**Context:**
- `phase`: {phase_number}
- `plan`: {plan_id}
- `model`: {model_name}
```

**Why:**
- Clear indication of what values orchestrators should substitute
- Avoids confusion between literal strings and dynamic values
- Common pattern in API documentation

### Anti-Patterns to Avoid

- **Conditional logging in specs:** Don't specify "log X if Y condition". Filtering happens via log levels, not conditionals. All specified events should always be logged.

- **Vague message formats:** Don't use "Log agent information". Use specific message formats like "Agent spawn: {agent_type}".

- **Missing context fields:** Don't log just a message without context. Always specify what metadata should be included.

- **Inconsistent naming:** Don't use `agentId` in one place and `agent_id` in another. Use snake_case consistently for metadata keys (matches syslog conventions).

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Log level checking | Manual `if (level >= threshold)` logic | Logger's `_shouldLog()` method | Already implemented with Level 0 short-circuit optimization |
| Session ID generation | Manual UUID/random string generation | Logger's `sessionId` from constructor | Already uses crypto.randomUUID(), inherited by child loggers |
| Duration tracking | Manual Date.now() start/end calculation | logger-metrics.js Timer class | Provides high-resolution timing with process.hrtime |
| Syslog formatting | Manual RFC 5424 message construction | logger-syslog.js transport | Already handles facility, severity mapping, structured data |
| Configuration merging | Custom config precedence logic | logger-config.js loadConfig() | Already implements env > project > global > default precedence |

**Key insight:** Phase 1-2 already implemented the logging infrastructure. Phase 3 is about **specifying what to log**, not building new logging code.

## Common Pitfalls

### Pitfall 1: Specifying Implementation Instead of Contract

**What goes wrong:** Writing specifications that describe how orchestrators should implement logging, rather than what they should log

**Example:**
```markdown
<!-- BAD -->
Orchestrator should create a child logger, check the log level, and if INFO or higher...

<!-- GOOD -->
Log agent spawn at INFO level with agent_type, phase, and plan metadata.
```

**Why it happens:** Conflating specification (contract) with implementation (code)

**How to avoid:** Focus on WHAT to log (event, level, metadata), not HOW to implement it. Orchestrators know how to use the logger API.

**Warning signs:** Specifications mentioning "should create", "should check", "should call" — these are implementation details

### Pitfall 2: Inconsistent Log Levels Across Similar Events

**What goes wrong:** Logging agent spawn at INFO but verifier spawn at DEBUG, making it hard to get consistent visibility

**Why it happens:** Deciding log levels in isolation without considering the whole system

**How to avoid:** Use consistent log level patterns:
- Agent spawn/completion: INFO (always visible at default level)
- Checkpoints (user-awaiting): INFO (workflow pauses are significant)
- Deviations: Context-dependent (Rule 1-3: WARN, Rule 4: INFO)
- Context pressure: DEBUG at thresholds, WARN at high usage

**Warning signs:** Same type of event logged at different levels for different agents

### Pitfall 3: Over-Specification of Context Fields

**What goes wrong:** Specifying 20+ context fields for a single log entry, most of which are rarely useful

**Why it happens:** "More is better" mindset without considering signal-to-noise ratio

**How to avoid:** Include only actionable metadata:
- Required for correlation (session_id, agent_id)
- Required for filtering (phase, plan, agent_type)
- Required for diagnosis (outcome, duration, error details)

**Warning signs:** Context objects with >10 fields, fields that are always the same value, computed fields that can be derived from others

### Pitfall 4: Missing Correlation Metadata

**What goes wrong:** Logs from different agents during parallel execution can't be correlated back to the same phase/wave/plan

**Why it happens:** Forgetting to thread context through orchestrator -> agent -> subagent chain

**How to avoid:** Always include hierarchical identifiers:
- `session_id`: From logger singleton (automatic)
- `phase`: Phase number
- `plan`: Plan ID
- `wave`: Execution wave (for parallel execution)
- `parent_agent_id`: If this agent spawned from another

**Warning signs:** Logs that can't answer "which plan generated this?" or "were these agents part of the same wave?"

### Pitfall 5: Log Level Misalignment with User Expectations

**What goes wrong:** Setting default log level to INFO but logging routine operations at INFO, creating noise

**Why it happens:** Misunderstanding what INFO level means — it's "informational milestones", not "everything that happens"

**How to avoid:**
- INFO: Phase starts, plan completes, checkpoints reached, errors/warnings
- DEBUG: Task execution, file operations, verification checks
- TRACE: Tool calls, command execution, API requests

**Warning signs:** User complaints about "too much logging" at default level, or "not enough logging" to diagnose issues

## Code Examples

Verified patterns from GSD logging infrastructure and structured logging best practices:

### Agent Spawn Logging

```javascript
// Source: logger.js API + structured logging patterns
// Context: Orchestrator creates agent via Task()

const agentLogger = logger.child(`agent.${agentType}`);

agentLogger.info('Agent spawn', {
  agent_id: taskId,
  agent_type: agentType,      // 'gsd-executor', 'gsd-planner', etc.
  phase: phaseNumber,          // '03'
  plan: planId,                // '03-01'
  task: taskDescription,       // Brief task description
  model: modelName,            // 'claude-sonnet-4', 'claude-opus-4'
  estimated_duration: 180,     // seconds
  parent_agent_id: parentId,   // if spawned from another agent
  wave: waveNumber             // for parallel execution
});
```

### Agent Completion Logging

```javascript
// Source: logger.js API + duration tracking patterns
// Context: Agent finishes execution (success or failure)

const duration = Date.now() - startTime;

agentLogger.info('Agent completion', {
  agent_id: taskId,
  outcome: 'success',          // 'success', 'failure', 'partial'
  duration_ms: duration,
  tasks_completed: 3,
  tasks_total: 3,
  artifacts_created: ['03-01-SUMMARY.md', 'src/component.tsx'],
  deviations_applied: 2,       // count of deviation rules applied
  checkpoints_hit: 1,          // count of checkpoint pauses
  exit_status: 'complete'      // 'complete', 'checkpoint', 'error'
});
```

### Checkpoint Pause Logging

```javascript
// Source: checkpoint_protocol patterns from gsd-executor.md
// Context: Agent hits checkpoint and pauses execution

agentLogger.info('Checkpoint pause', {
  agent_id: taskId,
  checkpoint_type: 'human-verify',  // 'human-verify', 'decision', 'human-action'
  task_current: 3,
  tasks_completed: 2,
  tasks_total: 5,
  awaiting: 'User verification of deployment',
  progress_snapshot: {
    commits: ['abc123', 'def456'],
    files_modified: ['src/app.tsx', 'package.json']
  }
});
```

### Deviation Rule Application Logging

```javascript
// Source: deviation_rules section from gsd-executor.md
// Context: Agent applies deviation rule during execution

agentLogger.warn('Deviation applied', {
  agent_id: taskId,
  rule_number: 1,               // 1-4
  rule_type: 'auto-fix-bug',    // 'auto-fix-bug', 'missing-critical', 'blocking', 'architectural'
  task_current: 2,
  trigger: 'SQL query returned empty results due to case-sensitive comparison',
  action_taken: 'Modified WHERE clause to use LOWER() on both sides',
  files_affected: ['src/api/users.ts'],
  in_scope: true,               // whether fix is within plan scope
  impact: 'User login now case-insensitive'
});
```

### Context Pressure Logging

```javascript
// Source: quality_degradation_curve patterns from gsd-planner.md
// Context: Agent monitors token usage during execution

// Warning at threshold
agentLogger.debug('Context pressure warning', {
  agent_id: taskId,
  threshold: '75%',
  tokens_used: 150000,
  tokens_total: 200000,
  tokens_remaining: 50000,
  percent_used: 75,
  rate_per_turn: 12000,
  estimated_turns_remaining: 4,
  content_breakdown: {
    tool_results: 80000,
    messages: 60000,
    system: 10000
  }
});

// Completion snapshot
agentLogger.info('Context usage snapshot', {
  agent_id: taskId,
  final_tokens: 165000,
  peak_tokens: 170000,
  efficiency: 'good',           // 'excellent', 'good', 'degraded', 'poor'
  context_budget: 200000
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| String-only log messages | Structured context objects | 2020s evolution | Enables log aggregation, querying, and analysis |
| Print statements / console.log | Leveled logging APIs | Industry standard | Enables filtering by severity |
| Ad-hoc logging locations | Lifecycle event specifications | 2026 agent systems | Consistent observability across agent operations |
| File-only logging | Syslog transport | Unix standard since 1980s | Integration with system logging (journalctl) |
| Global log config | Hierarchical config precedence | Modern logging libraries | env > project > global > default flexibility |

**Deprecated/outdated:**
- **Console-only logging:** No longer sufficient for production systems — lacks structure, filtering, and transport flexibility
- **String interpolation in logs:** Replaced by structured context objects for better queryability
- **Manual session ID generation:** Logger singleton now handles this with crypto.randomUUID()

## Open Questions

No significant unresolved questions. The domain is well-understood, and the logger infrastructure is already implemented and tested in Phase 1-2.

## Sources

### Primary (HIGH confidence)
- GSD codebase: lib/logger.js, lib/logger-config.js, lib/logger-syslog.js, lib/logger-metrics.js
- GSD agents: agents/gsd-executor.md, agents/gsd-planner.md, agents/gsd-verifier.md
- GSD Phase 2 implementation: hooks/gsd-log-init.js, .planning/phases/02-hook-integration/02-01-SUMMARY.md
- RFC 5424 Syslog Protocol (IETF standard)

### Secondary (MEDIUM confidence)
- [Structured Logging Best Practices | Uptrace](https://uptrace.dev/glossary/structured-logging) - JSON format, key-value pairs
- [Log Aggregation Best Practices | Medium](https://medium.com/@sohail_saifii/log-aggregation-structured-logging-best-practices-5eefebc9699a) - Contextual metadata patterns
- [Pino Logger Guide | SigNoz](https://signoz.io/guides/pino-logger/) - Child logger patterns for Node.js
- [Python Logging Best Practices 2026 | Carmatec](https://www.carmatec.com/blog/python-logging-best-practices-complete-guide/) - Log level guidelines
- [Cloud Logging Structured Logging | Google Cloud](https://cloud.google.com/logging/docs/structured-logging) - Structured logging standards

### Tertiary (LOW confidence)
- [Agent Lifecycle Management 2026 | OneReach.ai](https://onereach.ai/blog/agent-lifecycle-management-stages-governance-roi/) - Audit trail patterns
- [Claude Code Multi-Agent Orchestration | TheUnwindAI](https://www.theunwindai.com/p/claude-code-s-hidden-multi-agent-orchestration-now-open-source) - Agent orchestration background execution patterns
- [AGENTS.md Format](https://agents.md/) - Agent skills specification format (markdown + YAML)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Logger infrastructure complete, patterns established in Phase 1-2
- Architecture: HIGH - XML section pattern already used in 11 agent markdown files
- Pitfalls: HIGH - Based on structured logging best practices and existing GSD codebase analysis

**Research date:** 2026-01-28
**Valid until:** ~30 days (stable domain — logging patterns and logger API unlikely to change)

**Key constraints from CONTEXT.md:**
- Hybrid documentation style: Prose + example code (DECISION)
- `<logging>` section for standard lifecycle, separate sections for checkpoints/deviations (DECISION)
- Template variables like `{agent_type}`, `{phase_number}`, `{duration_ms}` (DECISION)
- No conditional logging (DECISION)
- Agent spawn: INFO level for all (DECISION)
- Agent completion: INFO level for all (DECISION)
- Checkpoints: INFO level for user-awaiting (DECISION)
- Context pressure: Hybrid timing approach with thresholds (DECISION)
