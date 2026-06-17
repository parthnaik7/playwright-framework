/**
 * @file src/helpers/EnvironmentManager.ts
 * @description Singleton that loads and exposes the active environment configuration.
 *
 * Design decisions:
 *  - Singleton (only one env config per process) — avoids inconsistent reads.
 *  - Lazy initialisation via `getInstance()` — follows the Singleton pattern from GoF.
 *  - `dotenv` is loaded with the env-specific file (.env.dev / .env.qa / .env.prod)
 *    so the same codebase can target any environment with a single CLI flag.
 *  - All numeric / boolean values are explicitly parsed; raw process.env strings
 *    are never leaked into the rest of the framework (strong typing, SOLID ISP).
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import type { IEnvironmentConfig, Environment, BrowserType, LogLevel } from '../types/index';

export class EnvironmentManager {
  private static instance: EnvironmentManager | null = null;
  private readonly config: IEnvironmentConfig;

  private constructor() {
    this.loadEnvFile();
    this.config = this.buildConfig();
  }

  // ─── Singleton access ────────────────────────────────────────────────────

  public static getInstance(): EnvironmentManager {
    if (!EnvironmentManager.instance) {
      EnvironmentManager.instance = new EnvironmentManager();
    }
    return EnvironmentManager.instance;
  }

  /** Reset the singleton — useful between test suites in watch mode. */
  public static reset(): void {
    EnvironmentManager.instance = null;
  }

  // ─── Public accessors ────────────────────────────────────────────────────

  public getConfig(): IEnvironmentConfig {
    return this.config;
  }

  public get<K extends keyof IEnvironmentConfig>(key: K): IEnvironmentConfig[K] {
    return this.config[key];
  }

  public getBaseUrl(): string {
    return this.config.baseUrl;
  }

  public getApiBaseUrl(): string {
    return this.config.apiBaseUrl;
  }

  public isProduction(): boolean {
    return this.config.env === 'prod';
  }

  public isDevelopment(): boolean {
    return this.config.env === 'dev';
  }

  // ─── Private helpers ─────────────────────────────────────────────────────

  /**
   * Loads the correct .env file based on APP_ENV.
   * Falls back to .env.dev if the file does not exist.
   */
  private loadEnvFile(): void {
    const env: string = process.env['APP_ENV'] ?? 'dev';
    const envFilePath = path.resolve(process.cwd(), `.env.${env}`);
    const fallbackPath = path.resolve(process.cwd(), '.env.example');

    const targetPath = fs.existsSync(envFilePath) ? envFilePath : fallbackPath;
    dotenv.config({ path: targetPath });

    // Also load base .env if it exists (shared secrets override pattern)
    const basePath = path.resolve(process.cwd(), '.env');
    if (fs.existsSync(basePath)) {
      dotenv.config({ path: basePath, override: false });
    }
  }

  private buildConfig(): IEnvironmentConfig {
    return {
      env: this.parseEnv(process.env['APP_ENV']),
      baseUrl: this.requireString('BASE_URL'),
      apiBaseUrl: this.requireString('API_BASE_URL'),
      credentials: {
        standardUser: this.requireString('STANDARD_USER'),
        standardPassword: this.requireString('STANDARD_PASSWORD'),
        lockedUser: this.getString('LOCKED_USER', 'locked_out_user'),
        lockedPassword: this.getString('LOCKED_PASSWORD', 'secret_sauce'),
        problemUser: this.getString('PROBLEM_USER', 'problem_user'),
        problemPassword: this.getString('PROBLEM_PASSWORD', 'secret_sauce'),
        perfGlitchUser: this.getString('PERF_GLITCH_USER', 'performance_glitch_user'),
        perfGlitchPassword: this.getString('PERF_GLITCH_PASSWORD', 'secret_sauce'),
      },
      timeouts: {
        default: this.getNumber('DEFAULT_TIMEOUT', 30_000),
        navigation: this.getNumber('NAVIGATION_TIMEOUT', 60_000),
        expect: this.getNumber('EXPECT_TIMEOUT', 10_000),
      },
      browser: {
        headless: this.getBoolean('HEADLESS', true),
        browser: this.parseBrowser(process.env['BROWSER']),
        slowMo: this.getNumber('SLOW_MO', 0),
        retries: this.getNumber('RETRIES', 2),
        workers: this.getNumber('WORKERS', 4),
      },
      reporting: {
        logLevel: this.parseLogLevel(process.env['LOG_LEVEL']),
        enableVideo: this.getBoolean('ENABLE_VIDEO', false),
        enableScreenshots: this.getBoolean('ENABLE_SCREENSHOTS', true),
        enableTraces: this.getBoolean('ENABLE_TRACES', true),
      },
    };
  }

  // ─── Parse helpers (private, strongly typed) ─────────────────────────────

  private parseEnv(value: string | undefined): Environment {
    const valid: Environment[] = ['dev', 'qa', 'prod'];
    const env = (value ?? 'dev') as Environment;
    if (!valid.includes(env)) {
      throw new Error(`Invalid APP_ENV "${value}". Must be one of: ${valid.join(', ')}`);
    }
    return env;
  }

  private parseBrowser(value: string | undefined): BrowserType {
    const valid: BrowserType[] = ['chromium', 'firefox', 'webkit'];
    const browser = (value ?? 'chromium') as BrowserType;
    if (!valid.includes(browser)) {
      throw new Error(`Invalid BROWSER "${value}". Must be one of: ${valid.join(', ')}`);
    }
    return browser;
  }

  private parseLogLevel(value: string | undefined): LogLevel {
    const valid: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    const level = (value ?? 'info') as LogLevel;
    return valid.includes(level) ? level : 'info';
  }

  private requireString(key: string): string {
    const value = process.env[key];
    if (!value) {
      throw new Error(`Required environment variable "${key}" is not set.`);
    }
    return value;
  }

  private getString(key: string, defaultValue: string): string {
    return process.env[key] ?? defaultValue;
  }

  private getNumber(key: string, defaultValue: number): number {
    const raw = process.env[key];
    if (!raw) {
      return defaultValue;
    }
    const parsed = parseInt(raw, 10);
    if (isNaN(parsed)) {
      throw new Error(`Environment variable "${key}" must be a number, got "${raw}".`);
    }
    return parsed;
  }

  private getBoolean(key: string, defaultValue: boolean): boolean {
    const raw = process.env[key];
    if (!raw) {
      return defaultValue;
    }
    return raw.toLowerCase() === 'true';
  }
}

/** Convenience export — a pre-resolved singleton for direct use in helpers */
export const envManager = EnvironmentManager.getInstance();
