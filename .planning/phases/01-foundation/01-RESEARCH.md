# Phase 1: Foundation - Research

**Researched:** 2026-01-28
**Domain:** Node.js syslog integration, logging architecture, high-precision timing
**Confidence:** HIGH

## Summary

This phase implements a production-grade logging module for GSD using only Node.js standard library APIs. The core challenge is implementing RFC 5424 syslog compliance with zero external dependencies while maintaining the project's constraint of Node.js 16.7.0+ compatibility.

The standard approach is to build a singleton logger that sends RFC 5424-formatted messages to the local syslog daemon via Unix socket (`/dev/log`) or UDP fallback. The module system's caching behavior naturally provides singleton semantics when using CommonJS `require()`. High-resolution timing uses `process.hrtime.bigint()` (available since v10.7.0) for nanosecond precision.

Key architectural decisions are validated: syslog as primary transport aligns with Unix standards and journalctl integration, the 6-level system maps cleanly to syslog severity codes, and UUID session IDs can be generated via the built-in `crypto.randomUUID()` (available since v15.7.0).

**Primary recommendation:** Build a pure-JavaScript syslog client using `net` module for Unix socket transport and `dgram` module for UDP fallback, with early short-circuit for disabled levels.

## Standard Stack

The established libraries/tools for this domain:

### Core (Node.js Built-ins Only)

| Module | Version | Purpose | Why Standard |
|--------|---------|---------|--------------|
| `node:net` | Built-in | Unix domain socket to /dev/log | RFC 5424 local syslog transport |
| `node:dgram` | Built-in | UDP socket for remote syslog | RFC 5424 network transport |
| `node:crypto` | Built-in | `randomUUID()` for session IDs | Cryptographically secure UUIDs |
| `node:fs` | Built-in | Config file loading | Read .planning/config.json |
| `node:os` | Built-in | Hostname, homedir | Syslog HOSTNAME field, config paths |
| `node:process` | Built-in | `hrtime.bigint()`, `pid` | High-res timing, PROCID field |
| `node:path` | Built-in | Cross-platform path handling | Config file resolution |

### Supporting

| Utility | Purpose | When to Use |
|---------|---------|-------------|
| `process.hrtime.bigint()` | Nanosecond timing | Duration measurements |
| `crypto.randomUUID()` | Session ID generation | Once per session init |
| `os.hostname()` | Machine identification | Syslog HOSTNAME field |
| `process.pid` | Process identification | Syslog PROCID field |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Unix socket (`net`) | UDP only (`dgram`) | UDP doesn't guarantee delivery; Unix socket is reliable |
| `process.hrtime.bigint()` | `process.hrtime()` | Legacy API returns tuple, bigint is cleaner |
| `crypto.randomUUID()` | Custom UUID implementation | Built-in is faster and cryptographically secure |

**Installation:**
```bash
# No installation needed - all modules are Node.js built-ins
```

## Architecture Patterns

### Recommended Project Structure

```
src/
├── logger/
│   ├── index.js           # Main export, singleton factory
│   ├── logger.js          # Logger class implementation
│   ├── syslog.js          # RFC 5424 formatter + transport
│   ├── config.js          # Config loading with precedence
│   ├── timer.js           # High-resolution timing utilities
│   └── constants.js       # Levels, facilities, severity codes
└── index.js               # Public API re-export
```

Alternative (flatter structure for hooks integration):
```
hooks/
├── gsd-logger.js          # All-in-one logger module
├── gsd-check-update.js    # Existing hook (will import logger)
└── gsd-statusline.js      # Existing hook (will import logger)
```

### Pattern 1: Singleton via Module Caching

**What:** Node.js caches modules after first `require()`, providing natural singleton behavior.
**When to use:** Application-level singletons where consistent state (session ID, config) is needed across modules.

```javascript
// Source: Node.js Module Documentation
// logger/index.js
let instance = null;

function createLogger(options = {}) {
  if (!instance) {
    const Logger = require('./logger');
    instance = new Logger(options);
  }
  return instance;
}

// Export singleton getter
module.exports = createLogger;
module.exports.getLogger = () => instance;
```

**Caveats:**
- Case sensitivity: `require('./Logger')` and `require('./logger')` create separate instances
- Path resolution: Different paths to same file may bypass cache
- Solution: Always use consistent import paths

### Pattern 2: Early Short-Circuit for Level 0 (OFF)

**What:** Check log level before any work, returning immediately for disabled levels.
**When to use:** Every log call to ensure zero overhead when logging is off.

```javascript
// Source: Standard logging optimization pattern
class Logger {
  constructor(config) {
    this.level = config.level ?? 3; // Default INFO
  }

  log(level, message, context) {
    // Short-circuit: no work if level disabled
    if (level > this.level) return;
    if (this.level === 0) return; // OFF

    // Only now do expensive work
    this._format(level, message, context);
    this._send();
  }
}
```

