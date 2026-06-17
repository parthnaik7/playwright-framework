/**
 * @file src/utils/Logger.ts
 * @description Structured logger wrapping Winston.
 *
 * Design decisions:
 *  - Single Responsibility: this class only logs — it does not format test reports.
 *  - Factory method `forContext()` produces child loggers with a named context so
 *    every log line shows which page/service emitted it (Open/Closed for extension).
 *  - Winston transports are configurable: Console for local dev, File for CI, both
 *    together in mixed environments.
 *  - Log level is driven by the active environment config (no magic strings).
 */

import * as winston from 'winston';
import * as path from 'path';
import * as fs from 'fs';
import type { LogLevel } from '../types/index';

// ─── Constants ────────────────────────────────────────────────────────────────

const LOG_DIR = path.resolve(process.cwd(), 'test-results', 'logs');
const LOG_FILE = path.join(LOG_DIR, 'test-run.log');
const ERROR_FILE = path.join(LOG_DIR, 'errors.log');

// ─── Custom Format ────────────────────────────────────────────────────────────

const customFormat = winston.format.printf(({ level, message, timestamp, context, ...meta }) => {
  const ctx = (context as string | undefined) ? ` [${context as string}]` : '';
  const metaStr = Object.keys(meta).length ? ` | ${JSON.stringify(meta)}` : '';
  return `${timestamp as string} [${level.toUpperCase()}]${ctx} ${message as string}${metaStr}`;
});

// ─── Logger Factory ───────────────────────────────────────────────────────────

export class Logger {
  private readonly winstonLogger: winston.Logger;
  private readonly context: string;

  public constructor(context: string = 'Framework', logLevel: LogLevel = 'info') {
    // Ensure the log directory exists before configuring file transports
    this.ensureLogDirectory();
    this.context = context;

    this.winstonLogger = winston.createLogger({
      level: logLevel,
      defaultMeta: { context },
      format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
        winston.format.errors({ stack: true }),
        winston.format.splat(),
      ),
      transports: [
        // ── Console transport (colourised for local dev) ──
        new winston.transports.Console({
          format: winston.format.combine(winston.format.colorize({ all: true }), customFormat),
        }),
        // ── File transport (JSON for structured log ingestion) ──
        new winston.transports.File({
          filename: LOG_FILE,
          format: winston.format.combine(winston.format.json()),
          maxsize: 10 * 1024 * 1024, // 10 MB
          maxFiles: 5,
          tailable: true,
        }),
        // ── Separate error file ──
        new winston.transports.File({
          filename: ERROR_FILE,
          level: 'error',
          format: winston.format.combine(winston.format.json()),
        }),
      ],
      // Prevent logger from crashing the process on uncaught exceptions
      exitOnError: false,
    });
  }

  // ─── Factory ──────────────────────────────────────────────────────────────

  /**
   * Creates a child logger bound to a named context (e.g., 'LoginPage').
   * Each page/service should call this to tag its own log output.
   */
  public static forContext(context: string, logLevel: LogLevel = 'info'): Logger {
    return new Logger(context, logLevel);
  }

  // ─── Logging methods ──────────────────────────────────────────────────────

  public debug(message: string, meta?: Record<string, unknown>): void {
    this.winstonLogger.debug(message, { context: this.context, ...meta });
  }

  public info(message: string, meta?: Record<string, unknown>): void {
    this.winstonLogger.info(message, { context: this.context, ...meta });
  }

  public warn(message: string, meta?: Record<string, unknown>): void {
    this.winstonLogger.warn(message, { context: this.context, ...meta });
  }

  public error(message: string, error?: unknown, meta?: Record<string, unknown>): void {
    if (error instanceof Error) {
      this.winstonLogger.error(message, {
        context: this.context,
        errorMessage: error.message,
        stack: error.stack,
        ...meta,
      });
    } else {
      this.winstonLogger.error(message, { context: this.context, error, ...meta });
    }
  }

  /** Logs step start — useful for Allure step grouping in test output. */
  public step(stepName: string, meta?: Record<string, unknown>): void {
    this.info(`▶ STEP: ${stepName}`, meta);
  }

  /** Logs assertion results */
  public assertion(description: string, passed: boolean): void {
    if (passed) {
      this.info(`✅ ASSERT PASS: ${description}`);
    } else {
      this.warn(`❌ ASSERT FAIL: ${description}`);
    }
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private ensureLogDirectory(): void {
    if (!fs.existsSync(LOG_DIR)) {
      fs.mkdirSync(LOG_DIR, { recursive: true });
    }
  }
}

/**
 * Module-level singleton for quick usage without constructing a Logger.
 * Prefer `Logger.forContext('MyPage')` in page objects.
 */
export const logger = new Logger('Framework');
