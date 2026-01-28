# GSD Debug Logging Implementation Plan

## Executive Summary

This document outlines a comprehensive plan to implement robust debug logging levels (0-5) for the Get Shit Done (GSD) meta-prompting and context engineering system. The logging system will provide graduated verbosity from silent operation (level 0) through complete traceability (level 5), enabling developers to diagnose issues, understand system behavior, and optimize workflows.

---

## 1. Current State Analysis

### 1.1 What GSD Does

GSD is a meta-prompting and context engineering system that:
- Installs as slash commands into Claude Code/OpenCode
- Orchestrates AI agents (planner, executor, verifier, researcher, etc.)
- Manages project workflows through phases and plans
- Tracks state, decisions, and execution artifacts
- Uses wave-based parallel execution for efficiency

### 1.2 Existing Observability Mechanisms

| Mechanism | Purpose | Limitation |
|-----------|---------|------------|
| Git commits | Task-level audit trail | No timing, no agent behavior |
| STATE.md | Position + velocity metrics | Manual updates, summary only |
| SUMMARY.md | Plan execution results | Created after completion, no real-time |
| VERIFICATION.md | Goal achievement status | Post-hoc, no process visibility |
| Statusline hook | Context usage display | Visual only, not logged |

### 1.3 Key Gaps Identified

1. **No execution tracing** - What agents did, when, and for how long
2. **No error categorization** - Types of failures, frequency, patterns
3. **No performance metrics** - Timing per operation, context pressure signals
4. **No resource tracking** - Token usage, model costs, API latency
5. **No real-time observability** - Everything is post-hoc in markdown files
6. **No correlation** - Can't trace a single request through the system

---

## 2. Design Philosophy

### 2.1 Core Principles

1. **Non-intrusive**: Logging must not affect GSD's primary function
2. **Configurable**: Users control verbosity per their debugging needs
3. **Standard mechanisms**: Use syslog for production-grade logging
4. **Performance-aware**: Higher log levels should have minimal overhead when disabled
5. **Structured**: Logs should be parseable for analysis tools
6. **Correlation-enabled**: Every operation traceable through session/request IDs

### 2.2 Log Level Philosophy

| Level | Name | Philosophy |
|-------|------|------------|
| 0 | OFF | Production silent mode - zero logging overhead |
| 1 | ERROR | Only failures requiring human attention |
| 2 | WARN | Abnormal but recoverable situations |
| 3 | INFO | Major workflow milestones and results |
| 4 | DEBUG | Detailed operational visibility |
| 5 | TRACE | Complete system transparency |

---

## 3. Log Level Specification

### 3.1 Level 0: OFF (None)

**Purpose**: Silent operation for production use where logs are unnecessary.

**What's logged**: Nothing

**When to use**:
- Production environments where GSD is stable
- Resource-constrained systems
- Privacy-sensitive contexts

**Implementation**: Logger short-circuits immediately on level check.

---

### 3.2 Level 1: ERROR (Critical Failures)

**Purpose**: Capture only failures that prevent GSD from functioning correctly.

**What's logged**:

| Category | Events | Example |
|----------|--------|---------|
| **Configuration** | Invalid config.json, missing required files | `ERROR [config] Invalid JSON in .planning/config.json: Unexpected token at line 5` |
| **System** | Installation failures, permission errors | `ERROR [system] Cannot write to ~/.claude/hooks: EACCES permission denied` |
| **Agent** | Agent spawn failures, unrecoverable errors | `ERROR [agent:executor] Task tool failed: Context window exhausted` |
| **Git** | Critical git operations failing | `ERROR [git] Commit failed: fatal: not a git repository` |
| **State** | Corrupt or missing critical state files | `ERROR [state] STATE.md parse failed: Invalid YAML frontmatter` |

**Format**:
```
TIMESTAMP ERROR [category] message
  context: {key: value}
  stack: <if exception>
```

**Volume**: ~1-5 entries per session (should be rare)

---

### 3.3 Level 2: WARN (Recoverable Issues)

**Purpose**: Capture situations that are abnormal but handled gracefully.

**What's logged** (includes all Level 1):

| Category | Events | Example |
|----------|--------|---------|
| **Verification** | Failed checks, gaps found | `WARN [verifier] Gap found: Chat.tsx exists but onSubmit is stub` |
| **Deviation** | Auto-applied deviation rules | `WARN [executor] Deviation Rule 1 applied: Fixed null check in auth.ts` |
| **Checkpoint** | User interaction required | `WARN [checkpoint] Plan 02-03 paused: human-verify required` |
| **Retry** | Operations that needed retry | `WARN [git] Push failed, retrying (attempt 2/4)` |
| **Config** | Missing optional config, using defaults | `WARN [config] model_profile not set, defaulting to 'balanced'` |
| **Timeout** | Operations approaching limits | `WARN [context] Context usage at 75%, approaching refresh threshold` |

**Format**:
```
TIMESTAMP WARN [category] message
  context: {key: value}
  recovery: <action taken>
```