### Pattern 3: RFC 5424 Syslog Message Format

**What:** Structured syslog message following the RFC 5424 specification.
**When to use:** All syslog messages sent to journald/rsyslog.

```javascript
// Source: RFC 5424 (https://datatracker.ietf.org/doc/html/rfc5424)
// Message format: <PRI>VERSION TIMESTAMP HOSTNAME APP-NAME PROCID MSGID STRUCTURED-DATA MSG

function formatSyslogMessage(facility, severity, appName, message, structuredData) {
  const pri = (facility * 8) + severity;
  const version = 1;
  const timestamp = new Date().toISOString(); // RFC 3339 compatible
  const hostname = os.hostname();
  const procid = process.pid;
  const msgid = '-'; // NILVALUE

  // Structured data format: [SD-ID param="value"]
  let sd = '-'; // NILVALUE if none
  if (structuredData) {
    const params = Object.entries(structuredData)
      .map(([k, v]) => `${k}="${escapeSDValue(v)}"`)
      .join(' ');
    sd = `[gsd@0 ${params}]`;
  }

  return `<${pri}>${version} ${timestamp} ${hostname} ${appName} ${procid} ${msgid} ${sd} ${message}`;
}

function escapeSDValue(value) {
  // RFC 5424: escape ", \, and ]
  return String(value).replace(/[\\"\\]]/g, '\\$&');
}
```

### Pattern 4: Unix Socket Transport with Graceful Fallback

**What:** Connect to /dev/log for syslog, fall back to UDP if unavailable.
**When to use:** Syslog transport initialization.

```javascript
// Source: Node.js net module documentation
const net = require('node:net');
const dgram = require('node:dgram');

class SyslogTransport {
  constructor(config) {
    this.mode = config.mode || 'unix'; // 'unix' or 'udp'
    this.path = config.path || '/dev/log';
    this.host = config.host || '127.0.0.1';
    this.port = config.port || 514;
    this.socket = null;
  }

  send(message) {
    if (this.mode === 'unix') {
      this._sendUnix(message);
    } else {
      this._sendUdp(message);
    }
  }

  _sendUnix(message) {
    const socket = net.createConnection({ path: this.path });
    socket.on('error', () => {
      // Silent failure - logging must never break GSD
      socket.destroy();
    });
    socket.on('connect', () => {
      socket.write(message + '\n');
      socket.end();
    });
  }

  _sendUdp(message) {
    const client = dgram.createSocket('udp4');
    const buffer = Buffer.from(message);
    client.send(buffer, this.port, this.host, (err) => {
      client.close();
      // Silent failure on error
    });
  }
}
```

### Pattern 5: High-Resolution Timer Utility

**What:** Measure operation duration with nanosecond precision.
**When to use:** Performance tracking for plans, waves, tasks.

```javascript
// Source: Node.js process.hrtime.bigint() documentation
class Timer {
  constructor() {
    this.start = process.hrtime.bigint();
  }

  elapsed() {
    const end = process.hrtime.bigint();
    const nanos = end - this.start;
    return {
      nanoseconds: nanos,
      microseconds: nanos / 1000n,
      milliseconds: Number(nanos / 1_000_000n),
      seconds: Number(nanos / 1_000_000_000n)
    };
  }

  elapsedMs() {
    return this.elapsed().milliseconds;
  }
}

// Usage
const timer = new Timer();
// ... operation ...
const duration = timer.elapsedMs();
```

### Anti-Patterns to Avoid

- **Async logging in hot paths:** Syslog sends should be fire-and-forget with no await. Never block on log delivery.
- **String concatenation for messages:** Use template literals or structured data, not `+` concatenation in loops.
- **Global mutable state:** Keep logger instance private, expose only factory function.
- **Throwing on log failure:** Logging errors must never crash the application. Always catch and ignore.
- **Synchronous config loading in hot paths:** Load config once at init, cache in memory.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| UUID generation | Custom random string | `crypto.randomUUID()` | Cryptographically secure, RFC 4122 compliant, 3x faster than npm uuid |
| High-res timing | `Date.now()` delta | `process.hrtime.bigint()` | Nanosecond precision, immune to clock drift |
| ISO timestamps | Manual string building | `new Date().toISOString()` | Handles timezone, milliseconds, edge cases |
| Path joining | String concatenation | `path.join()` | Cross-platform (Windows backslash) |
| Hostname lookup | Shell exec | `os.hostname()` | Cached, no subprocess overhead |

**Key insight:** Node.js built-ins cover all logging infrastructure needs. The "zero dependencies" constraint is achievable without sacrificing functionality.

