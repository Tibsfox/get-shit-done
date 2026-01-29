---
name: gsd:map-codebase
description: Analyze codebase with parallel mapper agents to produce .planning/codebase/ documents
argument-hint: "[optional: specific area to map, e.g., 'api' or 'auth']"
allowed-tools:
  - Read
  - Bash
  - Glob
  - Grep
  - Write
  - Task
---

<objective>
Analyze existing codebase using parallel gsd-codebase-mapper agents to produce structured codebase documents.

Each mapper agent explores a focus area and **writes documents directly** to `.planning/codebase/`. The orchestrator only receives confirmations, keeping context usage minimal.

Output: .planning/codebase/ folder with 7 structured documents about the codebase state.
</objective>

<execution_context>
@~/.claude/get-shit-done/workflows/map-codebase.md
</execution_context>

<context>
Focus area: $ARGUMENTS (optional - if provided, tells agents to focus on specific subsystem)

**Load project state if exists:**
Check for .planning/STATE.md - loads context if project already initialized

**This command can run:**
- Before /gsd:new-project (brownfield codebases) - creates codebase map first
- After /gsd:new-project (greenfield codebases) - updates codebase map as code evolves
- Anytime to refresh codebase understanding
</context>

<when_to_use>
**Use map-codebase for:**
- Brownfield projects before initialization (understand existing code first)
- Refreshing codebase map after significant changes
- Onboarding to an unfamiliar codebase
- Before major refactoring (understand current state)
- When STATE.md references outdated codebase info

**Skip map-codebase for:**
- Greenfield projects with no code yet (nothing to map)
- Trivial codebases (<5 files)
</when_to_use>

<logging>

## Logging Specifications for Orchestrator

Codebase mapping spawns parallel mapper agents. Log events must correlate agents for tracking parallel execution.

### 1. Mapping Start (INFO level)

Log when mapping session begins to record codebase mapping lifecycle.

**Message format:** "Codebase mapping started [focus: {area}]"

**Context to include:**
- `event`: "mapping.start"
- `focus_area`: Focus area (e.g., "api") or null if full mapping
- `existing_map`: Whether .planning/codebase/ already exists (boolean)

**Example code:**

```javascript
logger.info(`Codebase mapping started [focus: ${focusArea || 'full'}]`, {
  event: 'mapping.start',
  focus_area: focusArea,
  existing_map: existingMap
});
```

### 2. Mapper Spawn (DEBUG level)

Log when spawning each parallel gsd-codebase-mapper agent to track parallel agent correlation (similar to wave execution).

**Message format:** "Spawning mapper agent {N}: {focus}"

**Context to include:**
- `event`: "agent.spawn"
- `agent_id`: Unique agent identifier for correlation (e.g., "mapper-tech-20260129-084523")
- `agent_type`: "gsd-codebase-mapper"
- `focus`: Focus area (e.g., "tech", "arch", "quality", "concerns")
- `model`: Claude model being used

**Example code:**

```javascript
logger.debug(`Spawning mapper agent ${agentNumber}: ${focus}`, {
  event: 'agent.spawn',
  agent_id: agentId,
  agent_type: 'gsd-codebase-mapper',
  focus: focus,
  model: mapperModel
});
```

### 3. Mapper Complete (DEBUG level)

Log when each mapper agent completes to track individual mapper outcomes for correlation.

**Message format:** "Mapper agent {N} complete: {focus} ({M} documents written)"

**Context to include:**
- `event`: "agent.complete"
- `agent_id`: Agent identifier (matches spawn event)
- `focus`: Focus area
- `documents_written`: Number of documents written
- `duration_ms`: Mapper duration in milliseconds

**Example code:**

```javascript
logger.debug(`Mapper agent ${agentNumber} complete: ${focus} (${documentsWritten} documents written)`, {
  event: 'agent.complete',
  agent_id: agentId,
  focus: focus,
  documents_written: documentsWritten,
  duration_ms: duration
});
```

### 4. Mapping Complete (INFO level)

Log when all mapper agents complete to record overall mapping session results.

**Message format:** "Codebase mapping complete: {N}/{N} agents completed, {M} documents written"

**Context to include:**
- `event`: "mapping.complete"
- `agents_total`: Total number of mapper agents
- `agents_completed`: Number of completed mapper agents
- `documents_total`: Total documents written
- `total_duration_ms`: Total mapping duration in milliseconds

**Example code:**

```javascript
logger.info(`Codebase mapping complete: ${agentsCompleted}/${agentsTotal} agents completed, ${documentsTotal} documents written`, {
  event: 'mapping.complete',
  agents_total: agentsTotal,
  agents_completed: agentsCompleted,
  documents_total: documentsTotal,
  total_duration_ms: totalDuration
});
```

</logging>

<process>
1. Check if .planning/codebase/ already exists (offer to refresh or skip)
2. Create .planning/codebase/ directory structure
3. Spawn 4 parallel gsd-codebase-mapper agents:
   - Agent 1: tech focus → writes STACK.md, INTEGRATIONS.md
   - Agent 2: arch focus → writes ARCHITECTURE.md, STRUCTURE.md
   - Agent 3: quality focus → writes CONVENTIONS.md, TESTING.md
   - Agent 4: concerns focus → writes CONCERNS.md
4. Wait for agents to complete, collect confirmations (NOT document contents)
5. Verify all 7 documents exist with line counts
6. Commit codebase map
7. Offer next steps (typically: /gsd:new-project or /gsd:plan-phase)
</process>

<success_criteria>
- [ ] .planning/codebase/ directory created
- [ ] All 7 codebase documents written by mapper agents
- [ ] Documents follow template structure
- [ ] Parallel agents completed without errors
- [ ] User knows next steps
</success_criteria>
