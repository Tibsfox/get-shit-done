/**
 * GSD Logger - Core logging interface
 *
 * Integrates config loading, syslog transport, and session tracking
 * into a unified logging API with level-based methods.
 *
 * Requirements Coverage:
 * - LEVEL-01: Level 0 (OFF) short-circuits immediately
 * - LEVEL-02: Level 1 (ERROR) logs errors only
 * - LEVEL-03: Level 2 (WARN) logs warnings and errors
 * - LEVEL-04: Level 3 (INFO) logs info, warnings, and errors
 * - LEVEL-05: Level 4 (DEBUG) logs debug and all above
 * - LEVEL-06: Level 5 (TRACE) logs everything
 * - TRACE-01: Session ID generation via crypto.randomUUID
 * - TRACE-02: Child loggers inherit parent session ID
 * - TRACE-03: Session ID included in all log entries
 * - TRACE-04: Correlation ID support via context
 *
 * @module logger
 */

const { randomUUID } = require('node:crypto');
const { loadConfig, LEVELS, LEVEL_NAMES } = require('./logger-config');
const { SyslogTransport, GSD_TO_SEVERITY, FACILITY } = require('./logger-syslog');

/**
 * Logger class provides level-based logging with session tracking
 *
 * Implements singleton pattern via lib/index.js factory.
 * Each logger instance has:
 * - Unique session ID for operation correlation (TRACE-01)
 * - Configurable log level (0-5)
 * - Category for source identification
 * - Optional syslog transport
 * - Console output for development
 *
 * @class Logger
 */
class Logger {
  /**
   * Create a Logger instance
   *
   * @param {Object} [options={}] - Logger options
   * @param {Object} [options.config] - Configuration object (or loads via loadConfig)
   * @param {string} [options.category='gsd'] - Logger category
   * @param {string} [options.sessionId] - Session ID (or generates new UUID)
   * @param {SyslogTransport} [options.transport] - Shared transport (for child loggers)
   */
  constructor(options = {}) {
    // Load or use provided config
    this._config = options.config || loadConfig();

    // Set internal properties with underscores (accessed via getters/setters)
    this._level = this._config.level;
    this._category = options.category || 'gsd';
    this._sessionId = options.sessionId || randomUUID();

    // Create or share transport
    this._transport = options.transport || this._createTransport();

    // Console output flag (for development)
    this._console = this._config.console || false;
  }

  /**
   * Create syslog transport based on config
   *
   * @private
   * @returns {SyslogTransport|null} Transport instance or null if disabled
   */
  _createTransport() {
    // Check if syslog is disabled
    if (!this._config.syslog || !this._config.syslog.enabled) {
      return null;
    }

    // Get facility code from config (default LOCAL0)
    const facilityName = this._config.syslog.facility || 'LOCAL0';
    const facility = FACILITY[facilityName] || FACILITY.LOCAL0;

    // Create transport with config
    return new SyslogTransport({
      mode: this._config.syslog.mode || 'unix',
      facility: facility,
      appName: 'gsd',
      fallbackToUdp: this._config.syslog.fallbackToUdp || false
    });
  }

  /**
   * Check if a message at given level should be logged
   *
   * Implements LEVEL-01: Level 0 (OFF) short-circuits immediately
   *
   * @private
   * @param {number} level - Log level to check (0-5)
   * @returns {boolean} True if message should be logged
   */
  _shouldLog(level) {
    // OFF level - never log anything
    if (this._level === 0) {
      return false;
    }

    // Level too verbose for current setting
    if (level > this._level) {
      return false;
    }

    return true;
  }

  /**
   * Internal log method - formats and sends to transport
   *
   * Implements:
   * - TRACE-03: Session ID in all entries
   * - TRACE-04: Correlation ID support via context
   *
   * @private
   * @param {number} level - GSD log level (0-5)
   * @param {string} message - Log message
   * @param {Object} [context={}] - Additional structured data
   */
  _log(level, message, context = {}) {
    // Short-circuit check
    if (!this._shouldLog(level)) {
      return;
    }

    // Build structured data with session and category
    const structuredData = {
      session: this._sessionId,
      category: this._category,
      level: LEVEL_NAMES[level],
      ...context
    };

    // Get syslog severity mapping
    const severity = GSD_TO_SEVERITY[level];

    // Send to syslog transport if available and severity is not null
    if (this._transport && severity !== null) {
      this._transport.send(severity, message, structuredData);
    }

    // Also log to console if enabled (for development)
    if (this._console) {
      const timestamp = new Date().toISOString();
      const levelName = LEVEL_NAMES[level];
      const contextStr = Object.keys(context).length > 0 ? ` ${JSON.stringify(context)}` : '';
      console.log(`[${timestamp}] [${levelName}] [${this._category}] ${message}${contextStr}`);
    }
  }

