/**
 * @file src/types/index.ts
 * @description Central type definitions for the framework.
 *
 * Design: All shared types live here (DRY principle) so every module
 * imports from a single authoritative source. Using `interface` for
 * object shapes (extensible) and `type` for unions/aliases.
 */

// ─────────────────────────────────────────────
// Environment
// ─────────────────────────────────────────────

/** Supported deployment environments */
export type Environment = 'dev' | 'qa' | 'prod';

/** Supported log verbosity levels */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/** Supported browser engines */
export type BrowserType = 'chromium' | 'firefox' | 'webkit';

// ─────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────

/** Full environment-level configuration contract */
export interface IEnvironmentConfig {
  readonly env: Environment;
  readonly baseUrl: string;
  readonly apiBaseUrl: string;
  readonly credentials: ICredentials;
  readonly timeouts: ITimeoutConfig;
  readonly browser: IBrowserConfig;
  readonly reporting: IReportingConfig;
}

export interface ICredentials {
  readonly standardUser: string;
  readonly standardPassword: string;
  readonly lockedUser: string;
  readonly lockedPassword: string;
  readonly problemUser: string;
  readonly problemPassword: string;
  readonly perfGlitchUser: string;
  readonly perfGlitchPassword: string;
}

export interface ITimeoutConfig {
  readonly default: number;
  readonly navigation: number;
  readonly expect: number;
}

export interface IBrowserConfig {
  readonly headless: boolean;
  readonly browser: BrowserType;
  readonly slowMo: number;
  readonly retries: number;
  readonly workers: number;
}

export interface IReportingConfig {
  readonly logLevel: LogLevel;
  readonly enableVideo: boolean;
  readonly enableScreenshots: boolean;
  readonly enableTraces: boolean;
}

// ─────────────────────────────────────────────
// Test Data
// ─────────────────────────────────────────────

/** User credential pair used across tests */
export interface IUserCredentials {
  readonly username: string;
  readonly password: string;
}

/** SauceDemo product representation */
export interface IProduct {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly price: number;
  readonly imageUrl?: string;
}

/** Customer billing address */
export interface IAddress {
  readonly firstName: string;
  readonly lastName: string;
  readonly postalCode: string;
}

/** Checkout order details */
export interface IOrderDetails {
  readonly customer: IAddress;
  readonly items: IProduct[];
  readonly total?: number;
}

/** Generated test user with profile data */
export interface ITestUser {
  readonly username: string;
  readonly password: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly email: string;
  readonly postalCode: string;
}

// ─────────────────────────────────────────────
// API
// ─────────────────────────────────────────────

/** HTTP verb subset used by the API client */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/** Options passed to the API client for each request */
export interface IApiRequestOptions {
  readonly method: HttpMethod;
  readonly endpoint: string;
  readonly body?: Record<string, unknown>;
  readonly headers?: Record<string, string>;
  readonly queryParams?: Record<string, string>;
}

/** Typed API response wrapper */
export interface IApiResponse<T = unknown> {
  readonly status: number;
  readonly headers: Record<string, string>;
  readonly body: T;
  readonly ok: boolean;
}

// ─────────────────────────────────────────────
// Reporting / Logging
// ─────────────────────────────────────────────

/** Structured log entry emitted by the Logger */
export interface ILogEntry {
  readonly level: LogLevel;
  readonly message: string;
  readonly timestamp: string;
  readonly context?: string;
  readonly data?: Record<string, unknown>;
}

/** Allure metadata for test categorisation */
export interface IAllureMeta {
  readonly feature?: string;
  readonly story?: string;
  readonly severity?: 'blocker' | 'critical' | 'normal' | 'minor' | 'trivial';
  readonly labels?: Record<string, string>;
}

// ─────────────────────────────────────────────
// Page / Component helpers
// ─────────────────────────────────────────────

/** Selector strategy descriptor */
export interface ILocatorStrategy {
  readonly strategy: 'role' | 'testId' | 'label' | 'placeholder' | 'text' | 'css' | 'xpath';
  readonly value: string;
  readonly options?: Record<string, unknown>;
}

/** Sort options available on the Inventory page */
export type SortOption = 'az' | 'za' | 'lohi' | 'hilo';