**Volume**: ~10-30 entries per phase execution

---

### 3.4 Level 3: INFO (Workflow Events)

**Purpose**: Provide visibility into major workflow milestones without overwhelming detail.

**What's logged** (includes all Level 1-2):

| Category | Events | Example |
|----------|--------|---------|
| **Session** | Start/end, model info | `INFO [session] Started: session_abc123, model=claude-3-opus, project=myapp` |
| **Command** | Slash command invocations | `INFO [command] /gsd:execute-phase 2 invoked` |
| **Phase** | Phase start/complete | `INFO [phase] Phase 2 'Authentication' started with 4 plans` |
| **Plan** | Plan start/complete | `INFO [plan] Plan 02-01 'JWT Setup' completed: 3/3 tasks, 12min` |
| **Wave** | Wave execution events | `INFO [wave] Wave 1 started: spawning 2 parallel agents` |
| **Agent** | Agent lifecycle | `INFO [agent:executor] Spawned for plan 02-01 (model: sonnet)` |
| **Verification** | Overall verification results | `INFO [verifier] Phase 2 verification: PASSED (5/5 truths)` |
| **Git** | Commits created | `INFO [git] Commit abc1234: feat(02-01): implement JWT auth` |

**Format**:
```
TIMESTAMP INFO [category] message
  timing: <duration_ms>
  metadata: {key: value}
```

**Volume**: ~50-100 entries per phase execution

---

### 3.5 Level 4: DEBUG (Detailed Operations)

**Purpose**: Enable investigation of specific issues with detailed operational data.

**What's logged** (includes all Level 1-3):

| Category | Events | Example |
|----------|--------|---------|
| **Agent Context** | Files loaded, context injection | `DEBUG [agent:executor] Loaded context: STATE.md (45 lines), PLAN.md (120 lines)` |
| **Task** | Individual task execution | `DEBUG [task] Task 1 'Create auth service' started` |
| **File Ops** | File reads/writes/edits | `DEBUG [file:write] src/auth/jwt.ts (85 lines)` |
| **Config** | All config resolution | `DEBUG [config] Resolved: commit_docs=true, research=true, verifier=true` |
| **Dependencies** | Dependency resolution | `DEBUG [deps] Wave 2 depends on: plan-01 (complete), plan-02 (complete)` |
| **State Updates** | State machine transitions | `DEBUG [state] Position update: phase=2, plan=1, status=in_progress` |
| **Checkpoint Protocol** | Checkpoint handling details | `DEBUG [checkpoint] Constructing continuation prompt for task 3` |
| **Context Pressure** | Token counts, usage updates | `DEBUG [context] Token usage: 45,234/200,000 (22.6%)` |

**Format**:
```
TIMESTAMP DEBUG [category:subcategory] message
  timing: <duration_ms>
  input: <summarized input>
  output: <summarized output>
  context: {detailed_metadata}
```

**Volume**: ~200-500 entries per phase execution

---

### 3.6 Level 5: TRACE (Complete Transparency)

**Purpose**: Full visibility for deep debugging, performance analysis, and audit requirements.

**What's logged** (includes all Level 1-4):

| Category | Events | Example |
|----------|--------|---------|
| **Command Execution** | Every bash command with timing | `TRACE [bash] git status --short (14ms)` |
| **Tool Calls** | All Claude tool invocations | `TRACE [tool:read] Read src/auth/jwt.ts (245 tokens, 8ms)` |
| **API Metrics** | Response times, token usage | `TRACE [api] Agent response: 1,234 tokens in, 567 tokens out, 2.3s latency` |
| **File Content** | Truncated file contents read/written | `TRACE [file:content] jwt.ts first 100 chars: "import { SignJWT..."` |
| **Git Operations** | Every git command with output | `TRACE [git:cmd] git add src/auth/jwt.ts -> staged 1 file` |
| **Request Correlation** | Full request trace IDs | `TRACE [correlation] request_id=req_xyz spans: [agent_spawn, task_exec, commit]` |
| **Memory/Resources** | Process memory, file handles | `TRACE [resource] heap_used=45MB, open_files=12` |
| **Hook Execution** | All hooks with timing | `TRACE [hook] gsd-statusline.js executed in 23ms` |
| **Prompt Construction** | Full prompts (truncated) | `TRACE [prompt] Agent prompt: 4,567 chars, 1,234 tokens estimated` |
| **Response Parsing** | Agent response structure | `TRACE [response] Parsed: PLAN_COMPLETE with 3 commits` |

**Format**:
```
TIMESTAMP TRACE [category:subcategory:detail] message
  timing_ms: <precise timing>
  tokens_in: <if applicable>
  tokens_out: <if applicable>
  latency_ms: <if applicable>
  correlation_id: <request trace id>
  full_context: {complete_metadata}
```

**Volume**: ~1,000-3,000 entries per phase execution

---

## 4. Implementation Architecture

### 4.1 Component Overview

