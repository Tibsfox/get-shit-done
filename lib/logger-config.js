/**
 * GSD Logger Configuration Module
 *
 * Provides configuration loading with precedence (env > project > global > defaults)
 * and utility functions for parsing log levels and boolean values.
 *
 * Requirements covered:
 * - CONFIG-01: Project config (.planning/config.json)
 * - CONFIG-02: Global config (~/.claude/gsd-config.json)
 * - CONFIG-03: Environment overrides
 * - CONFIG-04: Sensible defaults
 * - CONFIG-05: Config precedence
 */

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

/**
 * Log level constants (0-5)
 */
const LEVELS = {
  OFF: 0,
  ERROR: 1,
  WARN: 2,
  INFO: 3,
  DEBUG: 4,
  TRACE: 5
};

/**
 * Level names array (indexed by level number)
 */
const LEVEL_NAMES = ['OFF', 'ERROR', 'WARN', 'INFO', 'DEBUG', 'TRACE'];

/**
 * Default configuration
 */
const DEFAULTS = {
  level: 3, // INFO
  syslog: {
    enabled: true,
    facility: 'LOCAL0',
    mode: 'unix'
  },
  file: {
    enabled: false
  }
};

/**
 * Parse a log level value from various input types
 *
 * @param {string|number} value - The value to parse (e.g., 'error', 'ERROR', 3, '3')
 * @returns {number|null} - The numeric level (0-5) or null if invalid/undefined
 */
function parseLevel(value) {
  if (value === null || value === undefined) {
    return null;
  }

  // Handle numeric input
  if (typeof value === 'number') {
    // Clamp to valid range 0-5
    return Math.max(0, Math.min(5, value));
  }

  // Handle string input
  if (typeof value === 'string') {
    // Try parsing as number first
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue)) {
      return Math.max(0, Math.min(5, numValue));
    }

    // Try parsing as level name (case-insensitive)
    const upperValue = value.toUpperCase();
    if (upperValue in LEVELS) {
      return LEVELS[upperValue];
    }
  }

  // Invalid input
  return null;
}

/**
 * Parse a boolean value from various input types
 *
 * @param {string|number|boolean} value - The value to parse
 * @returns {boolean|null} - The boolean value or null if invalid/undefined
 */
function parseBool(value) {
  if (value === null || value === undefined) {
    return null;
  }

  // Handle boolean input
  if (typeof value === 'boolean') {
    return value;
  }

  // Handle numeric input
  if (typeof value === 'number') {
    return value === 1;
  }

  // Handle string input (case-insensitive)
  if (typeof value === 'string') {
    const lower = value.toLowerCase();
    if (lower === 'true' || lower === '1') {
      return true;
    }
    if (lower === 'false' || lower === '0') {
      return false;
    }
  }

  // Invalid input
  return null;
}

/**
 * Safely read and parse a JSON file
 *
 * @param {string} filepath - Absolute path to JSON file
 * @returns {object|null} - Parsed JSON object or null on error
 */
function safeReadJson(filepath) {
  try {
    if (fs.existsSync(filepath)) {
      const content = fs.readFileSync(filepath, 'utf8');
      return JSON.parse(content);
    }
  } catch (e) {
    // Silent failure - config errors shouldn't break GSD
  }
  return null;
}

/**
 * Deep merge objects with later objects overriding earlier ones
 *
 * @param {...object} objects - Objects to merge
 * @returns {object} - Merged object
 */
function deepMerge(...objects) {
  const result = {};

  for (const obj of objects) {
    if (!obj || typeof obj !== 'object') continue;

    for (const key in obj) {
      if (!obj.hasOwnProperty(key)) continue;

      const value = obj[key];

      // Skip undefined values
      if (value === undefined) continue;

      // Recursively merge nested objects
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        result[key] = deepMerge(result[key] || {}, value);
      } else {
        result[key] = value;
      }
    }
  }

  return result;
}

/**
 * Load configuration with precedence: env > project > global > defaults
 *
 * @returns {object} - Merged configuration object
 */
function loadConfig() {
  // Start with defaults
  const config = { ...DEFAULTS };

  // Load global config: ~/.claude/gsd-config.json
  const globalPath = path.join(os.homedir(), '.claude', 'gsd-config.json');
  const globalData = safeReadJson(globalPath);
  const globalConfig = globalData?.logging || {};

  // Load project config: .planning/config.json
  const projectPath = path.join(process.cwd(), '.planning', 'config.json');
  const projectData = safeReadJson(projectPath);
  const projectConfig = projectData?.logging || {};

  // Build environment config
  const envConfig = {};

  if (process.env.GSD_LOG_LEVEL !== undefined) {
    const level = parseLevel(process.env.GSD_LOG_LEVEL);
    if (level !== null) {
      envConfig.level = level;
    }
  }

  if (process.env.GSD_LOG_SYSLOG !== undefined) {
    const enabled = parseBool(process.env.GSD_LOG_SYSLOG);
    if (enabled !== null) {
      envConfig.syslog = { enabled };
    }
  }

  if (process.env.GSD_LOG_FACILITY !== undefined) {
    if (!envConfig.syslog) envConfig.syslog = {};
    envConfig.syslog.facility = process.env.GSD_LOG_FACILITY;
  }

  // Merge with precedence: defaults < global < project < env
  const merged = deepMerge(config, globalConfig, projectConfig, envConfig);

  // Normalize level to numeric value (config files may use string names)
  if (merged.level !== undefined) {
    const parsedLevel = parseLevel(merged.level);
    if (parsedLevel !== null) {
      merged.level = parsedLevel;
    }
  }

  return merged;
}

module.exports = {
  loadConfig,
  parseLevel,
  parseBool,
  LEVELS,
  LEVEL_NAMES,
  DEFAULTS
};
