# Phase 2: Hook Integration - Research

**Researched:** 2026-01-28
**Domain:** Claude Code hooks system, Node.js module bundling, GSD hook architecture
**Confidence:** HIGH

## Summary

This phase integrates the Phase 1 logger module into GSD's hook system. The primary challenges are: (1) creating a SessionStart hook that initializes logging with session context, (2) updating existing hooks (gsd-check-update.js, gsd-statusline.js) to emit appropriate log messages, (3) ensuring the logger module is bundled correctly for distribution, and (4) registering the new hook in install.js.

Claude Code's hook system is well-documented and uses a JSON configuration in settings.json. SessionStart hooks receive session_id, model, and cwd via JSON on stdin, providing all the context needed for session logging. The existing build-hooks.js uses simple file copying (no bundling), which must be enhanced to either inline the logger module or bundle it with esbuild.

The key architectural decision is whether to bundle the logger into each hook or create a shared logger module. Given GSD's zero-dependency constraint and the need for session ID consistency across hooks, the recommended approach is to bundle the logger into a single shared module (lib/logger.js) that hooks import at runtime.

**Primary recommendation:** Create gsd-log-init.js as a SessionStart hook that initializes the singleton logger with session context from Claude Code, bundle all logger modules for distribution, and have other hooks import the bundled logger.

## Standard Stack

The established libraries/tools for this domain:

### Core (Node.js Built-ins Only)

| Module | Version | Purpose | Why Standard |
|--------|---------|---------|--------------|
| `node:fs` | Built-in | File operations, hook scripts | Required for reading stdin, writing logs |
| `node:path` | Built-in | Path manipulation | Cross-platform path handling |
| `node:os` | Built-in | System information | Home directory, platform detection |
| `node:child_process` | Built-in | Spawn background processes | Used by gsd-check-update.js |

### Build Tools (Dev Dependencies)

| Tool | Version | Purpose | Why Standard |
|------|---------|---------|--------------|
| esbuild | ^0.24.0 | Module bundling | Already in devDependencies, fast, zero-config |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| esbuild bundling | Inline concatenation | esbuild handles imports/exports correctly, inline is fragile |
| Shared logger module | Per-hook bundled logger | Shared reduces duplication, maintains singleton semantics |
| SessionStart hook | Manual init in each hook | SessionStart provides session context automatically |

**Installation:**
```bash
# No additional installation - esbuild already in devDependencies
```

## Architecture Patterns

### Recommended Project Structure

```
hooks/
├── gsd-log-init.js       # NEW: SessionStart hook, initializes logger with session
├── gsd-check-update.js   # MODIFY: Add logging calls
├── gsd-statusline.js     # MODIFY: Add logging calls
├── dist/                 # Bundled hooks for distribution
│   ├── gsd-log-init.js
│   ├── gsd-check-update.js
│   └── gsd-statusline.js
lib/
├── logger.js             # FROM PHASE 1: Core logger module
├── logger-config.js      # FROM PHASE 1: Config loading
├── logger-syslog.js      # FROM PHASE 1: Syslog transport
├── logger-metrics.js     # FROM PHASE 1: Timing utilities
└── index.js              # FROM PHASE 1: Public API
scripts/
└── build-hooks.js        # MODIFY: Bundle logger with hooks
bin/
└── install.js            # MODIFY: Register SessionStart hook
```

### Pattern 1: SessionStart Hook for Logger Initialization

**What:** Claude Code's SessionStart hook receives session context (session_id, model, cwd) via JSON stdin. Use this to initialize the singleton logger with the correct session ID.

**When to use:** Once per session, before any other logging occurs.

**Example:**
```javascript
// Source: Claude Code hooks documentation
// hooks/gsd-log-init.js
const { createLogger } = require('../lib');

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => input += chunk);
process.stdin.on('end', () => {
  try {
    const data = JSON.parse(input);

    // Initialize logger with session context from Claude Code
    const logger = createLogger({
      sessionId: data.session_id,  // Use Claude's session ID
      category: 'gsd.session'
    });

    // Log session start
    logger.info('Session started', {
      model: data.model,
      workspace: data.cwd,
      source: data.source,  // 'startup', 'resume', 'clear', 'compact'
      permissionMode: data.permission_mode
    });

    // Output success for Claude Code (exit 0 = success)
    process.exit(0);
  } catch (e) {
    // Silent failure - logging should never break GSD
    process.exit(0);
  }
});
```

### Pattern 2: Hook Input JSON Processing

**What:** All Claude Code hooks receive JSON on stdin with session context.

**When to use:** Every hook that needs session information.