```
get-shit-done/
├── lib/
│   ├── logger.js           # Core logging module
│   ├── logger-config.js    # Configuration handling
│   ├── logger-syslog.js    # Syslog transport
│   ├── logger-file.js      # File transport (optional)
│   └── logger-metrics.js   # Timing and metrics utilities
├── hooks/
│   ├── gsd-check-update.js # (existing, add logging)
│   ├── gsd-statusline.js   # (existing, add logging)
│   └── gsd-log-init.js     # NEW: Initialize logging per session
└── bin/
    └── install.js          # (existing, add logging installation)
```

### 4.2 Logger Core Module (`lib/logger.js`)

```javascript
/**
 * GSD Logger - Core Module
 *
 * Provides leveled logging with syslog integration, timestamps,
 * timing metrics, and correlation support.
 */

const { Syslog } = require('./logger-syslog');
const { getConfig } = require('./logger-config');
const { Timer, Metrics } = require('./logger-metrics');

// Log levels
const LEVELS = {
  OFF: 0,
  ERROR: 1,
  WARN: 2,
  INFO: 3,
  DEBUG: 4,
  TRACE: 5
};

// Syslog severity mapping (RFC 5424)
const SYSLOG_SEVERITY = {
  ERROR: 3,  // Error
  WARN: 4,   // Warning
  INFO: 6,   // Informational
  DEBUG: 7,  // Debug
  TRACE: 7   // Debug (syslog has no trace)
};

class GSDLogger {
  constructor(options = {}) {
    this.config = getConfig(options);
    this.level = LEVELS[this.config.level] || LEVELS.INFO;
    this.sessionId = options.sessionId || this._generateSessionId();
    this.correlationId = null;
    this.metrics = new Metrics();

    // Initialize transports
    this.transports = [];
    if (this.config.syslog.enabled) {
      this.transports.push(new Syslog(this.config.syslog));
    }
    if (this.config.file.enabled) {
      const FileTransport = require('./logger-file');
      this.transports.push(new FileTransport(this.config.file));
    }
  }

  /**
   * Start a timing measurement
   */
  startTimer(operation) {
    return new Timer(operation, this);
  }

  /**
   * Set correlation ID for request tracing
   */
  setCorrelation(id) {
    this.correlationId = id;
  }

  /**
   * Log at ERROR level
   */
  error(category, message, context = {}) {
    this._log(LEVELS.ERROR, 'ERROR', category, message, context);
  }

  /**
   * Log at WARN level
   */
  warn(category, message, context = {}) {
    this._log(LEVELS.WARN, 'WARN', category, message, context);
  }

  /**
   * Log at INFO level
   */
  info(category, message, context = {}) {
    this._log(LEVELS.INFO, 'INFO', category, message, context);
  }

  /**
   * Log at DEBUG level
   */
  debug(category, message, context = {}) {
    this._log(LEVELS.DEBUG, 'DEBUG', category, message, context);
  }

  /**
   * Log at TRACE level
   */
  trace(category, message, context = {}) {
    this._log(LEVELS.TRACE, 'TRACE', category, message, context);
  }

  /**
   * Internal logging implementation
   */
  _log(level, levelName, category, message, context) {
    // Short-circuit if below configured level
    if (level > this.level) return;

    const entry = this._formatEntry(levelName, category, message, context);

    // Write to all transports
    for (const transport of this.transports) {
      transport.write(entry, SYSLOG_SEVERITY[levelName]);
    }
  }

  /**
   * Format log entry with timestamp and metadata
   */
  _formatEntry(level, category, message, context) {
    const timestamp = new Date().toISOString();
    const entry = {
      timestamp,
      level,
      category,
      message,
      session_id: this.sessionId,
      ...(this.correlationId && { correlation_id: this.correlationId }),
      ...context
    };

    // For syslog: structured format
    // Format: TIMESTAMP LEVEL [category] message | json_context
    const contextStr = Object.keys(context).length > 0
      ? ' | ' + JSON.stringify(context)
      : '';

    return {
      formatted: `${timestamp} ${level} [${category}] ${message}${contextStr}`,
      structured: entry
    };
  }

  _generateSessionId() {
    return 'gsd_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  }
}

// Singleton instance
let instance = null;

module.exports = {
  LEVELS,

  /**
   * Initialize the logger (call once at startup)
   */
  init(options = {}) {
    instance = new GSDLogger(options);
    return instance;
  },

  /**
   * Get the logger instance
   */
  getLogger() {
    if (!instance) {
      // Auto-init with defaults if not explicitly initialized
      instance = new GSDLogger();
    }
    return instance;
  },

  /**
   * Create a child logger with fixed category
   */
  child(category) {
    const logger = this.getLogger();
    return {
      error: (msg, ctx) => logger.error(category, msg, ctx),
      warn: (msg, ctx) => logger.warn(category, msg, ctx),
      info: (msg, ctx) => logger.info(category, msg, ctx),
      debug: (msg, ctx) => logger.debug(category, msg, ctx),
      trace: (msg, ctx) => logger.trace(category, msg, ctx),
      startTimer: (op) => logger.startTimer(op)
    };
  }
};
```

