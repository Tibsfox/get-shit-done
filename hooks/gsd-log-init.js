#!/usr/bin/env node
/**
 * GSD Session Logger Initialization
 *
 * Called by SessionStart hook - initializes logger with Claude's session context.
 *
 * Claude Code passes session data via stdin as JSON:
 * {
 *   "session_id": "abc123",
 *   "model": "claude-sonnet-4-5-20250929",
 *   "cwd": "/path/to/workspace",
 *   "source": "startup|resume|clear|compact",
 *   "permission_mode": "normal|unrestricted"
 * }
 *
 * Behavior:
 * - Always exits with code 0 (logging failures must never block Claude Code)
 * - Silent failure on errors (no stderr output)
 * - Uses Claude's session_id for perfect correlation across all GSD operations
 * - Logs to syslog via singleton logger instance
 */

const { createLogger } = require('../lib');

let input = '';

// Read JSON from stdin
process.stdin.setEncoding('utf8');

process.stdin.on('data', chunk => {
  input += chunk;
});

process.stdin.on('end', () => {
  try {
    const data = JSON.parse(input);

    // Initialize singleton logger with Claude Code's session ID
    const logger = createLogger({
      sessionId: data.session_id,  // Use Claude's session ID for correlation
      category: 'gsd.session'
    });

    // Log session initialization at INFO level
    logger.info('GSD session initialized', {
      model: data.model || 'unknown',
      workspace: data.cwd,
      source: data.source,  // 'startup', 'resume', 'clear', 'compact'
      permissionMode: data.permission_mode
    });

  } catch (e) {
    // Silent failure - logging should never break GSD
    // Exit 0 regardless - don't block Claude Code
  }

  // Always exit 0 - logging failures shouldn't block session
  process.exit(0);
});