  /**
   * Log ERROR level message (level 1)
   *
   * @param {string} message - Error message
   * @param {Object} [context={}] - Additional context
   */
  error(message, context = {}) {
    this._log(LEVELS.ERROR, message, context);
  }

  /**
   * Log WARN level message (level 2)
   *
   * @param {string} message - Warning message
   * @param {Object} [context={}] - Additional context
   */
  warn(message, context = {}) {
    this._log(LEVELS.WARN, message, context);
  }

  /**
   * Log INFO level message (level 3)
   *
   * @param {string} message - Info message
   * @param {Object} [context={}] - Additional context
   */
  info(message, context = {}) {
    this._log(LEVELS.INFO, message, context);
  }

  /**
   * Log DEBUG level message (level 4)
   *
   * @param {string} message - Debug message
   * @param {Object} [context={}] - Additional context
   */
  debug(message, context = {}) {
    this._log(LEVELS.DEBUG, message, context);
  }

  /**
   * Log TRACE level message (level 5)
   *
   * @param {string} message - Trace message
   * @param {Object} [context={}] - Additional context
   */
  trace(message, context = {}) {
    this._log(LEVELS.TRACE, message, context);
  }

  /**
   * Generic log method - accepts level as number or string
   *
   * @param {number|string} level - Log level (0-5 or 'ERROR', 'WARN', etc.)
   * @param {string} message - Log message
   * @param {Object} [context={}] - Additional context
   */
  log(level, message, context = {}) {
    // Convert string level to number
    let numericLevel = level;
    if (typeof level === 'string') {
      const upperLevel = level.toUpperCase();
      numericLevel = LEVELS[upperLevel];
      if (numericLevel === undefined) {
        // Invalid level name - default to INFO
        numericLevel = LEVELS.INFO;
      }
    }

    this._log(numericLevel, message, context);
  }

  /**
   * Create a child logger with same session but different category
   *
   * Implements TRACE-02: Child loggers inherit parent session ID
   *
   * @param {string} category - Category for child logger
   * @returns {Logger} New logger instance with shared session
   */
  child(category) {
    return new Logger({
      config: this._config,      // Share config (by reference)
      sessionId: this._sessionId, // Inherit session ID
      category: category,         // New category
      transport: this._transport  // Share transport instance
    });
  }

  /**
   * Get session ID
   *
   * @returns {string} Session UUID
   */
  get sessionId() {
    return this._sessionId;
  }

  /**
   * Get current log level
   *
   * @returns {number} Log level (0-5)
   */
  get level() {
    return this._level;
  }

  /**
   * Set log level (allows runtime changes)
   *
   * @param {number} value - New log level (0-5)
   */
  set level(value) {
    this._level = value;
  }

  /**
   * Check if logging is completely disabled
   *
   * @returns {boolean} True if level is OFF (0)
   */
  get isOff() {
    return this._level === 0;
  }

  /**
   * Check if logging is enabled
   *
   * @returns {boolean} True if level > 0
   */
  get isEnabled() {
    return this._level > 0;
  }

  /**
   * Get current category
   *
   * @returns {string} Logger category
   */
  get category() {
    return this._category;
  }

  /**
   * Set log level (method alternative to setter)
   *
   * @param {number|string} level - New log level (number or string)
   */
  setLevel(level) {
    // Use parseLevel for string conversion if needed
    if (typeof level === 'string') {
      const { parseLevel } = require('./logger-config');
      const parsed = parseLevel(level);
      if (parsed !== null) {
        this._level = parsed;
      }
    } else if (typeof level === 'number') {
      this._level = level;
    }
  }

  /**
   * Get copy of current configuration (for debugging)
   *
   * @returns {Object} Configuration object (copy)
   */
  getConfig() {
    return { ...this._config };
  }
}

module.exports = Logger;