### 4.3 Syslog Transport (`lib/logger-syslog.js`)

```javascript
/**
 * Syslog Transport for GSD Logger
 *
 * Sends log entries to syslog using standard mechanisms.
 * Supports local syslog (Unix socket) and remote syslog (UDP).
 */

const dgram = require('dgram');
const fs = require('fs');
const os = require('os');

// Syslog facilities (RFC 5424)
const FACILITIES = {
  LOCAL0: 16,
  LOCAL1: 17,
  LOCAL2: 18,
  LOCAL3: 19,
  LOCAL4: 20,
  LOCAL5: 21,
  LOCAL6: 22,
  LOCAL7: 23
};

class Syslog {
  constructor(options = {}) {
    this.facility = FACILITIES[options.facility] || FACILITIES.LOCAL0;
    this.appName = options.appName || 'gsd';
    this.hostname = os.hostname();
    this.pid = process.pid;

    // Transport mode
    this.mode = options.mode || 'unix'; // 'unix', 'udp', 'tcp'
    this.target = options.target || '/dev/log'; // Unix socket or host:port

    // Initialize transport
    if (this.mode === 'unix') {
      this._initUnixSocket();
    } else if (this.mode === 'udp') {
      this._initUdp();
    }
  }

  _initUnixSocket() {
    // For Unix systems, write directly to /dev/log
    this.socketPath = this.target;
    // We'll use fs.createWriteStream with special handling
    // or fall back to dgram with unix socket
  }

  _initUdp() {
    const [host, port] = this.target.split(':');
    this.udpHost = host;
    this.udpPort = parseInt(port) || 514;
    this.socket = dgram.createSocket('udp4');
  }

  /**
   * Write a log entry to syslog
   */
  write(entry, severity) {
    // Calculate PRI value: (facility * 8) + severity
    const pri = (this.facility * 8) + severity;

    // RFC 5424 format
    const timestamp = entry.structured.timestamp;
    const message = entry.formatted;

    // Syslog message format
    const syslogMessage = `<${pri}>1 ${timestamp} ${this.hostname} ${this.appName} ${this.pid} - - ${message}`;

    this._send(syslogMessage);
  }

  _send(message) {
    const buffer = Buffer.from(message);

    if (this.mode === 'udp' && this.socket) {
      this.socket.send(buffer, 0, buffer.length, this.udpPort, this.udpHost, (err) => {
        if (err) {
          // Silent fail - logging shouldn't break the app
          // Could write to stderr in debug mode
        }
      });
    } else if (this.mode === 'unix') {
      // For Unix, we use dgram with unix socket or direct write
      try {
        // Most systems have /dev/log as a Unix socket
        // Node.js dgram doesn't support Unix sockets directly,
        // so we use a simple synchronous write approach for now
        // In production, consider using a native binding or logger daemon

        // Fallback: write to console.error which typically goes to journald/syslog
        if (process.stderr.isTTY === false) {
          process.stderr.write(message + '\n');
        }
      } catch (e) {
        // Silent fail
      }
    }
  }

  close() {
    if (this.socket) {
      this.socket.close();
    }
  }
}

module.exports = { Syslog, FACILITIES };
```

### 4.4 Configuration Handler (`lib/logger-config.js`)

```javascript
/**
 * Logger Configuration Handler
 *
 * Loads logging configuration from:
 * 1. Environment variables (GSD_LOG_LEVEL, GSD_LOG_SYSLOG, etc.)
 * 2. .planning/config.json logging section
 * 3. ~/.claude/gsd-config.json global config
 * 4. Defaults
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const DEFAULTS = {
  level: 'INFO',
  syslog: {
    enabled: true,
    facility: 'LOCAL0',
    mode: 'unix',
    target: '/dev/log',
    appName: 'gsd'
  },
  file: {
    enabled: false,
    path: null, // Will default to ~/.claude/logs/gsd.log
    maxSize: 10 * 1024 * 1024, // 10MB
    maxFiles: 5
  },
  format: {
    timestamps: true,
    includeStack: true,
    prettyPrint: false
  },
  metrics: {
    enabled: true,
    timingThresholdMs: 1000 // Log timing warnings above this
  }
};

function getConfig(overrides = {}) {
  // Start with defaults
  let config = JSON.parse(JSON.stringify(DEFAULTS));

  // Load from global config
  const globalConfigPath = path.join(
    process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude'),
    'gsd-config.json'
  );
  if (fs.existsSync(globalConfigPath)) {
    try {
      const globalConfig = JSON.parse(fs.readFileSync(globalConfigPath, 'utf8'));
      if (globalConfig.logging) {
        config = mergeDeep(config, globalConfig.logging);
      }
    } catch (e) {
      // Ignore parse errors
    }
  }

  // Load from project config
  const projectConfigPath = path.join(process.cwd(), '.planning', 'config.json');
  if (fs.existsSync(projectConfigPath)) {
    try {
      const projectConfig = JSON.parse(fs.readFileSync(projectConfigPath, 'utf8'));
      if (projectConfig.logging) {
        config = mergeDeep(config, projectConfig.logging);
      }
    } catch (e) {
      // Ignore parse errors
    }
  }

  // Environment variable overrides
  if (process.env.GSD_LOG_LEVEL) {
    config.level = process.env.GSD_LOG_LEVEL.toUpperCase();
  }
  if (process.env.GSD_LOG_SYSLOG === 'false') {
    config.syslog.enabled = false;
  }
  if (process.env.GSD_LOG_FILE) {
    config.file.enabled = true;
    config.file.path = process.env.GSD_LOG_FILE;
  }

  // Apply explicit overrides
  config = mergeDeep(config, overrides);

  // Set default file path if enabled but not specified
  if (config.file.enabled && !config.file.path) {
    config.file.path = path.join(
      process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude'),
      'logs',
      'gsd.log'
    );
  }

  return config;
}

function mergeDeep(target, source) {
  const output = Object.assign({}, target);
  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach(key => {
      if (isObject(source[key])) {
        if (!(key in target)) {
          Object.assign(output, { [key]: source[key] });
        } else {
          output[key] = mergeDeep(target[key], source[key]);
        }
      } else {
        Object.assign(output, { [key]: source[key] });
      }
    });
  }
  return output;
}

function isObject(item) {
  return (item && typeof item === 'object' && !Array.isArray(item));
}

module.exports = { getConfig, DEFAULTS };
```

