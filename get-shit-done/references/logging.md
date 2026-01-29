# GSD Debug Logging System

Comprehensive logging for GSD workflows and agents with graduated observability from silent operation through complete traceability.

<core_principle>
**Every GSD operation must be traceable when needed, invisible when not.**

When debugging a failed plan execution or investigating why verification gaps occurred, you must be able to reconstruct exactly what happened, when, and why — without imposing overhead during normal operation.
</core_principle>

## Quick Start

<quick_start>

**Default behavior:** GSD logs at INFO level (3) via syslog. You'll see workflow milestones like phase/plan/wave lifecycle events without being overwhelmed.

**Enable detailed debugging:**

```bash
# Environment variable (temporary)
export GSD_LOG_LEVEL=4
/gsd:execute-phase 02

# Or via project config (.planning/config.json)
{
  "logging": {
    "level": 4
  }
}
```

**View logs:**

```bash
# Real-time streaming
journalctl --user -t gsd -f

# Last 50 entries
journalctl --user -t gsd -n 50

# Since 1 hour ago
journalctl --user -t gsd --since "1 hour ago"
```

</quick_start>

## Log Levels

<log_levels>

GSD implements 6 discrete log levels (0-5) following industry standards.

| Level | Name | Value | Use Case | What You See |
|-------|------|-------|----------|--------------|
| 0 | OFF | `GSD_LOG_LEVEL=0` | Production silence | Nothing (zero overhead) |
| 1 | ERROR | `GSD_LOG_LEVEL=1` | Critical failures only | Errors requiring human attention |
| 2 | WARN | `GSD_LOG_LEVEL=2` | Recoverable issues | Warnings + errors (verification gaps, deviation applications) |
| 3 | INFO | `GSD_LOG_LEVEL=3` | **Default** - workflow milestones | Phase/plan/wave lifecycle + warnings + errors |
| 4 | DEBUG | `GSD_LOG_LEVEL=4` | Detailed operations | File loads, state transitions, context pressure, + all above |
| 5 | TRACE | `GSD_LOG_LEVEL=5` | Complete transparency | Every command, tool call, API metric, + all above |

### When to Use Each Level

**Level 0 (OFF)** - Production deployments where logging must be completely disabled. Early short-circuit ensures zero overhead.

**Level 1 (ERROR)** - Critical failures that require immediate human intervention:
- Configuration load failures
- Transport initialization errors
- Fatal exceptions in core workflows

**Level 2 (WARN)** - Recoverable issues that indicate potential problems:
- Verification gaps detected
- Deviation rule applications (auto-fixes)
- Context pressure approaching limits (75%+)
- Missing optional files

**Level 3 (INFO)** - Workflow milestones for understanding execution flow (default):
- Phase/plan/wave start and completion
- Agent spawn and completion
- Verification outcomes
- Checkpoint events
- Architectural decisions (Rule 4)

**Level 4 (DEBUG)** - Detailed operations for diagnosing issues:
- File loads (PLAN.md, CONTEXT.md, etc.)
- State transitions (phase status changes)
- Context pressure at intervals
- Config precedence resolution
- Artifact checks during verification
- Update checks

**Level 5 (TRACE)** - Complete operational transparency:
- Every Bash command execution
- Every tool call with parameters
- All API metrics (tokens, duration)
- Statusline updates
- Internal state changes

</log_levels>

## Syslog Primer

<syslog_primer>

GSD uses **syslog** — the standard Unix logging mechanism — to ensure logs persist across sessions and integrate with system tools.

### What is Syslog?

Syslog is a protocol for sending log messages to a centralized logging system. On modern Linux systems, this is typically **systemd's journal** (accessed via `journalctl`).

**Key concepts:**

- **Facility:** Category of the logging source (GSD uses LOCAL0 by default)
- **Severity:** Log level (ERROR, WARN, INFO, etc.)
- **Tag:** Application identifier (GSD uses `gsd`)

### Why Syslog?

| Benefit | Explanation |
|---------|-------------|
| **Persistence** | Logs survive process crashes and Claude Code restarts |
| **Standard tools** | Use journalctl, grep, less — no custom viewers needed |
| **Filtering** | Filter by facility, severity, time range |
| **Remote logging** | Can send to remote syslog servers (optional) |
| **Zero dependencies** | Built into Unix-like systems |

