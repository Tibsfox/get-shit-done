# Requirements: GSD Debug Logging System

**Defined:** 2026-01-28
**Core Value:** Every GSD operation must be traceable when needed, invisible when not.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Log Levels

- [ ] **LEVEL-01**: Level 0 (OFF) produces zero logging overhead via early short-circuit
- [ ] **LEVEL-02**: Level 1 (ERROR) captures critical failures requiring human attention
- [ ] **LEVEL-03**: Level 2 (WARN) adds recoverable issues, gaps, deviations, retries
- [ ] **LEVEL-04**: Level 3 (INFO) adds workflow milestones (phase/plan/wave events)
- [ ] **LEVEL-05**: Level 4 (DEBUG) adds detailed operations (context, state, files)
- [ ] **LEVEL-06**: Level 5 (TRACE) adds complete transparency (commands, tools, API)

### Timestamps and Timing

- [ ] **TIME-01**: All log entries include ISO 8601 timestamps with millisecond precision
- [ ] **TIME-02**: High-resolution operation timing via process.hrtime
- [ ] **TIME-03**: Duration tracking for plans, waves, tasks, and operations
- [ ] **TIME-04**: Timing threshold warnings when operations exceed configurable limits
- [ ] **TIME-05**: Performance metrics aggregation (min/max/mean/p50/p95/p99)

### Agent Operations

- [x] **AGENT-01**: Log agent spawn events with model, plan, and context metadata
- [x] **AGENT-02**: Log agent completion with duration, task count, and outcome
- [x] **AGENT-03**: Log checkpoint pauses with type, progress, and awaited action
- [x] **AGENT-04**: Log deviation rule applications with rule, description, files
- [x] **AGENT-05**: Log context pressure (token usage) at configurable intervals

### Verification Results

- [x] **VERIFY-01**: Log verification start with phase, plan count, must-haves count
- [x] **VERIFY-02**: Log artifact checks at level 4+ (exists, substantive, wired)
- [x] **VERIFY-03**: Log key link verification results (wired, orphaned, partial)
- [x] **VERIFY-04**: Log gap detection with truth, status, and missing items
- [x] **VERIFY-05**: Log overall verification outcome (passed, gaps_found, human_needed)

### Syslog Integration

- [ ] **SYSLOG-01**: RFC 5424 compliant syslog message formatting
- [ ] **SYSLOG-02**: Support LOCAL0-LOCAL7 facilities for filtering
- [ ] **SYSLOG-03**: Map GSD log levels to syslog severity codes correctly
- [ ] **SYSLOG-04**: Support Unix socket transport (/dev/log)
- [ ] **SYSLOG-05**: Support UDP transport for remote syslog servers
- [ ] **SYSLOG-06**: Silent failure — logging errors must never break GSD

### Configuration

- [ ] **CONFIG-01**: Read logging config from .planning/config.json (project)
- [ ] **CONFIG-02**: Read logging config from ~/.claude/gsd-config.json (global)
- [ ] **CONFIG-03**: Environment variable overrides (GSD_LOG_LEVEL, etc.)
- [ ] **CONFIG-04**: Sensible defaults (level=INFO, syslog=enabled, file=disabled)
- [ ] **CONFIG-05**: Config precedence: env > project > global > default

### Correlation and Tracing

- [ ] **TRACE-01**: Generate unique session IDs for each GSD session
- [ ] **TRACE-02**: Support correlation IDs for multi-agent request tracing
- [ ] **TRACE-03**: Include session_id in all log entries
- [ ] **TRACE-04**: Include correlation_id when set for operation tracing

### Integration

- [x] **INTEG-01**: Session initialization hook (gsd-log-init.js)
- [x] **INTEG-02**: Update gsd-check-update.js with logging
- [x] **INTEG-03**: Update gsd-statusline.js with logging
- [x] **INTEG-04**: Logging specifications in all agent markdown files
- [ ] **INTEG-05**: Logging integration in workflow orchestration files
- [x] **INTEG-06**: Install.js registers logging hook and creates log directory

### Documentation

