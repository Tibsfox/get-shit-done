# GSD Debug Logging System

## What This Is

A production-grade, leveled logging system for Get Shit Done (GSD) that provides graduated observability from silent operation (level 0) through complete traceability (level 5). The system integrates with standard Unix logging mechanisms (syslog) and enables developers to diagnose issues, understand agent behavior, measure performance, and audit GSD workflows across sessions.

This is an internal infrastructure enhancement to GSD itself, not a user-facing feature.

## Core Value

**Every GSD operation must be traceable when needed, invisible when not.**

When debugging a failed plan execution or investigating why verification gaps occurred, operators must be able to reconstruct exactly what happened, when, and why — without requiring that logging impose overhead during normal operation.

## Requirements

### Validated

**v1.0.0 (Shipped 2026-01-29):**

#### R1: Log Level System — v1.0.0
- ✓ R1.1: 6 discrete log levels implemented (OFF/ERROR/WARN/INFO/DEBUG/TRACE)
- ✓ R1.2: Level 0 short-circuits with 0.0003ms overhead per call
- ✓ R1.3: ERROR level captures critical failures
- ✓ R1.4: WARN level adds recoverable issues, gaps, deviations
- ✓ R1.5: INFO level adds workflow milestones (default level)
- ✓ R1.6: DEBUG level adds detailed operations and context pressure
- ✓ R1.7: TRACE level provides complete transparency

#### R2: Timestamp and Timing — v1.0.0
- ✓ R2.1: ISO 8601 timestamps with millisecond precision
- ✓ R2.2: High-resolution timing via process.hrtime.bigint()
- ✓ R2.3: Duration tracking for all operation types
- ✓ R2.4: Configurable timing threshold warnings
- ✓ R2.5: Full metrics aggregation (min/max/mean/p50/p95/p99)

#### R3: Agent Operations Logging — v1.0.0
- ✓ R3.1: Agent spawn logged with model, plan, context metadata
- ✓ R3.2: Agent completion logged with duration, tasks, outcome
- ✓ R3.3: Checkpoint pauses logged with type and progress
- ✓ R3.4: Deviation rule applications logged with details
- ✓ R3.5: Context pressure logged at 75% (DEBUG) and 90% (WARN)

#### R4: Verification Results Logging — v1.0.0
- ✓ R4.1: Verification start with phase and must-haves count
- ✓ R4.2: Artifact checks at DEBUG level (exists/substantive/wired)
- ✓ R4.3: Key link verification with from/to/via details
- ✓ R4.4: Gap detection with truth, status, missing items
- ✓ R4.5: Verification outcome at INFO level with score

#### R5: Syslog Integration — v1.0.0
- ✓ R5.1: RFC 5424 compliant message formatting
- ✓ R5.2: LOCAL0-LOCAL7 facility support
- ✓ R5.3: Correct GSD to syslog severity mapping
- ✓ R5.4: Unix socket transport (/dev/log)
- ✓ R5.5: UDP transport for remote servers
- ✓ R5.6: Silent failure pattern (never breaks GSD)

#### R6: Configuration System — v1.0.0
- ✓ R6.1: Project-level config (.planning/config.json)
- ✓ R6.2: Global config (~/.claude/gsd-config.json)
- ✓ R6.3: Environment variable overrides (GSD_LOG_LEVEL, etc.)
- ✓ R6.4: Sensible defaults (INFO, syslog enabled)
- ✓ R6.5: Correct precedence (env > project > global > default)

#### R7: Correlation and Tracing — v1.0.0
- ✓ R7.1: Unique session IDs via crypto.randomUUID()
- ✓ R7.2: Correlation ID support for multi-agent tracing
- ✓ R7.3: session_id in all log entries
- ✓ R7.4: correlation_id when set for operation tracing

#### R9: Integration Points — v1.0.0
- ✓ R9.1: Session initialization hook (gsd-log-init.js)
- ✓ R9.2: gsd-check-update.js logging (DEBUG level)
- ✓ R9.3: gsd-statusline.js logging (TRACE level)
- ✓ R9.4: All 11 agent markdown files with logging specs
- ✓ R9.5: All 9 workflow orchestrators with logging specs

#### R10: Observability Commands — v1.0.0
- ✓ R10.1: /gsd:settings displays logging configuration
- ✓ R10.3: Comprehensive log viewing documentation

### Active

