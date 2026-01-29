---
name: gsd:resume-work
description: Resume work from previous session with full context restoration
allowed-tools:
  - Read
  - Bash
  - Write
  - AskUserQuestion
  - SlashCommand
---

<objective>
Restore complete project context and resume work seamlessly from previous session.

Routes to the resume-project workflow which handles:

- STATE.md loading (or reconstruction if missing)
- Checkpoint detection (.continue-here files)
- Incomplete work detection (PLAN without SUMMARY)
- Status presentation
- Context-aware next action routing
  </objective>

<execution_context>
@~/.claude/get-shit-done/workflows/resume-project.md
</execution_context>

<process>
**Follow the resume-project workflow** from `@~/.claude/get-shit-done/workflows/resume-project.md`.

The workflow handles all resumption logic including:

1. Project existence verification
2. STATE.md loading or reconstruction
3. Checkpoint and incomplete work detection
4. Visual status presentation
5. Context-aware option offering (checks CONTEXT.md before suggesting plan vs discuss)
6. Routing to appropriate next command
7. Session continuity updates
   </process>

<logging>

## Log Events

Resume operations restore session context and route to next action. Log key events for session continuity tracking.

### 1. Resume Start

**Level:** INFO (3)
**When:** Resume operation begins
**Purpose:** Record session resumption lifecycle

**Message Format:**
```
Resume work initiated [project: {path}]
```

**Context:**
```javascript
{
  event: "resume.start",
  project_path: "/media/foxy/ai/G/gsd/get-shit-done",
  state_exists: true,
  checkpoints_found: 0,
  incomplete_work_found: 1
}
```

### 2. Resume Complete

**Level:** INFO (3)
**When:** Context restored and routing decision made
**Purpose:** Record routing decision for workflow continuity

**Message Format:**
```
Resume complete: routed to {command}
```

**Context:**
```javascript
{
  event: "resume.complete",
  routed_to: "/gsd:execute-phase 05",
  context_loaded: true
}
```

</logging>
