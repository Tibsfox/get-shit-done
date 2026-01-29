/**
 * Performance measurement utilities for GSD logging
 *
 * Provides high-resolution timing and statistical aggregation for measuring
 * GSD operation performance with zero external dependencies.
 *
 * Requirements Coverage:
 * - TIME-01: ISO 8601 timestamps (via Date.toISOString() integration)
 * - TIME-02: High-resolution timing via process.hrtime.bigint
 * - TIME-03: Duration tracking for operations
 * - TIME-04: Threshold warnings
 * - TIME-05: Metrics aggregation with percentiles
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

/**
 * Wrap an async function with timing measurement.
 *
 * Automatically starts a timer, executes the function, and returns both
 * the result and elapsed time. Handles errors gracefully.
 *
 * @param {string} name - Timer name
 * @param {Function} fn - Async function to time
 * @param {Object} [options={}] - Timer options
 * @returns {Promise<Object>} Object with result/error and elapsed time
 * @returns {*} result - Function result (if successful)
 * @returns {Error} error - Error object (if failed)
 * @returns {Object} elapsed - Elapsed time object
 *
 * @example
 * const { result, elapsed } = await time('fetchData', async () => {
 *   return await fetch('/api/data');
 * });
 * console.log(`Fetch took ${elapsed.milliseconds}ms`);
 */
async function time(name, fn, options = {}) {
  const timer = createTimer(name, options);
  try {
    const result = await fn();
    return { result, elapsed: timer.stop() };
  } catch (error) {
    return { error, elapsed: timer.stop() };
  }
}

/**
 * Metrics aggregator for statistical analysis of operation performance.
 *
 * Implements TIME-05: Metrics aggregation with percentiles
 *
 * Tracks min, max, mean, and percentiles for named metrics.
 *
 * @class Metrics
 */
class Metrics {
  /**
   * Create a new metrics aggregator.
   */
  constructor() {
    this.data = new Map(); // name -> array of values
  }

  /**
   * Record a value for a named metric.
   *
   * @param {string} name - Metric name
   * @param {number} value - Value to record
   */
  record(name, value) {
    if (!this.data.has(name)) {
      this.data.set(name, []);
    }
    this.data.get(name).push(value);
  }

  /**
   * Get statistics for a named metric.
   *
   * @param {string} name - Metric name
   * @returns {Object|null} Statistics object or null if not found
   * @returns {number} count - Number of recorded values
   * @returns {number} sum - Total of all values
   * @returns {number} min - Minimum value
   * @returns {number} max - Maximum value
   * @returns {number} mean - Average (sum / count)
   * @returns {Array<number>} values - Raw array (for percentile calculation)
   */
  get(name) {
    const values = this.data.get(name);
    if (!values || values.length === 0) {
      return null;
    }

    const sum = values.reduce((a, b) => a + b, 0);
    const count = values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const mean = sum / count;

    return {
      count,
      sum,
      min,
      max,
      mean,
      values
    };
  }

  /**
   * Calculate percentile for a named metric.
   *
   * Uses linear interpolation for non-integer positions.
   *
   * @param {string} name - Metric name
   * @param {number} p - Percentile (0-100)
   * @returns {number|null} Percentile value or null if not found
   */
  percentile(name, p) {
    const values = this.data.get(name);
    if (!values || values.length === 0) {
      return null;
    }

    // Sort values in ascending order
    const sorted = [...values].sort((a, b) => a - b);
    const position = (p / 100) * (sorted.length - 1);

    // Linear interpolation for non-integer positions
    const lower = Math.floor(position);
    const upper = Math.ceil(position);
    const weight = position - lower;

    if (lower === upper) {
      return sorted[lower];
    }

    return sorted[lower] * (1 - weight) + sorted[upper] * weight;
  }

  /**
   * Get comprehensive summary with common percentiles.
   *
   * @param {string} name - Metric name
   * @returns {Object|null} Summary object or null if not found
   * @returns {number} count - Number of values
   * @returns {number} min - Minimum value
   * @returns {number} max - Maximum value
   * @returns {number} mean - Average value
   * @returns {number} p50 - 50th percentile (median)
   * @returns {number} p95 - 95th percentile
   * @returns {number} p99 - 99th percentile
   */
  summary(name) {
    const stats = this.get(name);
    if (!stats) {
      return null;
    }

    return {
      count: stats.count,
      min: stats.min,
      max: stats.max,
      mean: stats.mean,
      p50: this.percentile(name, 50),
      p95: this.percentile(name, 95),
      p99: this.percentile(name, 99)
    };
  }

  /**
   * Reset metrics data.
   *
   * @param {string} [name] - Metric name to reset, or all if not provided
   */
  reset(name) {
    if (name) {
      this.data.delete(name);
    } else {
      this.data.clear();
    }
  }

  /**
   * Get all metrics summaries.
   *
   * @returns {Map<string, Object>} Map of metric names to their summaries
   */
  all() {
    const result = new Map();
    for (const name of this.data.keys()) {
      result.set(name, this.summary(name));
    }
    return result;
  }
}

module.exports = {
  Timer,
  Metrics,
  createTimer,
  time
};
