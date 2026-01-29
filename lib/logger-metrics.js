/**
 * Performance measurement utilities for GSD logging
 *
 * Provides high-resolution timing and statistical aggregation for measuring
 * GSD operation performance with zero external dependencies.
 *
 * @module logger-metrics
 */

/**
 * High-resolution timer using process.hrtime.bigint() for nanosecond precision.
 *
 * Implements TIME-02: High-resolution timing via process.hrtime.bigint
 * Implements TIME-03: Duration tracking for operations
 * Implements TIME-04: Threshold warnings
 *
 * @class Timer
 */
class Timer {
  /**
   * Create a new timer. Timer starts immediately.
   *
   * @param {string} [name='unnamed'] - Name for this timer (for logging/debugging)
   * @param {Object} [options={}] - Timer options
   * @param {number} [options.threshold] - Warning threshold in milliseconds
   */
  constructor(name = 'unnamed', options = {}) {
    this.name = name;
    this.threshold = options.threshold || null; // ms, warn if exceeded
    this.start = process.hrtime.bigint();
    this.stopped = false;
    this.endTime = null;
  }

  /**
   * Get elapsed time since timer started (or until stopped).
   *
   * @returns {Object} Elapsed time in multiple units
   * @returns {BigInt} nanoseconds - Nanoseconds elapsed
   * @returns {BigInt} microseconds - Microseconds elapsed (nanos / 1000)
   * @returns {number} milliseconds - Milliseconds elapsed (for easy use)
   * @returns {number} seconds - Seconds elapsed (for display)
   */
  elapsed() {
    const end = this.stopped ? this.endTime : process.hrtime.bigint();
    const nanoseconds = end - this.start;
    const microseconds = nanoseconds / 1000n;
    const milliseconds = Number(nanoseconds) / 1_000_000;
    const seconds = milliseconds / 1000;

    return {
      nanoseconds,
      microseconds,
      milliseconds,
      seconds
    };
  }

  /**
   * Convenience method to get elapsed time in milliseconds.
   *
   * @returns {number} Milliseconds elapsed
   */
  elapsedMs() {
    return this.elapsed().milliseconds;
  }

  /**
   * Stop the timer and record end time.
   *
   * @returns {Object} Elapsed time (same as elapsed())
   */
  stop() {
    if (!this.stopped) {
      this.endTime = process.hrtime.bigint();
      this.stopped = true;
    }
    return this.elapsed();
  }

  /**
   * Check if elapsed time exceeds configured threshold.
   *
   * @returns {boolean} True if threshold exceeded
   */
  exceedsThreshold() {
    if (this.threshold === null) {
      return false;
    }
    return this.elapsedMs() > this.threshold;
  }

  /**
   * Get warning object if threshold exceeded.
   *
   * @returns {Object|null} Warning object or null if no warning
   * @returns {boolean} exceeded - Whether threshold was exceeded
   * @returns {string} name - Timer name
   * @returns {number} elapsed - Elapsed milliseconds
   * @returns {number} threshold - Configured threshold
   */
  getWarning() {
    if (!this.exceedsThreshold()) {
      return null;
    }
    return {
      exceeded: true,
      name: this.name,
      elapsed: this.elapsedMs(),
      threshold: this.threshold
    };
  }

  /**
   * String representation for logging.
   *
   * @returns {string} Human-readable timer status
   */
  toString() {
    const elapsed = this.elapsedMs().toFixed(2);
    return `Timer[${this.name}]: ${elapsed}ms`;
  }
}

/**
 * Factory function to create a new timer.
 * Provides functional API alternative to class instantiation.
 *
 * @param {string} name - Timer name
 * @param {Object} [options={}] - Timer options
 * @returns {Timer} New timer instance
 */
function createTimer(name, options = {}) {
  return new Timer(name, options);
}

module.exports = {
  Timer,
  createTimer
};
