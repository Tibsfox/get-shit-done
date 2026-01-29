/**
 * RFC 5424 Syslog Transport for GSD
 *
 * Implements zero-dependency syslog client using Node.js standard library.
 * Sends structured logs to local syslog daemon or remote syslog server.
 *
 * Requirements:
 * - SYSLOG-01: RFC 5424 compliance
 * - SYSLOG-02: LOCAL0-LOCAL7 facilities
 * - SYSLOG-03: Level to severity mapping
 * - SYSLOG-04: Unix socket transport
 * - SYSLOG-05: UDP transport
 * - SYSLOG-06: Silent failure (logging errors never crash GSD)
 */

const os = require('node:os');

/**
 * Syslog facility codes (RFC 5424 Section 6.2.1)
 * LOCAL0-LOCAL7 are reserved for local use
 */
const FACILITY = {
  LOCAL0: 16,
  LOCAL1: 17,
  LOCAL2: 18,
  LOCAL3: 19,
  LOCAL4: 20,
  LOCAL5: 21,
  LOCAL6: 22,
  LOCAL7: 23
};

/**
 * Syslog severity codes (RFC 5424 Section 6.2.1)
 */
const SEVERITY = {
  EMERGENCY: 0,  // System is unusable
  ALERT: 1,      // Action must be taken immediately
  CRITICAL: 2,   // Critical conditions
  ERROR: 3,      // Error conditions
  WARNING: 4,    // Warning conditions
  NOTICE: 5,     // Normal but significant condition
  INFO: 6,       // Informational messages
  DEBUG: 7       // Debug-level messages
};

/**
 * GSD log level to syslog severity mapping
 * GSD levels: 0=OFF, 1=ERROR, 2=WARN, 3=INFO, 4=DEBUG, 5=TRACE
 */
const GSD_TO_SEVERITY = {
  0: null,           // OFF - no logging
  1: SEVERITY.ERROR,    // ERROR -> 3
  2: SEVERITY.WARNING,  // WARN -> 4
  3: SEVERITY.INFO,     // INFO -> 6
  4: SEVERITY.DEBUG,    // DEBUG -> 7
  5: SEVERITY.DEBUG     // TRACE -> 7 (syslog has no TRACE level)
};

/**
 * Escape structured data values per RFC 5424
 * Must escape: " (double-quote), \ (backslash), ] (right bracket)
 *
 * @param {string} value - Value to escape
 * @returns {string} Escaped value
 */
function escapeSDValue(value) {
  return String(value).replace(/[\\"\]]/g, '\\$&');
}

/**
 * Format RFC 5424 compliant syslog message
 *
 * Message format:
 * <PRI>VERSION TIMESTAMP HOSTNAME APP-NAME PROCID MSGID STRUCTURED-DATA MSG
 *
 * @param {number} facility - Facility code (16-23)
 * @param {number} severity - Severity code (0-7)
 * @param {string} appName - Application name
 * @param {string} message - Log message
 * @param {Object} structuredData - Structured data key-value pairs
 * @returns {string} RFC 5424 formatted message
 */
function formatMessage(facility, severity, appName, message, structuredData) {
  // Calculate priority: PRI = (Facility * 8) + Severity
  const pri = (facility * 8) + severity;

  // RFC 5424 version (always 1)
  const version = 1;

  // ISO 8601 timestamp with milliseconds
  const timestamp = new Date().toISOString();

  // Hostname from OS
  const hostname = os.hostname();

  // Process ID
  const procid = process.pid;

  // Message ID (NILVALUE for GSD)
  const msgid = '-';

  // Format structured data
  let sd = '-'; // NILVALUE if no structured data
  if (structuredData && typeof structuredData === 'object') {
    const params = Object.entries(structuredData)
      .filter(([_, v]) => v != null) // Skip null/undefined values
      .map(([k, v]) => `${k}="${escapeSDValue(v)}"`)
      .join(' ');

    if (params.length > 0) {
      // Use enterprise ID @0 for local use (gsd@0)
      sd = `[gsd@0 ${params}]`;
    }
  }

  // Assemble complete message
  return `<${pri}>${version} ${timestamp} ${hostname} ${appName} ${procid} ${msgid} ${sd} ${message}`;
}

module.exports = {
  FACILITY,
  SEVERITY,
  GSD_TO_SEVERITY,
  formatMessage,
  escapeSDValue
};
