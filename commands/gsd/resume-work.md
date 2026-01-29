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

## Logging Specifications for Orchestrator

Resume operations restore session context and route to next action. Log key events for session continuity tracking.

### 1. Resume Start (INFO level)

Log when resume operation begins to record session resumption lifecycle.

**Message format:** "Resume work initiated [project: {path}]"

**Context to include:**
- `event`: "resume.start"
- `project_path`: Absolute path to project directory
- `state_exists`: Whether STATE.md exists (boolean)
- `checkpoints_found`: Number of .continue-here files found
- `incomplete_work_found`: Number of PLAN files without SUMMARY

**Example code:**

```javascript
logger.info(`Resume work initiated [project: ${projectPath}]`, {
  event: 'resume.start',
  project_path: projectPath,
  state_exists: stateExists,
  checkpoints_found: checkpointsFound,
  incomplete_work_found: incompleteWorkFound
});
```

### 2. Resume Complete (INFO level)

Log when context is restored and routing decision is made to record routing decision for workflow continuity.

**Message format:** "Resume complete: routed to {command}"

**Context to include:**
- `event`: "resume.complete"
- `routed_to`: Command being routed to (e.g., "/gsd:execute-phase 05")
- `context_loaded`: Whether full context was loaded (boolean)

**Example code:**

```javascript
logger.info(`Resume complete: routed to ${routedTo}`, {
  event: 'resume.complete',
  routed_to: routedTo,
  context_loaded: contextLoaded
});
```

</logging>
