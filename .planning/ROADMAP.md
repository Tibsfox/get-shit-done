# Roadmap: GSD Debug Logging System

## Overview

This roadmap delivers a production-grade logging system for GSD in 6 phases. We start with the core logger module and configuration system (Phase 1), then integrate with existing hooks (Phase 2). Next, we add agent operation instrumentation (Phase 3) and verification result logging (Phase 4). Phase 5 integrates logging into workflow orchestration files, and Phase 6 completes documentation and polish. Each phase builds on the previous, with clear verification criteria ensuring the logging system works correctly before proceeding.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Foundation** - Core logger module, syslog transport, configuration, timing utilities
- [ ] **Phase 2: Hook Integration** - Session init hook, update existing hooks with logging
- [ ] **Phase 3: Agent Instrumentation** - Add logging specs to all agent markdown files
- [ ] **Phase 4: Verification Logging** - Log verification results, gaps, artifact checks
- [ ] **Phase 5: Workflow Integration** - Integrate logging into workflow orchestration
- [ ] **Phase 6: Documentation** - Reference guide, settings output, troubleshooting guide

## Phase Details

### Phase 1: Foundation
**Goal**: Deliver a working logger module with syslog integration, configuration system, and timing utilities that can be imported and used by other GSD components.
**Depends on**: Nothing (first phase)
**Requirements**: LEVEL-01 through LEVEL-06, TIME-01 through TIME-05, SYSLOG-01 through SYSLOG-06, CONFIG-01 through CONFIG-05, TRACE-01 through TRACE-04
**Success Criteria** (what must be TRUE):
  1. Logger module can be imported and used to log at all 6 levels
  2. Level 0 (OFF) short-circuits immediately with no syslog writes
  3. Syslog messages appear in journalctl with correct facility and severity
  4. Configuration loads correctly from environment variables, project config, and global config
  5. Timer utility measures operation duration with millisecond precision
  6. Session IDs are generated and included in all log entries
**Plans**: 4 plans

Plans:
- [ ] 01-01: Create lib/ directory and implement logger.js core module
- [ ] 01-02: Implement logger-syslog.js transport with RFC 5424 formatting
- [ ] 01-03: Implement logger-config.js with config loading and merging
- [ ] 01-04: Implement logger-metrics.js with Timer and Metrics classes

### Phase 2: Hook Integration
**Goal**: Integrate logging into GSD's hook system so that sessions are logged from start, and existing hooks produce appropriate log output.
**Depends on**: Phase 1
**Requirements**: INTEG-01, INTEG-02, INTEG-03, INTEG-06
**Success Criteria** (what must be TRUE):
  1. Session start creates log entry with session ID, model, and workspace
  2. Update check hook logs check initiation and result at appropriate levels
  3. Statusline hook logs render events at TRACE level
  4. Logger modules are bundled correctly by build-hooks.js
  5. install.js registers the session initialization hook in settings.json
**Plans**: 3 plans

Plans:
- [ ] 02-01: Create gsd-log-init.js session initialization hook
- [ ] 02-02: Update gsd-check-update.js and gsd-statusline.js with logging
- [ ] 02-03: Update build-hooks.js to bundle logger and update install.js

### Phase 3: Agent Instrumentation
**Goal**: Add logging specifications to all agent markdown files so orchestrators know what to log during agent operations.
**Depends on**: Phase 2
**Requirements**: AGENT-01 through AGENT-05, INTEG-04
**Success Criteria** (what must be TRUE):
  1. All 11 agent markdown files have `<logging>` sections
  2. Logging specs cover spawn, completion, checkpoint, and deviation events
  3. Specs include appropriate log levels for each event type
  4. Context pressure logging (token usage) is specified at level 4+
  5. Orchestrators following specs produce consistent, useful logs
**Plans**: 2 plans

Plans:
- [ ] 03-01: Add logging sections to core agents (executor, verifier, planner)
- [ ] 03-02: Add logging sections to remaining agents (researchers, debugger, etc.)

### Phase 4: Verification Logging
**Goal**: Implement detailed logging of verification results, including artifact checks, gap detection, and link verification.
**Depends on**: Phase 3
**Requirements**: VERIFY-01 through VERIFY-05
**Success Criteria** (what must be TRUE):
  1. Verification start logs phase info and must-haves count
  2. Artifact checks are logged at DEBUG level with exists/substantive/wired status
  3. Key link verification results appear with from/to/via details
  4. Gap detection logs each gap with truth, status, and missing items
  5. Overall verification outcome logged at INFO level with score
**Plans**: 2 plans

Plans:
- [ ] 04-01: Update gsd-verifier.md with comprehensive logging specs
- [ ] 04-02: Create verification logging reference patterns in references/

### Phase 5: Workflow Integration
**Goal**: Integrate logging specifications into all workflow orchestration files so phase/plan/wave execution is fully observable.
**Depends on**: Phase 4
**Requirements**: INTEG-05
**Success Criteria** (what must be TRUE):
  1. execute-phase.md includes logging for wave start/complete and aggregation
  2. execute-plan.md includes logging for task execution and checkpoints
  3. plan-phase.md includes logging for research and plan creation
  4. All 12 workflow files have appropriate logging integration
  5. Wave-based parallel execution produces correlated logs
