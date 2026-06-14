/**
 * @file src/config/constants.ts
 * @description Framework-wide constants.
 *
 * Design:
 *  - All magic strings/numbers live here (DRY). If SauceDemo renames a route,
 *    one edit here propagates everywhere.
 *  - `as const` makes every value a literal type, enabling exhaustive checks.
 */

// ─── URL Paths ────────────────────────────────────────────────────────────────

export const ROUTES = {
  LOGIN: '/',
  INVENTORY: '/inventory.html',
  CART: '/cart.html',
  CHECKOUT_STEP_ONE: '/checkout-step-one.html',
  CHECKOUT_STEP_TWO: '/checkout-step-two.html',
  CHECKOUT_COMPLETE: '/checkout-complete.html',
} as const;

export type Route = (typeof ROUTES)[keyof typeof ROUTES];

// ─── SauceDemo credentials (public demo site — not sensitive) ─────────────────

export const SAUCE_USERS = {
  STANDARD: 'standard_user',
  LOCKED: 'locked_out_user',
  PROBLEM: 'problem_user',
  PERF_GLITCH: 'performance_glitch_user',
  ERROR: 'error_user',
  VISUAL: 'visual_user',
} as const;

export const SAUCE_PASSWORD = 'secret_sauce';

// ─── Product names ────────────────────────────────────────────────────────────

export const PRODUCTS = {
  BACKPACK: 'Sauce Labs Backpack',
  BIKE_LIGHT: 'Sauce Labs Bike Light',
  BOLT_SHIRT: 'Sauce Labs Bolt T-Shirt',
  FLEECE_JACKET: 'Sauce Labs Fleece Jacket',
  ONESIE: 'Sauce Labs Onesie',
  RED_SHIRT: 'Test.allTheThings() T-Shirt (Red)',
} as const;

export type ProductName = (typeof PRODUCTS)[keyof typeof PRODUCTS];

export const TOTAL_PRODUCT_COUNT = 6;

// ─── Sort option values ────────────────────────────────────────────────────────

export const SORT_OPTIONS = {
  AZ: 'az',
  ZA: 'za',
  LOW_HIGH: 'lohi',
  HIGH_LOW: 'hilo',
} as const;

// ─── Error messages ───────────────────────────────────────────────────────────

export const ERROR_MESSAGES = {
  USERNAME_REQUIRED: 'Epic sadface: Username is required',
  PASSWORD_REQUIRED: 'Epic sadface: Password is required',
  CREDENTIALS_MISMATCH: 'Epic sadface: Username and password do not match any user in this service',
  USER_LOCKED_OUT: 'Epic sadface: Sorry, this user has been locked out.',
  CHECKOUT_FIRST_NAME: 'Error: First Name is required',
  CHECKOUT_LAST_NAME: 'Error: Last Name is required',
  CHECKOUT_POSTAL_CODE: 'Error: Postal Code is required',
} as const;

// ─── Timeouts (ms) ────────────────────────────────────────────────────────────

export const TIMEOUTS = {
  SHORT: 3_000,
  DEFAULT: 10_000,
  MEDIUM: 20_000,
  LONG: 45_000,
  NAVIGATION: 60_000,
  ANIMATION: 500,
  DEBOUNCE: 300,
} as const;

// ─── Retry configuration ──────────────────────────────────────────────────────

export const RETRY = {
  MAX_ATTEMPTS: 3,
  BASE_DELAY_MS: 500,
  MAX_DELAY_MS: 8_000,
} as const;

// ─── Viewport sizes ───────────────────────────────────────────────────────────

export const VIEWPORTS = {
  DESKTOP: { width: 1280, height: 720 },
  LAPTOP: { width: 1024, height: 768 },
  TABLET: { width: 768, height: 1024 },
  MOBILE: { width: 375, height: 667 },
} as const;

// ─── HTTP Status codes ────────────────────────────────────────────────────────

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  UNPROCESSABLE: 422,
  TOO_MANY_REQUESTS: 429,
  SERVER_ERROR: 500,
} as const;

// ─── Allure severity levels ───────────────────────────────────────────────────

export const SEVERITY = {
  BLOCKER: 'blocker',
  CRITICAL: 'critical',
  NORMAL: 'normal',
  MINOR: 'minor',
  TRIVIAL: 'trivial',
} as const;

// ─── Test tags for grep filtering ─────────────────────────────────────────────

export const TAGS = {
  SMOKE: '@smoke',
  REGRESSION: '@regression',
  SANITY: '@sanity',
  E2E: '@e2e',
  API: '@api',
  VISUAL: '@visual',
  ACCESSIBILITY: '@a11y',
  NEGATIVE: '@negative',
} as const;