### 4.5 Timing and Metrics Utilities (`lib/logger-metrics.js`)

```javascript
/**
 * Timing and Metrics Utilities for GSD Logger
 *
 * Provides high-resolution timing, operation metrics,
 * and performance tracking.
 */

class Timer {
  constructor(operation, logger) {
    this.operation = operation;
    this.logger = logger;
    this.startTime = process.hrtime.bigint();
    this.startMemory = process.memoryUsage().heapUsed;
    this.marks = [];
  }

  /**
   * Add a timing mark (lap time)
   */
  mark(label) {
    this.marks.push({
      label,
      time: process.hrtime.bigint(),
      memory: process.memoryUsage().heapUsed
    });
  }

  /**
   * End the timer and log results
   */
  end(context = {}) {
    const endTime = process.hrtime.bigint();
    const durationNs = endTime - this.startTime;
    const durationMs = Number(durationNs) / 1_000_000;
    const endMemory = process.memoryUsage().heapUsed;
    const memoryDelta = endMemory - this.startMemory;

    const timingContext = {
      duration_ms: Math.round(durationMs * 100) / 100,
      memory_delta_bytes: memoryDelta,
      ...context
    };

    // Add marks if any
    if (this.marks.length > 0) {
      timingContext.marks = this.marks.map((mark, i) => {
        const prevTime = i === 0 ? this.startTime : this.marks[i - 1].time;
        const lapNs = mark.time - prevTime;
        const lapMs = Number(lapNs) / 1_000_000;
        return {
          label: mark.label,
          lap_ms: Math.round(lapMs * 100) / 100
        };
      });
    }

    // Log based on duration threshold
    const threshold = this.logger.config?.metrics?.timingThresholdMs || 1000;
    if (durationMs > threshold) {
      this.logger.warn('timing', `${this.operation} took ${durationMs.toFixed(0)}ms (threshold: ${threshold}ms)`, timingContext);
    } else {
      this.logger.debug('timing', `${this.operation} completed`, timingContext);
    }

    return timingContext;
  }
}

class Metrics {
  constructor() {
    this.counters = {};
    this.gauges = {};
    this.histograms = {};
  }

  /**
   * Increment a counter
   */
  increment(name, value = 1, tags = {}) {
    const key = this._makeKey(name, tags);
    this.counters[key] = (this.counters[key] || 0) + value;
  }

  /**
   * Set a gauge value
   */
  gauge(name, value, tags = {}) {
    const key = this._makeKey(name, tags);
    this.gauges[key] = value;
  }

  /**
   * Record a histogram value (for distributions)
   */
  histogram(name, value, tags = {}) {
    const key = this._makeKey(name, tags);
    if (!this.histograms[key]) {
      this.histograms[key] = [];
    }
    this.histograms[key].push(value);
  }

  /**
   * Get summary of all metrics
   */
  getSummary() {
    const summary = {
      counters: { ...this.counters },
      gauges: { ...this.gauges },
      histograms: {}
    };

    // Calculate histogram summaries
    for (const [key, values] of Object.entries(this.histograms)) {
      if (values.length > 0) {
        const sorted = values.slice().sort((a, b) => a - b);
        summary.histograms[key] = {
          count: values.length,
          min: sorted[0],
          max: sorted[sorted.length - 1],
          mean: values.reduce((a, b) => a + b, 0) / values.length,
          p50: sorted[Math.floor(sorted.length * 0.5)],
          p95: sorted[Math.floor(sorted.length * 0.95)],
          p99: sorted[Math.floor(sorted.length * 0.99)]
        };
      }
    }

    return summary;
  }

  _makeKey(name, tags) {
    const tagStr = Object.entries(tags)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join(',');
    return tagStr ? `${name}{${tagStr}}` : name;
  }
}

module.exports = { Timer, Metrics };
```

