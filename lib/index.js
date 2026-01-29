/**
 * GSD Logging Public API
 *
 * This is the primary entry point for GSD logging functionality.
 * Provides singleton logger instance management and convenience functions.
 *
 * Usage:
 *
 * 1. Singleton access (recommended for most use cases):
 *    const log = require('./lib');
 *    log.info('Application started');
 *    log.error('Something failed', { code: 500 });
 *
 * 2. Get logger instance:
 *    const logger = require('./lib').getLogger();
 *    logger.info('Using instance methods');
 *
 * 3. Create custom logger instances:
 *    const { Logger } = require('./lib');
 *    const custom = new Logger({ category: 'api' });
 *
 * 4. Child loggers for subsystems:
 *    const logger = require('./lib').getLogger();
 *    const apiLogger = logger.child('api');
 *    const dbLogger = logger.child('database');
 *
 * @module index
 */

const Logger = require('./logger');
const { LEVELS, LEVEL_NAMES } = require('./logger-config');
const { Timer, Metrics, createTimer, time } = require('./logger-metrics');

/**
 * Singleton logger instance
 * @private
 */
let instance = null;

/**
 * Create the singleton logger instance
 *
 * Only creates instance on first call. Subsequent calls return existing instance.
 *
 * @param {Object} [options={}] - Logger options (only used on first call)
 * @returns {Logger} Singleton logger instance
 */
function createLogger(options = {}) {
  if (!instance) {
    instance = new Logger(options);
  }
  return instance;
}

/**
 * Get the singleton logger instance
 *
 * Creates instance with defaults if not yet created.
 *
 * @returns {Logger} Singleton logger instance
 */
function getLogger() {
  return instance || createLogger();
}

/**
 * Reset singleton logger instance
 *
 * Primarily for testing - allows creating fresh logger with new config.
 * Production code should rarely need this.
 *
 * @private
 */
function resetLogger() {
  instance = null;
}

/**
 * Generic log function using singleton
 *
 * @param {number|string} level - Log level (0-5 or 'ERROR', 'WARN', etc.)
 * @param {string} message - Log message
 * @param {Object} [context={}] - Additional context
 */
const log = (level, message, context) => getLogger().log(level, message, context);

/**
 * Log ERROR level message using singleton
 *
 * @param {string} message - Error message
 * @param {Object} [context={}] - Additional context
 */
const error = (message, context) => getLogger().error(message, context);

/**
 * Log WARN level message using singleton
 *
 * @param {string} message - Warning message
 * @param {Object} [context={}] - Additional context
 */
const warn = (message, context) => getLogger().warn(message, context);

/**
 * Log INFO level message using singleton
 *
 * @param {string} message - Info message
 * @param {Object} [context={}] - Additional context
 */
const info = (message, context) => getLogger().info(message, context);

/**
 * Log DEBUG level message using singleton
 *
 * @param {string} message - Debug message
 * @param {Object} [context={}] - Additional context
 */
const debug = (message, context) => getLogger().debug(message, context);

/**
 * Log TRACE level message using singleton
 *
 * @param {string} message - Trace message
 * @param {Object} [context={}] - Additional context
 */
const trace = (message, context) => getLogger().trace(message, context);

/**
 * Public API exports
 *
 * Singleton management:
 * - createLogger: Create/get singleton with options
 * - getLogger: Get singleton instance
 * - resetLogger: Reset singleton (testing)
 *
 * Convenience functions:
 * - log: Generic log function
 * - error, warn, info, debug, trace: Level-specific functions
 *
 * Classes (for advanced use):
 * - Logger: Logger class for custom instances
 * - Timer: High-resolution timer
 * - Metrics: Performance metrics aggregator
 * - createTimer: Timer factory
 * - time: Async function timing wrapper
 *
 * Constants:
 * - LEVELS: Log level constants (OFF=0, ERROR=1, etc.)
 * - LEVEL_NAMES: Level names array
 */
module.exports = {
  // Singleton management
  createLogger,
  getLogger,
  resetLogger,

  // Convenience functions
  log,
  error,
  warn,
  info,
  debug,
  trace,

  // Classes (for advanced use)
  Logger,
  Timer,
  Metrics,
  createTimer,
  time,

  // Constants
  LEVELS,
  LEVEL_NAMES
};