#### R8: File Logging (Optional) — Deferred to v2
- [ ] R8.1: Optional file transport when syslog unavailable
- [ ] R8.2: Log rotation by size (configurable, default 10MB)
- [ ] R8.3: Retention limit (configurable, default 5 files)
- [ ] R8.4: Secure permissions (0600 for files, 0700 for directory)

#### R10: Observability Commands — Partial
- [ ] R10.2: Enhance /gsd:debug to leverage logging for diagnosis (deferred)

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

### Current State (v1.0.0)

**Shipped:** 2026-01-29

GSD now has a production-grade logging system with 6 log levels, syslog integration, and comprehensive instrumentation:

| Component | Implementation | Status |
|-----------|----------------|--------|
| Core logger | lib/logger.js, lib/logger-config.js, lib/logger-syslog.js, lib/logger-metrics.js (~1,400 LOC) | ✓ Shipped |
| Hook integration | gsd-log-init.js, gsd-check-update.js, gsd-statusline.js | ✓ Shipped |
| Agent specs | 11 agent markdown files with `<logging>` sections | ✓ Shipped |
| Workflow specs | 9 workflow orchestrators with logging integration | ✓ Shipped |
| Documentation | references/logging.md (652 lines), /gsd:settings integration, CHANGELOG | ✓ Shipped |

**Configuration:**
- Default level: INFO (3) — workflow milestones without debug noise
- Syslog: Enabled by default (LOCAL0 facility, /dev/log)
- Environment override: `GSD_LOG_LEVEL=4` for temporary DEBUG logging
- Session tracking: Unique UUID per session for operation correlation

**Observability capabilities:**
- Silent operation at level 0 (0.0003ms overhead)
- Critical error logging at level 1
- Recoverable issues and gaps at level 2
- Workflow milestones at level 3 (default)
- Detailed operations at level 4
- Complete traceability at level 5

**Viewing logs:**
```bash
# Real-time logging
journalctl --user -t gsd -f

# Last 50 entries
journalctl --user -t gsd -n 50

# Time range
journalctl --user -t gsd --since "1 hour ago"
```

### Previous Problem (Solved in v1.0.0)

Before v1.0.0, GSD had no structured logging infrastructure. Debugging required reading multiple markdown files, manually correlating git history, and guessing at agent behavior. Performance issues and context window exhaustion were particularly difficult to diagnose.

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
| Use syslog as primary transport | Standard Unix mechanism, integrates with journald/rsyslog, no dependencies, supports remote aggregation | ✓ Good — RFC 5424 implementation works with journalctl |
| 6 log levels (0-5) | Industry standard (OFF/ERROR/WARN/INFO/DEBUG/TRACE), provides granular control, maps to syslog severity | ✓ Good — Clear verbosity progression, level 0 has 0.0003ms overhead |
| Singleton logger pattern | Ensures consistent session ID and config across all modules, simpler integration | ✓ Good — Consistent session tracking across 11 agents + 9 workflows |
| JSON context in log messages | Enables structured parsing while maintaining human readability in syslog viewers | ✓ Good — Queryable logs with readable format |
| Child logger factory pattern | Allows modules to get pre-configured loggers with fixed categories, reduces boilerplate | ✓ Good — Used in hook integration for categorization |
| High-resolution timers (hrtime) | Sub-millisecond precision for performance analysis, native Node.js API | ✓ Good — Achieved sub-millisecond timing (50.38ms for 50ms delay) |
| Config precedence: env > project > global > default | Standard pattern, allows temporary debugging via env vars, project-specific tuning | ✓ Good — Flexible debugging without changing config files |
| Correlation IDs optional | Only needed for complex multi-agent traces, avoid overhead when not debugging | ✓ Good — Zero overhead when not used, available when needed |
| File logging opt-in only | Syslog is more robust and standard; files are fallback for systems without syslog | ✓ Good — Deferred to v2, syslog sufficient for v1 |
| Agent logging via markdown specs | Agents can't execute code; logging instructions guide orchestrator behavior | ✓ Good — Hybrid format (prose + code) works for both humans and orchestrators |
| Hybrid specification format | Prose descriptions + JavaScript code examples in agent/workflow markdown | ✓ Good — Established in Phase 3, consistent across 20 files |
| Wave-based correlation | Phase + wave + plan fields for parallel execution tracing | ✓ Good — Enables correlation of parallel executor agents |

---
*Last updated: 2026-01-29 after v1.0.0 milestone*