### Viewing with journalctl

```bash
# Basic viewing
journalctl --user -t gsd

# Real-time streaming (like tail -f)
journalctl --user -t gsd -f

# Filter by severity
journalctl --user -t gsd -p info    # INFO and above
journalctl --user -t gsd -p warning # WARN and above
journalctl --user -t gsd -p err     # ERROR only

# Time filtering
journalctl --user -t gsd --since "2026-01-29 10:00"
journalctl --user -t gsd --since "1 hour ago"
journalctl --user -t gsd --until "2026-01-29 12:00"

# JSON output for parsing
journalctl --user -t gsd -o json | jq '.MESSAGE'
```

**Expected output format:**

```
Jan 29 11:16:45 hostname gsd[12345]: Phase start [session=abc123 category=workflow level=INFO phase=05 plans=3]
Jan 29 11:16:47 hostname gsd[12345]: Agent spawn [session=abc123 category=orchestrator level=INFO agent=gsd-executor model=sonnet plan=05-01]
Jan 29 11:17:02 hostname gsd[12345]: Agent completion [session=abc123 category=orchestrator level=INFO agent=gsd-executor duration_sec=15 tasks=3 outcome=success]
```

</syslog_primer>

## Configuration

<configuration>

GSD logging configuration follows a strict precedence order:

**Precedence:** `environment variables` > `project config` > `global config` > `defaults`

### Environment Variables

Best for temporary debugging. Set before running GSD commands:

```bash
# Log level (0-5 or name)
export GSD_LOG_LEVEL=4          # Use DEBUG level
export GSD_LOG_LEVEL=DEBUG      # Same as above

# Enable/disable syslog transport
export GSD_LOG_SYSLOG=true      # Enable (default)
export GSD_LOG_SYSLOG=false     # Disable

# Syslog facility
export GSD_LOG_FACILITY=LOCAL0  # Default facility
export GSD_LOG_FACILITY=LOCAL7  # Alternative facility
```

**Example session:**

```bash
# Enable DEBUG logging for this session only
export GSD_LOG_LEVEL=4
/gsd:execute-phase 02

# Back to normal in next terminal
```

### Project Config

Persistent per-project settings in `.planning/config.json`:

```json
{
  "logging": {
    "level": 3,
    "syslog": {
      "enabled": true,
      "facility": "LOCAL0",
      "mode": "unix"
    }
  }
}
```

**When to use project config:**

- Debugging a specific project long-term
- Project has unique logging needs
- Team collaboration (committed to git)

### Global Config

User-wide defaults in `~/.claude/gsd-config.json`:

```json
{
  "logging": {
    "level": 3,
    "syslog": {
      "enabled": true,
      "facility": "LOCAL0"
    },
    "console": false
  }
}
```

**When to use global config:**

- Personal preference for log level
- Non-standard syslog configuration
- Development mode (console: true)

### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `level` | number/string | 3 (INFO) | Log level (0-5 or OFF/ERROR/WARN/INFO/DEBUG/TRACE) |
| `syslog.enabled` | boolean | true | Enable syslog transport |
| `syslog.facility` | string | "LOCAL0" | Syslog facility (LOCAL0-LOCAL7) |
| `syslog.mode` | string | "unix" | Transport mode ("unix" or "udp") |
| `console` | boolean | false | Also log to console (development) |

### Example Configurations

**Silent production:**

```json
{
  "logging": {
    "level": 0
  }
}
```

**Maximum debugging:**

```json
{
  "logging": {
    "level": 5,
    "console": true
  }
}
```

**Remote syslog:**

```json
{
  "logging": {
    "level": 3,
    "syslog": {
      "enabled": true,
      "mode": "udp",
      "host": "logs.example.com",
      "port": 514
    }
  }
}
```

</configuration>

## Viewing Logs

<viewing_logs>

Common journalctl patterns for GSD log analysis:

### Real-Time Monitoring

```bash
# Follow logs as they happen (like tail -f)
journalctl --user -t gsd -f

# Follow with 20 lines of context
journalctl --user -t gsd -f -n 20
```