- [ ] **DOCS-01**: Logging reference guide (references/logging.md)
- [ ] **DOCS-02**: Add logging section to /gsd:settings output
- [ ] **DOCS-03**: Troubleshooting guide with log analysis examples
- [ ] **DOCS-04**: Update CHANGELOG with logging feature

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### File Logging

- **FILE-01**: Optional file transport when syslog unavailable
- **FILE-02**: Log rotation by size (configurable, default 10MB)
- **FILE-03**: Retention limit (configurable, default 5 files)
- **FILE-04**: Secure permissions (0600 files, 0700 directory)

### Advanced Features

- **ADV-01**: Log search command (/gsd:logs)
- **ADV-02**: Log export to JSON format
- **ADV-03**: Integration with /gsd:debug for automatic log capture
- **ADV-04**: Log-based performance regression detection

## Out of Scope

| Feature | Reason |
|---------|--------|
| Cloud logging (CloudWatch, Datadog) | GSD is local CLI; adds dependencies conflicting with zero-dependency philosophy |
| Log aggregation UI | Use existing tools (journalctl, grep); building UI outside GSD scope |
| Real-time streaming to Claude | Consumes context window; logs are for post-hoc analysis |
| Automatic log upload | Privacy concerns; users control what leaves their machine |
| Windows Event Log | GSD targets Unix-like systems; Windows support requires significant work |
| Log encryption | Syslog/file permissions provide sufficient security for local logs |
| Per-command log level overrides | Adds complexity; global level sufficient for debugging sessions |
| Sampling/rate limiting | Expected volumes (5K entries/session max) are manageable |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| LEVEL-01 | Phase 1 | Complete |
| LEVEL-02 | Phase 1 | Complete |
| LEVEL-03 | Phase 1 | Complete |
| LEVEL-04 | Phase 1 | Complete |
| LEVEL-05 | Phase 1 | Complete |
| LEVEL-06 | Phase 1 | Complete |
| TIME-01 | Phase 1 | Complete |
| TIME-02 | Phase 1 | Complete |
| TIME-03 | Phase 1 | Complete |
| TIME-04 | Phase 1 | Complete |
| TIME-05 | Phase 1 | Complete |
| SYSLOG-01 | Phase 1 | Complete |
| SYSLOG-02 | Phase 1 | Complete |
| SYSLOG-03 | Phase 1 | Complete |
| SYSLOG-04 | Phase 1 | Complete |
| SYSLOG-05 | Phase 1 | Complete |
| SYSLOG-06 | Phase 1 | Complete |
| CONFIG-01 | Phase 1 | Complete |
| CONFIG-02 | Phase 1 | Complete |
| CONFIG-03 | Phase 1 | Complete |
| CONFIG-04 | Phase 1 | Complete |
| CONFIG-05 | Phase 1 | Complete |
| TRACE-01 | Phase 1 | Complete |
| TRACE-02 | Phase 1 | Complete |
| TRACE-03 | Phase 1 | Complete |
| TRACE-04 | Phase 1 | Complete |
| INTEG-01 | Phase 2 | Complete |
| INTEG-02 | Phase 2 | Complete |
| INTEG-03 | Phase 2 | Complete |
| INTEG-06 | Phase 2 | Complete |
| AGENT-01 | Phase 3 | Complete |
| AGENT-02 | Phase 3 | Complete |
| AGENT-03 | Phase 3 | Complete |
| AGENT-04 | Phase 3 | Complete |
| AGENT-05 | Phase 3 | Complete |
| INTEG-04 | Phase 3 | Complete |
| VERIFY-01 | Phase 4 | Complete |
| VERIFY-02 | Phase 4 | Complete |
| VERIFY-03 | Phase 4 | Complete |
| VERIFY-04 | Phase 4 | Complete |
| VERIFY-05 | Phase 4 | Complete |
| INTEG-05 | Phase 5 | Complete |
| DOCS-01 | Phase 6 | Pending |
| DOCS-02 | Phase 6 | Pending |
| DOCS-03 | Phase 6 | Pending |
| DOCS-04 | Phase 6 | Pending |

**Coverage:**
- v1 requirements: 44 total
- Mapped to phases: 44
- Unmapped: 0 ✓

---
*Requirements defined: 2026-01-28*
*Last updated: 2026-01-29 after Phase 5 completion*
