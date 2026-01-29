/**
 * RFC 5424 Syslog Transport for GSD
 *
 * Implements zero-dependency syslog client using Node.js standard library.
 * Sends structured logs to local syslog daemon or remote syslog server.
 *
 * Requirements Coverage:
 * - SYSLOG-01: RFC 5424 compliance
 *   - PRI calculation: (Facility * 8) + Severity
 *   - VERSION 1 messages
 *   - ISO 8601 timestamps
 *   - Structured data with enterprise ID (gsd@0)
 *   - Proper escaping of SD-PARAM values
 *
 * - SYSLOG-02: LOCAL0-LOCAL7 facilities
 *   - FACILITY object exports codes 16-23
 *   - Configurable facility per transport instance
 *
 * - SYSLOG-03: Level to severity mapping
 *   - GSD_TO_SEVERITY maps GSD levels (0-5) to syslog severity (0-7)
 *   - Level 0 (OFF) maps to null (no logging)
 *
 * - SYSLOG-04: Unix socket transport
 *   - Uses net.createConnection with Unix domain socket
 *   - Platform-aware paths: /dev/log (Linux), /var/run/syslog (macOS)
 *   - Per-message connections (no pooling)
 *
 * - SYSLOG-05: UDP transport
 *   - Uses dgram.createSocket for UDP/IPv4
 *   - Configurable host:port (default 127.0.0.1:514)
 *   - Fire-and-forget delivery
 *
 * - SYSLOG-06: Silent failure
 *   - All errors caught and swallowed
 *   - Handles ENOENT, ECONNREFUSED, EPERM explicitly
 *   - Optional fallback from Unix to UDP
 *   - Logging errors never throw or crash GSD
 */

const os = require('node:os');
const net = require('node:net');
const dgram = require('node:dgram');

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

/**
 * Syslog Transport
 *
 * Sends RFC 5424 formatted messages to syslog daemon via Unix socket or UDP.
 * Implements SYSLOG-04 (Unix socket) and SYSLOG-05 (UDP transport).
 * All errors are caught and swallowed per SYSLOG-06 (silent failure).
 */
class SyslogTransport {
  /**
   * Create a syslog transport
   *
   * @param {Object} config - Configuration options
   * @param {string} config.mode - Transport mode: 'unix' or 'udp' (default: 'unix')
   * @param {number} config.facility - Syslog facility code (default: LOCAL0)
   * @param {string} config.appName - Application name (default: 'gsd')
   * @param {string} config.path - Unix socket path (default: platform-specific)
   * @param {string} config.host - UDP host (default: '127.0.0.1')
   * @param {number} config.port - UDP port (default: 514)
   * @param {boolean} config.fallbackToUdp - Fall back to UDP if Unix socket fails (default: false)
   */
  constructor(config = {}) {
    this.mode = config.mode || 'unix';
    this.facility = config.facility || FACILITY.LOCAL0;
    this.appName = config.appName || 'gsd';

    // Platform-aware socket path
    // Linux: /dev/log
    // macOS: /var/run/syslog
    this.path = config.path || (process.platform === 'darwin' ? '/var/run/syslog' : '/dev/log');

    this.host = config.host || '127.0.0.1';
    this.port = config.port || 514;
    this.fallbackToUdp = config.fallbackToUdp || false;
  }

  /**
   * Send message via Unix domain socket
   * Silent failure on all errors per SYSLOG-06
   * Handles ENOENT (socket doesn't exist), ECONNREFUSED (syslog not running),
   * and EPERM (permission denied)
   *
   * @private
   * @param {string} message - Formatted syslog message
   */
  _sendUnix(message) {
    try {
      const socket = net.createConnection({ path: this.path });

      socket.on('error', (err) => {
        // Handle specific connection errors
        if (err.code === 'ENOENT' || err.code === 'ECONNREFUSED' || err.code === 'EPERM') {
          // Unix socket unavailable - try UDP fallback if configured
          if (this.fallbackToUdp) {
            this._sendUdp(message);
          }
        }
        // Always destroy socket, silent failure
        socket.destroy();
      });

      socket.on('connect', () => {
        socket.write(message + '\n');
        socket.end();
      });
    } catch (err) {
      // Silent failure - never throw from logging code
      // Try UDP fallback if configured
      if (this.fallbackToUdp) {
        try {
          this._sendUdp(message);
        } catch (fallbackErr) {
          // Ultimate silent failure
        }
      }
    }
  }

  /**
   * Send message via UDP
   * Silent failure on all errors per SYSLOG-06
   *
   * @private
   * @param {string} message - Formatted syslog message
   */
  _sendUdp(message) {
    try {
      const client = dgram.createSocket('udp4');
      const buffer = Buffer.from(message);

      client.send(buffer, 0, buffer.length, this.port, this.host, (err) => {
        // Close socket in callback, ignore errors
        client.close();
      });
    } catch (err) {
      // Silent failure - never throw from logging code
    }
  }

  /**
   * Send a log message to syslog
   *
   * @param {number|null} severity - Syslog severity code (0-7) or null for OFF
   * @param {string} message - Log message
   * @param {Object} structuredData - Optional structured data key-value pairs
   */
  send(severity, message, structuredData) {
    // Early return for OFF level (null severity)
    if (severity === null) {
      return;
    }

    try {
      // Format RFC 5424 message
      const formattedMessage = formatMessage(
        this.facility,
        severity,
        this.appName,
        message,
        structuredData
      );

      // Send via configured transport
      if (this.mode === 'unix') {
        this._sendUnix(formattedMessage);
      } else {
        this._sendUdp(formattedMessage);
      }
    } catch (err) {
      // Silent failure - logging must never crash GSD
    }
  }

  /**
   * Close the transport
   * No-op for now since connections are per-message
   * Placeholder for future connection pooling
   */
  close() {
    // No-op - connections are opened per message and immediately closed
    // Future: close persistent connections if connection pooling is added
  }
}

module.exports = {
  SyslogTransport,
  FACILITY,
  SEVERITY,
  GSD_TO_SEVERITY,
  formatMessage,
  escapeSDValue
};