**Use case:** Monitor execution during `/gsd:execute-phase` to see progress.

### Recent History

```bash
# Last 50 entries
journalctl --user -t gsd -n 50

# Last 200 entries
journalctl --user -t gsd -n 200

# All logs from today
journalctl --user -t gsd --since today
```

**Use case:** Review what happened in a recently completed phase.

### Filter by Priority

```bash
# Only INFO and above (default view)
journalctl --user -t gsd -p info

# Only warnings and errors
journalctl --user -t gsd -p warning

# Only errors
journalctl --user -t gsd -p err
```

**Use case:** Find problems without wading through DEBUG logs.

### Filter by Phase/Plan/Wave

```bash
# All logs for phase 05
journalctl --user -t gsd | grep "phase=05"

# Specific plan
journalctl --user -t gsd | grep "plan=05-02"

# Specific wave
journalctl --user -t gsd | grep "wave=2"

# Agent spawns only
journalctl --user -t gsd | grep "Agent spawn"
```

**Use case:** Isolate logs for specific execution context.

### Filter by Session

```bash
# Find session ID from recent log
journalctl --user -t gsd -n 1 | grep -o "session=[^ ]*"

# Show all logs for that session
journalctl --user -t gsd | grep "session=abc123-def4-5678-90ab-cdef12345678"
```

**Use case:** Trace all operations in a single GSD session (across multiple phases/plans).

### JSON Parsing

```bash
# Extract just the log message
journalctl --user -t gsd -o json | jq '.MESSAGE'

# Filter for phase completion events
journalctl --user -t gsd -o json | jq 'select(.MESSAGE | contains("Phase complete"))'

# Extract structured context fields
journalctl --user -t gsd -o json | jq '{time: .TIMESTAMP, message: .MESSAGE, priority: .PRIORITY}'
```

**Use case:** Automated log analysis, metrics extraction, dashboard generation.

### Time Range Queries

```bash
# Between specific times
journalctl --user -t gsd --since "2026-01-29 10:00" --until "2026-01-29 12:00"

# Last hour
journalctl --user -t gsd --since "1 hour ago"

# Last 30 minutes
journalctl --user -t gsd --since "30 minutes ago"

# Yesterday
journalctl --user -t gsd --since yesterday --until today
```

**Use case:** Narrow down to specific execution window.

### Combining Filters

```bash
# Phase 05 errors only
journalctl --user -t gsd -p err | grep "phase=05"

# Last hour of DEBUG logs for wave 3
journalctl --user -t gsd -p debug --since "1 hour ago" | grep "wave=3"

# All verification gap detections today
journalctl --user -t gsd --since today | grep "Gap detected"
```

**Use case:** Precise diagnostics with multiple criteria.

</viewing_logs>

## Troubleshooting

<troubleshooting>

Common logging issues with diagnosis and solutions:

### Symptom: No logs appearing

**Diagnosis:**

```bash
# Check if syslog is enabled
cat .planning/config.json | grep -A5 '"logging"'

# Check if log level is OFF
echo $GSD_LOG_LEVEL
```

**Possible causes:**

1. **Log level set to OFF (0)**

   Solution:
   ```bash
   export GSD_LOG_LEVEL=3  # INFO level
   # Or edit .planning/config.json and remove "level": 0
   ```

2. **Syslog disabled**

   Solution:
   ```bash
   export GSD_LOG_SYSLOG=true
   # Or edit .planning/config.json:
   # "logging": { "syslog": { "enabled": true } }
   ```

3. **Wrong journalctl command (missing --user flag)**

   Solution:
   ```bash
   # Wrong (looks in system journal):
   journalctl -t gsd

   # Right (looks in user journal):
   journalctl --user -t gsd
   ```

### Symptom: Too many logs

**Diagnosis:**

```bash
# Check current log level
journalctl --user -t gsd -n 1 | grep -o "level=[^ ]*"
```

**Possible causes:**

1. **Log level set too high (DEBUG or TRACE)**

   Solution:
   ```bash
   # Lower to INFO (default)
   export GSD_LOG_LEVEL=3
   # Or edit .planning/config.json: "level": 3
   ```

2. **TRACE level from previous debugging session**

   Solution:
   ```bash
   # Clear environment variable
   unset GSD_LOG_LEVEL
   # Will fall back to config or default (INFO)
   ```