**Example:**
```javascript
// Source: Claude Code hooks documentation
// SessionStart hook input structure
{
  "session_id": "abc123",
  "transcript_path": "~/.claude/projects/.../session.jsonl",
  "cwd": "/path/to/project",
  "permission_mode": "default",
  "hook_event_name": "SessionStart",
  "source": "startup",  // or "resume", "clear", "compact"
  "model": "claude-sonnet-4-20250514"
}
```

### Pattern 3: Logging in Existing Hooks

**What:** Add logging calls to existing hooks without changing their core functionality.

**When to use:** gsd-check-update.js and gsd-statusline.js.

**Example for gsd-check-update.js:**
```javascript
// Source: GSD patterns
const { getLogger } = require('../lib');

// At start of check
const logger = getLogger();
if (logger.isEnabled) {
  logger.debug('Update check initiated', {
    projectVersionFile,
    globalVersionFile
  });
}

// After check completes (in background child)
// Note: Background process won't share logger instance
// Log via separate mechanism or skip (update check is fire-and-forget)
```

**Example for gsd-statusline.js:**
```javascript
// Source: GSD patterns
const { getLogger } = require('../lib');

// At TRACE level (5) - very verbose, only when debugging
const logger = getLogger();
logger.trace('Statusline render', {
  model: data.model?.display_name,
  contextRemaining: remaining,
  taskActive: !!task
});
```

### Pattern 4: esbuild Bundling for Hooks

**What:** Bundle logger modules into hooks for distribution.

**When to use:** build-hooks.js script.

**Example:**
```javascript
// Source: esbuild documentation
const esbuild = require('esbuild');

// Bundle each hook with its dependencies
await esbuild.build({
  entryPoints: ['hooks/gsd-log-init.js'],
  bundle: true,
  platform: 'node',
  target: 'node16.7',  // Match package.json engines
  outfile: 'hooks/dist/gsd-log-init.js',
  external: [],  // Bundle everything, no externals
  format: 'cjs',
  minify: false,  // Keep readable for debugging
});
```

### Pattern 5: settings.json Hook Registration

**What:** Register hooks in Claude Code's settings.json.

**When to use:** install.js when setting up GSD.

**Example:**
```javascript
// Source: Claude Code hooks documentation
// In settings.json
{
  "hooks": {
    "SessionStart": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "node \"/path/to/.claude/hooks/gsd-log-init.js\""
          }
        ]
      }
    ]
  }
}
```

### Anti-Patterns to Avoid