**Plans**: 2 plans

Plans:
- [ ] 05-01: Add logging to core workflows (execute-phase, execute-plan, plan-phase)
- [ ] 05-02: Add logging to remaining workflows (verify, discuss, resume, etc.)

### Phase 6: Documentation
**Goal**: Complete logging documentation including reference guide, settings integration, and troubleshooting guide.
**Depends on**: Phase 5
**Requirements**: DOCS-01 through DOCS-04
**Success Criteria** (what must be TRUE):
  1. references/logging.md explains all log levels, categories, and viewing patterns
  2. /gsd:settings displays current logging configuration
  3. Troubleshooting guide includes log-based diagnosis examples
  4. CHANGELOG updated with logging feature summary
  5. Users can enable DEBUG logging and view logs in journalctl
**Plans**: 2 plans

Plans:
- [ ] 06-01: Create references/logging.md and update CHANGELOG
- [ ] 06-02: Update /gsd:settings command and add troubleshooting section

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 0/4 | Not started | - |
| 2. Hook Integration | 0/3 | Not started | - |
| 3. Agent Instrumentation | 0/2 | Not started | - |
| 4. Verification Logging | 0/2 | Not started | - |
| 5. Workflow Integration | 0/2 | Not started | - |
| 6. Documentation | 0/2 | Not started | - |

---

## Appendix: Phase Dependency Graph

```
Phase 1: Foundation
    │
    ├── lib/logger.js (core module)
    ├── lib/logger-syslog.js (transport)
    ├── lib/logger-config.js (configuration)
    └── lib/logger-metrics.js (timing)
           │
           ▼
Phase 2: Hook Integration
    │
    ├── hooks/gsd-log-init.js (new)
    ├── hooks/gsd-check-update.js (updated)
    ├── hooks/gsd-statusline.js (updated)
    └── bin/install.js (updated)
           │
           ▼
Phase 3: Agent Instrumentation
    │
    ├── agents/gsd-executor.md
    ├── agents/gsd-verifier.md
    ├── agents/gsd-planner.md
    └── agents/*.md (all others)
           │
           ▼
Phase 4: Verification Logging
    │
    ├── agents/gsd-verifier.md (enhanced)
    └── references/verification-logging.md
           │
           ▼
Phase 5: Workflow Integration
    │
    ├── workflows/execute-phase.md
    ├── workflows/execute-plan.md
    ├── workflows/plan-phase.md
    └── workflows/*.md (all others)
           │
           ▼
Phase 6: Documentation
    │
    ├── references/logging.md
    ├── commands/gsd/settings.md (updated)
    └── CHANGELOG.md (updated)
```

## Appendix: File Change Summary

| File | Action | Phase |
|------|--------|-------|
| lib/logger.js | Create | 1 |
| lib/logger-syslog.js | Create | 1 |
| lib/logger-config.js | Create | 1 |
| lib/logger-metrics.js | Create | 1 |
| hooks/gsd-log-init.js | Create | 2 |
| hooks/gsd-check-update.js | Modify | 2 |
| hooks/gsd-statusline.js | Modify | 2 |
| scripts/build-hooks.js | Modify | 2 |
| bin/install.js | Modify | 2 |
| agents/gsd-executor.md | Modify | 3 |
| agents/gsd-verifier.md | Modify | 3, 4 |
| agents/gsd-planner.md | Modify | 3 |
| agents/gsd-plan-checker.md | Modify | 3 |
| agents/gsd-phase-researcher.md | Modify | 3 |
| agents/gsd-project-researcher.md | Modify | 3 |
| agents/gsd-roadmapper.md | Modify | 3 |
| agents/gsd-codebase-mapper.md | Modify | 3 |
| agents/gsd-debugger.md | Modify | 3 |
| agents/gsd-integration-checker.md | Modify | 3 |
| agents/gsd-research-synthesizer.md | Modify | 3 |
| get-shit-done/workflows/execute-phase.md | Modify | 5 |
| get-shit-done/workflows/execute-plan.md | Modify | 5 |
| get-shit-done/workflows/plan-phase.md | Modify | 5 |
| get-shit-done/workflows/verify-phase.md | Modify | 5 |
| get-shit-done/workflows/verify-work.md | Modify | 5 |
| get-shit-done/workflows/discuss-phase.md | Modify | 5 |
| get-shit-done/workflows/discover-issues.md | Modify | 5 |
| get-shit-done/workflows/complete-milestone.md | Modify | 5 |
| get-shit-done/workflows/resume-project.md | Modify | 5 |
| get-shit-done/workflows/map-codebase.md | Modify | 5 |
| get-shit-done/references/logging.md | Create | 6 |
| commands/gsd/settings.md | Modify | 6 |
| CHANGELOG.md | Modify | 6 |
| get-shit-done/templates/config.json | Modify | 1 |