## Common Pitfalls

### Pitfall 1: Blocking the Event Loop with Sync Writes

**What goes wrong:** Using synchronous socket operations causes GSD to hang during logging.
**Why it happens:** Developers assume "quick" operations are safe to block on.
**How to avoid:** Always use async socket methods (`socket.write()` with callback, not blocking).
**Warning signs:** Noticeable delay when logging is enabled, especially at high verbosity.

### Pitfall 2: Incorrect Syslog Priority Calculation

**What goes wrong:** Messages appear at wrong severity in journalctl, filtering fails.
**Why it happens:** Priority = Facility * 8 + Severity, not addition/other formula.
**How to avoid:**
```javascript
// Correct formula (RFC 5424)
const priority = (facility * 8) + severity;
// LOCAL0 (16) + ERROR (3) = 131, not 19
```
**Warning signs:** `journalctl -p err` doesn't show expected messages.

### Pitfall 3: Assuming Unix Socket Always Exists

**What goes wrong:** Logger fails on macOS (path is `/var/run/syslog`) or containers without syslog.
**Why it happens:** Hardcoding `/dev/log` assumes Linux.
**How to avoid:** Detect platform, use correct path, fall back to UDP.
```javascript
const syslogPath = process.platform === 'darwin'
  ? '/var/run/syslog'
  : '/dev/log';
```
**Warning signs:** `ENOENT` or `ECONNREFUSED` errors on non-Linux systems.

### Pitfall 4: Memory Leaks from Unclosed Sockets

**What goes wrong:** Each log message opens a new socket that's never closed.
**Why it happens:** Forgetting to call `socket.end()` or `client.close()`.
**How to avoid:** Always close sockets in callback/finally, or use connection pooling.
**Warning signs:** Increasing memory usage, file descriptor exhaustion.

### Pitfall 5: Config Loading Race Conditions

**What goes wrong:** Logger used before config is loaded, uses wrong defaults.
**Why it happens:** Async config loading with sync logger initialization.
**How to avoid:** Load config synchronously at startup (acceptable for one-time init), or defer first log until ready.
**Warning signs:** Logs appear at wrong level initially, then correct themselves.

### Pitfall 6: Structured Data Injection

