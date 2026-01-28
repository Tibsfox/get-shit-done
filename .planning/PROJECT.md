# GSD Debug Logging System

## What This Is

A production-grade, leveled logging system for Get Shit Done (GSD) that provides graduated observability from silent operation (level 0) through complete traceability (level 5). The system integrates with standard Unix logging mechanisms (syslog) and enables developers to diagnose issues, understand agent behavior, measure performance, and audit GSD workflows across sessions.

This is an internal infrastructure enhancement to GSD itself, not a user-facing feature.

## Core Value

**Every GSD operation must be traceable when needed, invisible when not.**

When debugging a failed plan execution or investigating why verification gaps occurred, operators must be able to reconstruct exactly what happened, when, and why — without requiring that logging impose overhead during normal operation.

## Requirements

### Validated

(None yet — ship to validate)

### Active

#### R1: Log Level System
- [ ] R1.1: Implement 6 discrete log levels (0-5) with predictable verbosity distribution
- [ ] R1.2: Level 0 (OFF) produces zero logging overhead via early short-circuit
- [ ] R1.3: Level 1 (ERROR) captures only critical failures requiring human attention
- [ ] R1.4: Level 2 (WARN) adds recoverable issues, verification gaps, deviation applications
- [ ] R1.5: Level 3 (INFO) adds workflow milestones: phase/plan/wave lifecycle events
- [ ] R1.6: Level 4 (DEBUG) adds detailed operations: file loads, state transitions, context pressure
- [ ] R1.7: Level 5 (TRACE) adds complete transparency: every command, tool call, API metric

#### R2: Timestamp and Timing
- [ ] R2.1: All log entries include ISO 8601 timestamps with millisecond precision
- [ ] R2.2: Operation timing via high-resolution timers (process.hrtime)
- [ ] R2.3: Duration tracking for plans, waves, tasks, and individual operations
- [ ] R2.4: Timing threshold warnings when operations exceed configurable limits
- [ ] R2.5: Performance metrics aggregation (min/max/mean/p50/p95/p99)

#### R3: Agent Operations Logging
- [ ] R3.1: Log agent spawn events with model, plan, and context metadata
- [ ] R3.2: Log agent completion with duration, task count, and outcome
- [ ] R3.3: Log checkpoint pauses with type, progress, and awaited action
- [ ] R3.4: Log deviation rule applications with rule number, description, and affected files
- [ ] R3.5: Log context pressure (token usage) at configurable intervals

#### R4: Verification Results Logging
- [ ] R4.1: Log verification start with phase, plan count, and must-haves count
- [ ] R4.2: Log artifact checks at level 4+ (exists, substantive, wired)
- [ ] R4.3: Log key link verification results (wired, orphaned, partial)
- [ ] R4.4: Log gap detection with truth, status, and missing items
- [ ] R4.5: Log overall verification outcome (passed, gaps_found, human_needed)

#### R5: Syslog Integration
- [ ] R5.1: Implement RFC 5424 compliant syslog message formatting
- [ ] R5.2: Support LOCAL0-LOCAL7 facilities for filtering
- [ ] R5.3: Map GSD log levels to syslog severity codes correctly
- [ ] R5.4: Support Unix socket transport (/dev/log)
- [ ] R5.5: Support UDP transport for remote syslog servers
- [ ] R5.6: Silent failure — logging errors must never break GSD operation

#### R6: Configuration System
- [ ] R6.1: Read logging config from .planning/config.json (project-level)
- [ ] R6.2: Read logging config from ~/.claude/gsd-config.json (global)
- [ ] R6.3: Environment variable overrides (GSD_LOG_LEVEL, GSD_LOG_SYSLOG, etc.)
- [ ] R6.4: Sensible defaults (level=INFO, syslog=enabled, file=disabled)
- [ ] R6.5: Config merging with correct precedence (env > project > global > default)

#### R7: Correlation and Tracing
- [ ] R7.1: Generate unique session IDs for each GSD session
- [ ] R7.2: Support correlation IDs for tracing requests through subagents
- [ ] R7.3: Include session_id in all log entries
- [ ] R7.4: Include correlation_id when set for operation tracing

#### R8: File Logging (Optional)
- [ ] R8.1: Optional file transport when syslog unavailable or insufficient
- [ ] R8.2: Log rotation by size (configurable, default 10MB)
- [ ] R8.3: Retention limit (configurable, default 5 files)
- [ ] R8.4: Secure permissions (0600 for files, 0700 for directory)

#### R9: Integration Points
- [ ] R9.1: Session initialization hook (gsd-log-init.js)
- [ ] R9.2: Update gsd-check-update.js with logging
- [ ] R9.3: Update gsd-statusline.js with logging
- [ ] R9.4: Logging specifications in all agent markdown files
- [ ] R9.5: Logging integration in workflow orchestration

#### R10: Observability Commands
- [ ] R10.1: Add logging section to /gsd:settings output
- [ ] R10.2: Enhance /gsd:debug to leverage logging for diagnosis
- [ ] R10.3: Document log viewing patterns (journalctl, grep, etc.)

### Out of Scope

