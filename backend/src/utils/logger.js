/**
 * Minimal structured logger.
 *
 * Usage:
 *   import logger from '../utils/logger.js';
 *   logger.info('Server started on port', PORT);
 *   logger.error('Something failed:', err.message);
 *
 * In production you can swap this out for pino / winston without touching
 * any call-site — just replace the implementations below.
 */

const LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };
const MIN_LEVEL = LEVELS[process.env.LOG_LEVEL] ?? (process.env.NODE_ENV === "production" ? LEVELS.info : LEVELS.debug);

const fmt = (level, args) => {
  const ts = new Date().toISOString();
  const prefix = `[${ts}] [${level.toUpperCase()}]`;
  // eslint-disable-next-line no-console
  console[level === "debug" || level === "info" ? "log" : level](prefix, ...args);
};

const logger = {
  debug: (...args) => LEVELS.debug >= MIN_LEVEL && fmt("debug", args),
  info:  (...args) => LEVELS.info  >= MIN_LEVEL && fmt("info",  args),
  warn:  (...args) => LEVELS.warn  >= MIN_LEVEL && fmt("warn",  args),
  error: (...args) => LEVELS.error >= MIN_LEVEL && fmt("error", args),
};

export default logger;