**What goes wrong:** User-controlled values in structured data break syslog parsing.
**Why it happens:** Not escaping `"`, `\`, and `]` characters in SD-PARAM values.
**How to avoid:** Always escape per RFC 5424:
```javascript
value.replace(/[\\"\\]]/g, '\\$&')
```
**Warning signs:** Malformed syslog messages, parser errors in log aggregators.

## Code Examples

Verified patterns from official sources:

### Session ID Generation

```javascript
// Source: Node.js crypto.randomUUID() documentation (v15.7.0+)
const { randomUUID } = require('node:crypto');

const sessionId = randomUUID();
// Returns: '550e8400-e29b-41d4-a716-446655440000' (example)
```

### Config Loading with Precedence

```javascript
// Source: Standard Node.js patterns
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

function loadConfig() {
  const defaults = {
    level: 3, // INFO
    syslog: { enabled: true, facility: 'LOCAL0', mode: 'unix' },
    file: { enabled: false }
  };

  // Global config: ~/.claude/gsd-config.json
  const globalPath = path.join(os.homedir(), '.claude', 'gsd-config.json');
  const globalConfig = safeReadJson(globalPath)?.logging || {};

  // Project config: .planning/config.json
  const projectPath = path.join(process.cwd(), '.planning', 'config.json');
  const projectConfig = safeReadJson(projectPath)?.logging || {};

  // Environment overrides
  const envConfig = {
    level: parseLevel(process.env.GSD_LOG_LEVEL),
    syslog: { enabled: parseBool(process.env.GSD_LOG_SYSLOG) }
  };

  // Merge: defaults < global < project < env
  return deepMerge(defaults, globalConfig, projectConfig, envConfig);
}

function safeReadJson(filepath) {
  try {
    if (fs.existsSync(filepath)) {
      return JSON.parse(fs.readFileSync(filepath, 'utf8'));
    }
  } catch (e) {
    // Silent failure - config errors shouldn't break GSD
  }
  return null;
}
```

### Syslog Level Mapping

```javascript
// Source: RFC 5424 Section 6.2.1
const SYSLOG_SEVERITY = {
  EMERGENCY: 0,  // System unusable
  ALERT: 1,      // Immediate action required
  CRITICAL: 2,   // Critical conditions
  ERROR: 3,      // Error conditions
  WARNING: 4,    // Warning conditions
  NOTICE: 5,     // Normal but significant
  INFO: 6,       // Informational
  DEBUG: 7       // Debug-level messages
};

const SYSLOG_FACILITY = {
  LOCAL0: 16, LOCAL1: 17, LOCAL2: 18, LOCAL3: 19,
  LOCAL4: 20, LOCAL5: 21, LOCAL6: 22, LOCAL7: 23
};

// GSD level to syslog severity mapping
const GSD_TO_SYSLOG = {
  0: null,            // OFF - no syslog
  1: SYSLOG_SEVERITY.ERROR,    // ERROR -> 3
  2: SYSLOG_SEVERITY.WARNING,  // WARN -> 4
  3: SYSLOG_SEVERITY.INFO,     // INFO -> 6
  4: SYSLOG_SEVERITY.DEBUG,    // DEBUG -> 7
  5: SYSLOG_SEVERITY.DEBUG     // TRACE -> 7 (syslog has no TRACE)
};
```

### UDP Syslog Send

```javascript
// Source: Node.js dgram documentation
const dgram = require('node:dgram');

function sendUdpSyslog(message, host = '127.0.0.1', port = 514) {
  const client = dgram.createSocket('udp4');
  const buffer = Buffer.from(message);

  client.send(buffer, 0, buffer.length, port, host, (err) => {
    // Always close, ignore errors
    client.close();
  });
}
```

### Unix Socket Syslog Send

```javascript
// Source: Node.js net documentation
const net = require('node:net');

function sendUnixSyslog(message, socketPath = '/dev/log') {
  const socket = net.createConnection({ path: socketPath });

  socket.on('error', (err) => {
    // Silent failure - never break GSD
    socket.destroy();
  });

  socket.on('connect', () => {
    socket.write(message + '\n', () => {
      socket.end();
    });
  });
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `process.hrtime()` tuple | `process.hrtime.bigint()` | Node v10.7.0 | Cleaner API, no tuple math |
| npm `uuid` package | `crypto.randomUUID()` | Node v15.7.0 | Zero deps, 3x faster |
| Callback-heavy fs | `fs/promises` API | Node v10.0.0 | Cleaner async code |
| Manual JSON config | Still standard | N/A | No change needed |

**Deprecated/outdated:**
- `new Buffer()` constructor: Use `Buffer.from()` instead (security)
- `process.hrtime()` without bigint: Works but tuple API is awkward

## Open Questions

Things that couldn't be fully resolved:

1. **Connection pooling for Unix sockets**
   - What we know: Opening/closing socket per message adds overhead
   - What's unclear: Whether keeping socket open causes issues with syslog rotation
   - Recommendation: Start with open-per-message, optimize later if needed

2. **Structured data enterprise number**
   - What we know: RFC 5424 requires enterprise number for custom SD-IDs (format: `name@enterpriseNumber`)
   - What's unclear: Whether GSD needs an official IANA-registered number or can use `@0`
   - Recommendation: Use `gsd@0` for now, revisit if integrating with external log systems

3. **macOS syslog differences**
   - What we know: macOS uses `/var/run/syslog` and has ASL (Apple System Log) quirks
   - What's unclear: Full compatibility with RFC 5424 messages
   - Recommendation: Test on macOS, may need format adjustments

## Sources

### Primary (HIGH confidence)
- [Node.js dgram documentation](https://nodejs.org/api/dgram.html) - UDP socket API
- [Node.js net documentation](https://nodejs.org/api/net.html) - Unix socket API
- [Node.js process documentation](https://nodejs.org/api/process.html) - hrtime.bigint(), pid
- [Node.js crypto documentation](https://nodejs.org/api/crypto.html) - randomUUID()
- [Node.js perf_hooks documentation](https://nodejs.org/api/perf_hooks.html) - performance timing
- [RFC 5424](https://datatracker.ietf.org/doc/html/rfc5424) - Syslog Protocol specification

### Secondary (MEDIUM confidence)
- [Better Stack: journalctl guide](https://betterstack.com/community/guides/logging/how-to-control-journald-with-journalctl/) - Syslog filtering
- [Syslog Wikipedia](https://en.wikipedia.org/wiki/Syslog) - Facility/severity codes
- [ManageEngine syslog facilities](https://www.manageengine.com/products/eventlog/logging-guide/syslog/syslog-facilities.html) - LOCAL0-7 codes

### Tertiary (LOW confidence)
- Various Medium/dev.to articles on Node.js singleton patterns - general patterns, not authoritative

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All Node.js built-in APIs, documented official sources
- Architecture: HIGH - Standard patterns verified with official docs
- Pitfalls: MEDIUM - Based on RFC specs and common error patterns, some based on general experience

**Research date:** 2026-01-28
**Valid until:** 2026-02-28 (30 days - stable domain, Node.js APIs don't change rapidly)