- **Cloud logging services (CloudWatch, Datadog, etc.)** — GSD is a local CLI tool; cloud integrations add complexity and dependencies that conflict with the zero-dependency philosophy
- **Structured logging to JSON files** — Syslog with JSON context provides sufficient structure; pure JSON files would duplicate functionality
- **Log aggregation UI** — Use existing tools (journalctl, grep, less); building a UI is outside GSD's scope
- **Real-time log streaming to Claude** — Would consume context window; logs are for post-hoc analysis
- **Automatic log upload/sharing** — Privacy concerns; users should control what leaves their machine
- **Windows Event Log integration** — GSD targets Unix-like systems; Windows support would require significant additional work
- **Log encryption** — Syslog and file permissions provide sufficient security for local logs
- **Per-command log level overrides** — Adds complexity; global level is sufficient for debugging sessions
- **Sampling/rate limiting** — At expected volumes (5K entries/session max), full logging is manageable

## Context

### Current State

GSD currently has no structured logging infrastructure. Observability relies on:

| Mechanism | What It Provides | Limitation |
|-----------|------------------|------------|
| Git commits | Task-level audit trail | No timing, no agent behavior visibility |
| STATE.md | Position and velocity metrics | Manual updates, summary only |
| SUMMARY.md | Plan execution results | Created after completion, no real-time |
| VERIFICATION.md | Goal achievement status | Post-hoc, no process visibility |
| Statusline hook | Context usage display | Visual only, ephemeral, not logged |

### Problem Statement

When GSD workflows fail or produce unexpected results, diagnosing the issue requires:
1. Reading multiple markdown files to reconstruct timeline
2. Manually correlating git history with planning artifacts
3. Guessing at agent behavior from sparse output
4. No visibility into timing, context pressure, or decision points

This makes debugging slow and unreliable, especially for:
- Verification gaps with unclear causes
- Performance issues in long-running phases
- Context window exhaustion mid-execution
- Checkpoint handling edge cases

### Technical Environment

- **Runtime**: Node.js 16.7.0+ (specified in package.json engines)
- **Package manager**: npm
- **Build system**: esbuild for hook bundling
- **Dependencies**: Zero runtime dependencies (intentional design choice)
- **Target platforms**: Linux, macOS (Unix-like systems with syslog)
- **Existing hooks**: gsd-check-update.js, gsd-statusline.js
- **Configuration**: .planning/config.json, ~/.claude/settings.json

### Prior Art

Logging patterns from related tools:
- **Claude Code**: Uses internal logging with level filtering
- **npm**: DEBUG environment variable pattern
- **pino/winston**: Structured logging with transports
- **systemd journal**: RFC 5424 syslog with structured fields

GSD should align with Unix conventions (syslog) while supporting structured context for parseability.

## Constraints

- **Zero dependencies**: No external npm packages for logging — must use Node.js standard library only. This maintains GSD's philosophy of minimal footprint. (`fs`, `dgram`, `os`, `process` only)

- **Backward compatibility**: Logging must be opt-in by default behavior — existing users should see no change unless they configure logging. Default level should produce minimal but useful output.

- **Performance budget**: Logging at disabled levels must add < 1ms overhead per call. At level 5 (TRACE), total overhead must not exceed 5% of operation time.

- **Bundle size**: Logging modules must not significantly increase hook bundle sizes. Target < 10KB additional bundled code.

- **No network by default**: Syslog should use local Unix socket by default. Network (UDP/TCP) only when explicitly configured.

- **Graceful degradation**: If syslog is unavailable, fall back to stderr. If stderr fails, fail silently. Logging must never crash GSD.

- **No sensitive data**: Logger must never capture API keys, tokens, passwords, or full file contents. Automatic sanitization required.

- **Agent compatibility**: Logging specifications in agent markdown must work with Claude's natural language processing — no code execution in agent context.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Use syslog as primary transport | Standard Unix mechanism, integrates with journald/rsyslog, no dependencies, supports remote aggregation | — Pending |
| 6 log levels (0-5) | Industry standard (OFF/ERROR/WARN/INFO/DEBUG/TRACE), provides granular control, maps to syslog severity | — Pending |
| Singleton logger pattern | Ensures consistent session ID and config across all modules, simpler integration | — Pending |
| JSON context in log messages | Enables structured parsing while maintaining human readability in syslog viewers | — Pending |
| Child logger factory pattern | Allows modules to get pre-configured loggers with fixed categories, reduces boilerplate | — Pending |
| High-resolution timers (hrtime) | Sub-millisecond precision for performance analysis, native Node.js API | — Pending |
| Config precedence: env > project > global > default | Standard pattern, allows temporary debugging via env vars, project-specific tuning | — Pending |
| Correlation IDs optional | Only needed for complex multi-agent traces, avoid overhead when not debugging | — Pending |
| File logging opt-in only | Syslog is more robust and standard; files are fallback for systems without syslog | — Pending |
| Agent logging via markdown specs | Agents can't execute code; logging instructions guide orchestrator behavior | — Pending |

---
*Last updated: 2026-01-28 after initial planning*