---

## 5. Configuration Schema

### 5.1 Project Configuration (`.planning/config.json`)

Add logging section to existing config:

```json
{
  "mode": "interactive",
  "depth": "standard",
  "workflow": { ... },
  "planning": { ... },
  "parallelization": { ... },
  "gates": { ... },
  "safety": { ... },

  "logging": {
    "level": "INFO",
    "syslog": {
      "enabled": true,
      "facility": "LOCAL0"
    },
    "file": {
      "enabled": false
    },
    "metrics": {
      "enabled": true,
      "timingThresholdMs": 1000
    }
  }
}
```

### 5.2 Global Configuration (`~/.claude/gsd-config.json`)

New file for global GSD settings:

```json
{
  "logging": {
    "level": "DEBUG",
    "syslog": {
      "enabled": true,
      "facility": "LOCAL1",
      "mode": "unix",
      "target": "/dev/log"
    },
    "file": {
      "enabled": true,
      "path": "~/.claude/logs/gsd.log",
      "maxSize": 10485760,
      "maxFiles": 5
    }
  }
}
```

### 5.3 Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `GSD_LOG_LEVEL` | Override log level | `DEBUG`, `TRACE` |
| `GSD_LOG_SYSLOG` | Enable/disable syslog | `true`, `false` |
| `GSD_LOG_FILE` | Log file path (enables file logging) | `/var/log/gsd.log` |
| `GSD_LOG_QUIET` | Suppress all console output | `true` |

---

## 6. Integration Points

### 6.1 Session Start Hook

New hook `gsd-log-init.js`:

```javascript
#!/usr/bin/env node
/**
 * GSD Log Initialization Hook
 *
 * Called at session start to:
 * 1. Initialize logger with session context
 * 2. Log session start with environment details
 * 3. Set up correlation ID for request tracing
 */

const { init, getLogger } = require('../lib/logger');

// Parse session info from stdin (Claude Code provides JSON)
let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => input += chunk);
process.stdin.on('end', () => {
  try {
    const sessionData = JSON.parse(input);

    // Initialize logger
    const logger = init({
      sessionId: sessionData.session_id
    });

    // Log session start
    logger.info('session', 'GSD session started', {
      model: sessionData.model?.display_name,
      workspace: sessionData.workspace?.current_dir,
      context_remaining: sessionData.context_window?.remaining_percentage
    });

  } catch (e) {
    // Silent fail - don't break session start
  }
});
```

### 6.2 Hooks Integration

Update existing hooks to use logger:

**gsd-check-update.js**:
```javascript
const { child } = require('../lib/logger');
const log = child('update-check');

// ... existing code ...

log.debug('Checking for updates', { installed, latest });

if (cache.update_available) {
  log.info('Update available', { installed, latest });
}
```

**gsd-statusline.js**:
```javascript
const { child } = require('../lib/logger');
const log = child('statusline');

// ... existing code ...

log.trace('Statusline rendered', {
  model,
  context_used: used,
  has_task: !!task
});
```

### 6.3 Agent Markdown Instrumentation

Add logging instructions to agent specs. Example for `gsd-executor.md`:

```markdown
<logging>
At the start of execution, the orchestrator should log:

```javascript
log.info('agent:executor', 'Spawned for plan execution', {
  plan: '{phase}-{plan}',
  tasks: taskCount,
  autonomous: autonomous
});
```

For each task completion:
```javascript
log.debug('task', 'Task completed', {
  task_number: N,
  task_name: name,
  commit: hash,
  duration_ms: timing
});
```

For deviations:
```javascript
log.warn('deviation', 'Deviation rule applied', {
  rule: 'Rule 1 - Bug',
  description: description,
  files: affectedFiles
});
```
</logging>
```

### 6.4 Workflow Instrumentation

Add logging calls to workflow orchestration in execute-phase.md:

```markdown
<step name="execute_waves">
**Logging (orchestrator responsibility):**

Before spawning wave:
```javascript
log.info('wave', 'Starting wave execution', {
  wave_number: N,
  plans: planIds,
  parallel: autonomous
});
const timer = log.startTimer(`wave_${N}_execution`);
```

After wave completes:
```javascript
timer.end({
  plans_completed: completedCount,
  plans_failed: failedCount
});
log.info('wave', 'Wave completed', {
  wave_number: N,
  duration_ms: timer.durationMs
});
```
</step>
```

---

## 7. What Gets Logged at Each Level

### 7.1 Summary Matrix