- **Logging in background child processes:** Background processes (like update checker's spawned child) don't share the singleton logger. Either skip logging there or use a separate mechanism.
- **Blocking on log writes in statusline:** Statusline runs frequently; logging must be fire-and-forget.
- **Hardcoding paths:** Use CLAUDE_PROJECT_DIR environment variable or computed paths.
- **Exit code 2 for logging failures:** Exit 2 blocks the hook action. Logging failures should exit 0 (silent success).

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JSON stdin parsing | Custom parser | JSON.parse() on collected chunks | Standard, handles edge cases |
| Module bundling | Manual concatenation | esbuild | Handles imports, tree-shaking |
| Hook registration format | Custom format | Claude Code's JSON structure | Must match Claude Code's expectations |
| Session ID generation | Custom UUID | Claude Code provides session_id | Use Claude's ID for correlation |

**Key insight:** Claude Code already provides session context via stdin. Don't generate your own session ID - use Claude Code's session_id for perfect correlation with Claude Code's internal logging.

## Common Pitfalls

### Pitfall 1: Ignoring Hook Exit Codes

**What goes wrong:** Exit code 2 blocks the hook action and shows stderr to Claude. Exit code 0 is "success" even if logging failed.
**Why it happens:** Confusing "logging failed" with "hook failed."
**How to avoid:** Always exit 0 from logging hooks. Wrap everything in try/catch.
**Warning signs:** Session start failing, prompts not processing.

### Pitfall 2: Synchronous Stdin Reading

**What goes wrong:** Using fs.readFileSync(0) can block indefinitely.
**Why it happens:** Stdin might not have all data immediately.
**How to avoid:** Use event-based stdin reading with 'data' and 'end' events.
**Warning signs:** Hooks timing out, Claude Code hanging.

### Pitfall 3: Logger Not Initialized

**What goes wrong:** Hooks that run before SessionStart try to log before logger is initialized.
**Why it happens:** Hook execution order isn't guaranteed.
**How to avoid:** Logger should auto-initialize with defaults if not explicitly initialized. getLogger() should create instance if none exists.
**Warning signs:** "Cannot read property 'info' of undefined" errors.

### Pitfall 4: Bundling External Dependencies

**What goes wrong:** esbuild tries to bundle node built-ins or expects them external.
**Why it happens:** Platform configuration wrong.
**How to avoid:** Set `platform: 'node'` in esbuild config - this automatically handles node: built-ins.
**Warning signs:** "Could not resolve 'fs'" or similar errors.

### Pitfall 5: Statusline Performance

**What goes wrong:** Statusline becomes slow due to logging overhead.
**Why it happens:** Statusline runs on every Claude response, logging adds latency.
**How to avoid:** Use TRACE level (5) for statusline logging - disabled by default. Short-circuit check before any work.
**Warning signs:** Noticeable delay in statusline updates.

### Pitfall 6: Install.js Breaking Existing Hooks

**What goes wrong:** Installing GSD overwrites user's existing SessionStart hooks.
**Why it happens:** Replacing entire hooks array instead of appending.
**How to avoid:** Check if SessionStart array exists, append GSD hook, preserve others.
**Warning signs:** User's other SessionStart hooks stop working after GSD install.

## Code Examples

Verified patterns from official sources:

### Complete SessionStart Hook

```javascript
// Source: Claude Code hooks documentation + GSD patterns
#!/usr/bin/env node
// GSD Session Logger Initialization
// Called by SessionStart hook - initializes logger with session context

const { createLogger } = require('../lib');

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => input += chunk);
process.stdin.on('end', () => {
  try {
    const data = JSON.parse(input);

    // Initialize singleton logger with Claude Code's session ID
    const logger = createLogger({
      sessionId: data.session_id,
      category: 'gsd.session'
    });

    // Log session initialization at INFO level
    logger.info('GSD session initialized', {
      model: data.model || 'unknown',
      workspace: data.cwd,
      source: data.source,
      permissionMode: data.permission_mode
    });

  } catch (e) {
    // Silent failure - never break GSD
  }

  // Always exit 0 - logging failures shouldn't block session
  process.exit(0);
});
```

### Updated gsd-check-update.js with Logging

```javascript
// Source: GSD codebase + logging patterns
#!/usr/bin/env node
// Check for GSD updates in background, write result to cache
// Called by SessionStart hook - runs once per session

const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');

// Import logger - may not be initialized if this runs before gsd-log-init
let logger;
try {
  const { getLogger } = require('../lib');
  logger = getLogger();
} catch (e) {
  logger = null;
}

const homeDir = os.homedir();
// ... existing path setup ...

// Log update check initiation at DEBUG level
if (logger && !logger.isOff) {
  logger.debug('Update check initiated', {
    cacheFile,
    projectVersionFile,
    globalVersionFile
  });
}

// Run check in background (existing code)
const child = spawn(process.execPath, ['-e', `
  // ... existing background check code ...
  // Note: Background process doesn't have access to logger
`], {
  stdio: 'ignore',
  windowsHide: true
});

child.unref();

// Log that background check was spawned
if (logger && !logger.isOff) {
  logger.debug('Update check spawned in background');
}
```

### Updated gsd-statusline.js with TRACE Logging

```javascript
// Source: GSD codebase + logging patterns
#!/usr/bin/env node
// Claude Code Statusline - GSD Edition

const fs = require('fs');
const path = require('path');
const os = require('os');

// Import logger for trace-level debugging
let logger;
try {
  const { getLogger } = require('../lib');
  logger = getLogger();
} catch (e) {
  logger = null;
}

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => input += chunk);
process.stdin.on('end', () => {
  try {
    const data = JSON.parse(input);

    // TRACE level logging (level 5) - only when debugging
    if (logger && logger.level >= 5) {
      logger.trace('Statusline render', {
        model: data.model?.display_name,
        contextRemaining: data.context_window?.remaining_percentage,
        session: data.session_id
      });
    }

    // ... existing statusline rendering code ...

  } catch (e) {
    // Silent fail - don't break statusline on parse errors
  }
});
```

### Updated build-hooks.js with esbuild Bundling

```javascript
// Source: esbuild documentation
#!/usr/bin/env node
/**
 * Build GSD hooks with logger bundled for distribution.
 */

const fs = require('fs');
const path = require('path');
const esbuild = require('esbuild');

const HOOKS_DIR = path.join(__dirname, '..', 'hooks');
const LIB_DIR = path.join(__dirname, '..', 'lib');
const DIST_DIR = path.join(HOOKS_DIR, 'dist');

// Hooks that need logger bundled
const HOOKS_WITH_LOGGER = [
  'gsd-log-init.js',
  'gsd-check-update.js',
  'gsd-statusline.js'
];

async function build() {
  // Ensure dist directory exists
  if (!fs.existsSync(DIST_DIR)) {
    fs.mkdirSync(DIST_DIR, { recursive: true });
  }

  // Bundle each hook with logger
  for (const hook of HOOKS_WITH_LOGGER) {
    const src = path.join(HOOKS_DIR, hook);
    const dest = path.join(DIST_DIR, hook);

    if (!fs.existsSync(src)) {
      console.warn(`Warning: ${hook} not found, skipping`);
      continue;
    }

    console.log(`Bundling ${hook}...`);

    await esbuild.build({
      entryPoints: [src],
      bundle: true,
      platform: 'node',
      target: 'node16.7',
      outfile: dest,
      format: 'cjs',
      minify: false,  // Keep readable
      sourcemap: false,
      external: [],  // Bundle everything
    });

    console.log(`  -> ${dest}`);
  }

  console.log('\nBuild complete.');
}

build().catch(err => {
  console.error('Build failed:', err);
  process.exit(1);
});
```

### Updated install.js Hook Registration

```javascript
// Source: GSD install.js + Claude Code settings format
// Add to existing install.js, after statusline configuration

// Configure SessionStart hooks (logging + update check)
if (!settings.hooks) {
  settings.hooks = {};
}
if (!settings.hooks.SessionStart) {
  settings.hooks.SessionStart = [];
}

// Check if GSD hooks already registered
const hasGsdLogInit = settings.hooks.SessionStart.some(entry =>
  entry.hooks?.some(h => h.command?.includes('gsd-log-init'))
);
const hasGsdUpdateHook = settings.hooks.SessionStart.some(entry =>
  entry.hooks?.some(h => h.command?.includes('gsd-check-update'))
);

// Add logging init hook (runs first)
if (!hasGsdLogInit) {
  const logInitCommand = isGlobal
    ? buildHookCommand(targetDir, 'gsd-log-init.js')
    : 'node ' + dirName + '/hooks/gsd-log-init.js';

  settings.hooks.SessionStart.unshift({  // unshift to run first
    hooks: [{
      type: 'command',
      command: logInitCommand
    }]
  });
  console.log(`  ${green}+${reset} Configured logging hook`);
}

// Add update check hook (existing code, runs after logging init)
if (!hasGsdUpdateHook) {
  // ... existing update check registration ...
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Copy hooks to dist | Bundle with esbuild | This phase | Logger modules included in distribution |
| No session logging | SessionStart hook | This phase | Full session observability |
| Silent hooks | Hooks with logging | This phase | Debug capability for all hook operations |

**Deprecated/outdated:**
- Direct file copy without bundling: Won't work for hooks that import logger modules
- Manual session ID generation: Use Claude Code's session_id instead

## Open Questions

Things that couldn't be fully resolved:

1. **Hook execution order within SessionStart**
   - What we know: Multiple SessionStart hooks run in parallel
   - What's unclear: Whether gsd-log-init completes before gsd-check-update starts
   - Recommendation: Use unshift() to add log-init first; design hooks to handle uninitialized logger gracefully

2. **Logger access in background child processes**
   - What we know: spawn() creates separate Node process without shared state
   - What's unclear: Best pattern for logging from background update check
   - Recommendation: Skip logging in background child; the spawning parent can log the spawn event

3. **Bundle size impact**
   - What we know: Logger adds ~5-10KB unbundled
   - What's unclear: Exact bundled size with minification
   - Recommendation: Measure after implementation; target < 10KB per hook

## Sources

### Primary (HIGH confidence)
- [Claude Code hooks documentation](https://code.claude.com/docs/en/hooks) - Complete hook lifecycle, input/output format, settings.json structure
- [Claude Code settings documentation](https://code.claude.com/docs/en/settings) - settings.json location and format
- [esbuild API documentation](https://esbuild.github.io/api/) - Bundling configuration options

### Secondary (MEDIUM confidence)
- GSD codebase analysis - Existing hooks/install.js patterns, build-hooks.js structure
- Phase 1 research - Logger module API and configuration

### Tertiary (LOW confidence)
- Community patterns for esbuild Node.js bundling (multiple blog sources)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Node.js built-ins, esbuild already in project
- Architecture: HIGH - Claude Code hooks well-documented, patterns clear from existing code
- Pitfalls: HIGH - Based on official docs and code analysis

**Research date:** 2026-01-28
**Valid until:** 2026-02-28 (30 days - Claude Code hooks API stable, esbuild stable)