### Symptom: Can't find logs for specific phase

**Diagnosis:**

```bash
# List all phases in logs
journalctl --user -t gsd | grep -o "phase=[0-9]*" | sort -u
```

**Possible causes:**

1. **Wrong phase number format**

   Solution:
   ```bash
   # Try zero-padded format:
   journalctl --user -t gsd | grep "phase=05"  # Not "phase=5"
   ```

2. **Phase executed before logging was enabled**

   Solution:
   ```bash
   # Check git log for phase completion commit
   git log --all --grep="phase 05" --oneline
   ```

3. **Logs rotated or pruned**

   Solution:
   ```bash
   # Check journal retention
   journalctl --user --disk-usage
   # Increase retention if needed (requires system admin)
   ```

### Symptom: "Permission denied" from journalctl

**Diagnosis:**

```bash
# Try without --user flag
journalctl -t gsd -n 1
```

**Possible causes:**

1. **Missing --user flag**

   Solution:
   ```bash
   # GSD logs to user journal, not system journal
   journalctl --user -t gsd
   ```

2. **User journal not enabled**

   Solution:
   ```bash
   # Check if user journal exists
   ls -la ~/.cache/systemd/journal/ 2>/dev/null || echo "User journal not configured"

   # Enable user journal (requires logout/login):
   sudo mkdir -p /var/log/journal
   sudo systemd-tmpfiles --create --prefix /var/log/journal
   ```

### Symptom: Logs appear but missing context fields

**Diagnosis:**

```bash
# Check raw journal output
journalctl --user -t gsd -n 1 -o verbose
```

**Possible causes:**

1. **Using cat instead of journalctl**

   Solution:
   ```bash
   # Wrong (loses structured data):
   cat /var/log/syslog | grep gsd

   # Right (preserves structure):
   journalctl --user -t gsd -o json | jq
   ```

2. **Old GSD version without structured logging**

   Solution:
   ```bash
   # Update GSD
   /gsd:update
   ```

### Symptom: Session IDs don't match across logs

**Diagnosis:**

```bash
# Extract unique session IDs
journalctl --user -t gsd --since "1 hour ago" | grep -o "session=[^ ]*" | sort -u
```

**Possible causes:**

1. **Multiple GSD sessions running**

   Explanation: Each Claude Code session gets a unique session ID. If you `/clear` or restart Claude Code, a new session ID is generated.

   Solution: Filter by specific session ID for single-session trace.

2. **Subagents spawned as separate processes**

   Explanation: Subagents inherit parent session ID, but this should be consistent.

   Diagnostic:
   ```bash
   # Check if agent logs have different session IDs
   journalctl --user -t gsd | grep "Agent spawn" | grep -o "session=[^ ]*"
   ```

</troubleshooting>

## Cross-References

<cross_references>

**Related documentation:**

- **Verification logging patterns:** `@get-shit-done/references/verification-logging.md` — Reusable patterns for verification events (artifact checks, gap detection, re-verification)

- **Agent logging specifications:**
  - `@agents/gsd-executor.md` `<logging>` section — Task execution, deviation rules, checkpoint events
  - `@agents/gsd-verifier.md` `<logging>` section — Verification lifecycle, gap detection
  - `@agents/gsd-planner.md` `<logging>` section — Planning operations, plan checker integration
  - `@agents/gsd-debugger.md` `<logging>` section — Hypothesis testing, investigation phases

- **Workflow orchestrator logging:**
  - `@workflows/execute-phase.md` `<logging>` section — Phase/wave/plan orchestration
  - `@workflows/plan-phase.md` `<logging>` section — Research check, planner spawn, checker loop

- **Implementation:**
  - `@lib/logger.js` — Core Logger class
  - `@lib/logger-config.js` — Configuration loading with precedence
  - `@lib/logger-syslog.js` — Syslog transport (RFC 5424)

- **Session hooks:**
  - `@hooks/gsd-log-init.js` — Session initialization, singleton logger setup
  - `@hooks/gsd-check-update.js` — Update check logging at DEBUG level
  - `@hooks/gsd-statusline.js` — Statusline logging at TRACE level

</cross_references>
