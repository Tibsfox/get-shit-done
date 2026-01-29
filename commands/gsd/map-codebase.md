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

## Log Events

Codebase mapping spawns parallel mapper agents. Log events must correlate agents for tracking parallel execution.

### 1. Mapping Start

**Level:** INFO (3)
**When:** Mapping session begins
**Purpose:** Record codebase mapping lifecycle

**Message Format:**
```
Codebase mapping started [focus: {area}]
```

**Context:**
```javascript
{
  event: "mapping.start",
  focus_area: "api",  // or null if full mapping
  existing_map: false
}
```

### 2. Mapper Spawn

**Level:** DEBUG (4)
**When:** Spawning each parallel gsd-codebase-mapper agent
**Purpose:** Track parallel agent correlation (similar to wave execution)

**Message Format:**
```
Spawning mapper agent {N}: {focus}
```

**Context:**
```javascript
{
  event: "agent.spawn",
  agent_id: "mapper-tech-20260129-084523",
  agent_type: "gsd-codebase-mapper",
  focus: "tech",
  model: "claude-sonnet-4-5-20250929"
}
```

### 3. Mapper Complete

**Level:** DEBUG (4)
**When:** Each mapper agent completes
**Purpose:** Track individual mapper outcomes for correlation

**Message Format:**
```
Mapper agent {N} complete: {focus} ({M} documents written)
```

**Context:**
```javascript
{
  event: "agent.complete",
  agent_id: "mapper-tech-20260129-084523",
  focus: "tech",
  documents_written: 2,
  duration_ms: 892000
}
```

### 4. Mapping Complete

**Level:** INFO (3)
**When:** All mapper agents complete
**Purpose:** Record overall mapping session results

**Message Format:**
```
Codebase mapping complete: {N}/{N} agents completed, {M} documents written
```

**Context:**
```javascript
{
  event: "mapping.complete",
  agents_total: 4,
  agents_completed: 4,
  documents_total: 7,
  total_duration_ms: 1456000
}
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