| Event Type | L1 | L2 | L3 | L4 | L5 |
|------------|----|----|----|----|-----|
| System crashes | X | X | X | X | X |
| Configuration errors | X | X | X | X | X |
| Agent spawn failures | X | X | X | X | X |
| Verification gaps found | | X | X | X | X |
| Deviation rules applied | | X | X | X | X |
| Checkpoint pauses | | X | X | X | X |
| Retry attempts | | X | X | X | X |
| Session start/end | | | X | X | X |
| Phase start/complete | | | X | X | X |
| Plan start/complete | | | X | X | X |
| Agent lifecycle | | | X | X | X |
| Git commits | | | X | X | X |
| Context file loads | | | | X | X |
| Task execution details | | | | X | X |
| File operations | | | | X | X |
| State transitions | | | | X | X |
| Every bash command | | | | | X |
| Every tool call | | | | | X |
| API latency/tokens | | | | | X |
| Full prompt content | | | | | X |
| Resource metrics | | | | | X |

### 7.2 Volume Estimates

| Level | Entries/Phase | Entries/Session | Storage/Day |
|-------|--------------|-----------------|-------------|
| 1 | 1-5 | 5-20 | ~10 KB |
| 2 | 10-30 | 50-100 | ~50 KB |
| 3 | 50-100 | 200-500 | ~200 KB |
| 4 | 200-500 | 1,000-3,000 | ~2 MB |
| 5 | 1,000-3,000 | 5,000-15,000 | ~15 MB |

---

## 8. Implementation Roadmap

### Phase 1: Foundation (Week 1)

**Tasks:**
1. [ ] Create `lib/` directory structure
2. [ ] Implement `logger.js` core module
3. [ ] Implement `logger-config.js` configuration handler
4. [ ] Implement `logger-syslog.js` syslog transport
5. [ ] Implement `logger-metrics.js` timing utilities
6. [ ] Add logging config schema to `config.json` template
7. [ ] Update `build-hooks.js` to bundle logger modules

**Deliverables:**
- Working logger module with syslog output
- Configuration system with environment variable support
- Timing utilities for performance measurement

### Phase 2: Hook Integration (Week 2)

**Tasks:**
1. [ ] Create `gsd-log-init.js` session initialization hook
2. [ ] Update `gsd-check-update.js` with logging
3. [ ] Update `gsd-statusline.js` with logging
4. [ ] Update `install.js` to register logging hook
5. [ ] Add log initialization to settings.json hooks config

**Deliverables:**
- Session-aware logging initialized at start
- All hooks produce appropriate log output
- Installation process sets up logging infrastructure

### Phase 3: Agent Instrumentation (Week 3)

**Tasks:**
1. [ ] Add `<logging>` section to `gsd-executor.md`
2. [ ] Add `<logging>` section to `gsd-verifier.md`
3. [ ] Add `<logging>` section to `gsd-planner.md`
4. [ ] Add `<logging>` section to all other agents
5. [ ] Document logging patterns in reference guide

**Deliverables:**
- All agents have logging specifications
- Consistent logging patterns across agents
- Reference documentation for logging

### Phase 4: Workflow Integration (Week 4)

**Tasks:**
1. [ ] Add logging to `execute-phase.md` workflow
2. [ ] Add logging to `execute-plan.md` workflow
3. [ ] Add logging to `plan-phase.md` workflow
4. [ ] Add logging to `verify-phase.md` workflow
5. [ ] Add logging to all other workflows

**Deliverables:**
- All workflows produce structured logs
- Wave execution fully instrumented
- Checkpoint handling logged

### Phase 5: Command Integration (Week 5)

**Tasks:**
1. [ ] Add logging preamble to all slash commands
2. [ ] Implement `/gsd:log` command for log management
3. [ ] Add `logging` section to `/gsd:settings` output
4. [ ] Update `/gsd:debug` to leverage logging

**Deliverables:**
- All commands produce appropriate logs
- Log management command available
- Debug workflow enhanced with logging

### Phase 6: Documentation & Polish (Week 6)

**Tasks:**
1. [ ] Write logging reference guide (`references/logging.md`)
2. [ ] Add logging FAQ to help documentation
3. [ ] Create troubleshooting guide using logs
4. [ ] Add log analysis examples
5. [ ] Update CHANGELOG with logging feature

**Deliverables:**
- Comprehensive logging documentation
- Troubleshooting guides
- User-facing documentation complete

---

## 9. Testing Strategy

### 9.1 Unit Tests

| Component | Test Cases |
|-----------|------------|
| `logger.js` | Level filtering, formatting, transport dispatch |
| `logger-config.js` | Config merging, env var override, default handling |
| `logger-syslog.js` | Message formatting, severity mapping |
| `logger-metrics.js` | Timer accuracy, metric aggregation |

### 9.2 Integration Tests

| Scenario | Validation |
|----------|------------|
| Session start | Logger initialized, session ID assigned |
| Phase execution | All workflow stages logged |
| Error handling | Errors captured with stack traces |
| Level filtering | Only appropriate levels output |

### 9.3 Performance Tests

| Metric | Target |
|--------|--------|
| Log call overhead (level disabled) | < 1ms |
| Log call overhead (level enabled) | < 5ms |
| Memory overhead | < 10MB |
| Syslog write latency | < 10ms |

---

## 10. Security Considerations

### 10.1 Sensitive Data

**Never log:**
- API keys, tokens, credentials
- Full file contents (truncate appropriately)
- User personal information
- Session secrets

**Sanitization:**
```javascript
function sanitize(obj) {
  const sensitive = ['api_key', 'token', 'password', 'secret', 'credential'];
  const result = { ...obj };
  for (const key of Object.keys(result)) {
    if (sensitive.some(s => key.toLowerCase().includes(s))) {
      result[key] = '[REDACTED]';
    }
  }
  return result;
}
```

### 10.2 File Permissions

- Log files: `0600` (owner read/write only)
- Log directory: `0700` (owner access only)
- Syslog messages: Follow system syslog permissions

### 10.3 Log Rotation

When file logging is enabled:
- Rotate at `maxSize` (default 10MB)
- Keep `maxFiles` rotations (default 5)
- Total max storage: 50MB per project

---

## 11. Usage Examples

### 11.1 Enabling Debug Logging

**Via environment variable:**
```bash
GSD_LOG_LEVEL=DEBUG claude
```

**Via project config:**
```json
{
  "logging": {
    "level": "DEBUG"
  }
}
```

### 11.2 Viewing Logs

**Syslog (journald):**
```bash
journalctl -t gsd --since "1 hour ago"
journalctl -t gsd -f  # Follow live
```

**Syslog (traditional):**
```bash
grep gsd /var/log/syslog
tail -f /var/log/syslog | grep gsd
```

**File logs:**
```bash
tail -f ~/.claude/logs/gsd.log
```

### 11.3 Filtering by Category

```bash
# Only agent logs
journalctl -t gsd | grep '\[agent'

# Only timing warnings
journalctl -t gsd | grep 'WARN.*timing'

# Only errors
journalctl -t gsd | grep 'ERROR'
```

### 11.4 Correlating a Request

```bash
# Find all logs for a specific session
journalctl -t gsd | grep 'session_id=gsd_abc123'

# Find all logs for a specific operation
journalctl -t gsd | grep 'correlation_id=req_xyz'
```

---

## 12. Success Criteria

### 12.1 Functional Requirements

- [ ] All log levels (0-5) function as specified
- [ ] Syslog integration works on Linux/macOS
- [ ] File logging works with rotation
- [ ] Configuration loads from all sources correctly
- [ ] Environment variables override config
- [ ] Timestamps are ISO 8601 format
- [ ] Timing metrics capture operation durations
- [ ] Correlation IDs trace requests through system

### 12.2 Performance Requirements

- [ ] Level 0 has zero logging overhead
- [ ] Log calls at disabled levels < 1ms
- [ ] Log calls at enabled levels < 5ms
- [ ] No impact on GSD workflow execution time

### 12.3 Usability Requirements

- [ ] Logs are human-readable
- [ ] Logs are machine-parseable (JSON context)
- [ ] Documentation explains each log level
- [ ] Troubleshooting guide uses log examples

---

## Appendix A: Log Message Catalog

### A.1 Error Messages (Level 1)

| Code | Message | Cause | Resolution |
|------|---------|-------|------------|
| E001 | Invalid config.json | Malformed JSON | Check JSON syntax |
| E002 | State file corrupt | Invalid YAML | Recreate STATE.md |
| E003 | Agent spawn failed | Task tool error | Check context size |
| E004 | Git operation failed | Git error | Check git status |
| E005 | Permission denied | File access | Check permissions |

### A.2 Warning Messages (Level 2)

| Code | Message | Cause | Resolution |
|------|---------|-------|------------|
| W001 | Verification gap | Missing implementation | Run gap closure |
| W002 | Deviation applied | Auto-fix triggered | Review in SUMMARY |
| W003 | Checkpoint pause | User action needed | Complete checkpoint |
| W004 | Retry needed | Transient failure | Usually auto-resolved |
| W005 | Context pressure | High token usage | Consider /clear |

### A.3 Info Messages (Level 3)

| Code | Message | Context |
|------|---------|---------|
| I001 | Session started | Model, workspace info |
| I002 | Command invoked | Command name, args |
| I003 | Phase started | Phase number, plan count |
| I004 | Plan completed | Tasks, duration |
| I005 | Verification complete | Status, score |

---

## Appendix B: Syslog Facility Recommendations

| Use Case | Facility | Rationale |
|----------|----------|-----------|
| Development | LOCAL0 | Default, easy filtering |
| Production | LOCAL1 | Separate from dev |
| CI/CD | LOCAL2 | Automation logs |
| Security audit | LOCAL3 | Compliance separation |

---

## Appendix C: Glossary

| Term | Definition |
|------|------------|
| **Correlation ID** | Unique identifier tracing a request through the system |
| **Facility** | Syslog category for filtering logs |
| **Severity** | Syslog priority level (0-7) |
| **Transport** | Output destination (syslog, file, etc.) |
| **Timer** | High-resolution operation duration measurement |
| **Gauge** | Point-in-time metric value |
| **Counter** | Cumulative metric value |
| **Histogram** | Distribution of metric values |
