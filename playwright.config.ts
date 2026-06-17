/**
 * @file playwright.config.ts
 * @description Master Playwright configuration.
 *
 * Design decisions:
 *  - All configurable values come from EnvironmentManager (no magic numbers here).
 *  - Multiple reporters run simultaneously: Allure for rich HTML, Playwright's
 *    built-in HTML reporter as a quick fallback, and 'list' for live CI output.
 *  - Projects define browser/device matrix — add more here without touching tests.
 *  - `fullyParallel: true` maximises CI throughput; `retries` handles flakiness.
 */

import { defineConfig, devices } from '@playwright/test';
import { EnvironmentManager } from './src/helpers/EnvironmentManager';

// Instantiate config before Playwright reads this file
const envManager = EnvironmentManager.getInstance();
const config = envManager.getConfig();

export default defineConfig({
  // ── Discovery ────────────────────────────────────────────────────────────
  testDir: './tests',
  testMatch: ['**/*.spec.ts'],

  // ── Execution ────────────────────────────────────────────────────────────
  fullyParallel: true,
  forbidOnly: !!process.env['CI'], // Fail CI if test.only is committed
  retries: config.browser.retries,
  workers: process.env['CI'] ? 2 : config.browser.workers,
  timeout: config.timeouts.default,

  // ── Expect ───────────────────────────────────────────────────────────────
  expect: {
    timeout: config.timeouts.expect,
  },

  // ── Reporting ────────────────────────────────────────────────────────────
  reporter: [
    // 1. Live console output (best for reading CI logs line-by-line)
    ['list'],

    // 2. Playwright's built-in HTML report
    [
      'html',
      {
        outputFolder: 'playwright-report',
        open: 'never', // Don't auto-open in CI; run `npm run report:playwright` locally
      },
    ],

    // 3. Allure reporter for rich, stakeholder-friendly HTML reports
    [
      'allure-playwright',
      {
        outputFolder: 'allure-results',
        suiteTitle: false,
        // Attach environment info visible on the Allure "Environment" widget
        environmentInfo: {
          App_Env: config.env,
          Base_URL: config.baseUrl,
          Browser: config.browser.browser,
          Node_Version: process.version,
        },
      },
    ],

    // 4. Machine-readable JSON for CI dashboards / custom post-processing
    ['json', { outputFile: 'test-results/results.json' }],

    // 5. JUnit XML for CI systems (Jenkins, GitHub Actions test summary, etc.)
    ['junit', { outputFile: 'test-results/junit-results.xml' }],
  ],

  // ── Global hooks ─────────────────────────────────────────────────────────
  globalSetup: './global-setup.ts',
  globalTeardown: './global-teardown.ts',

  // ── Per-test defaults ─────────────────────────────────────────────────────
  use: {
    baseURL: config.baseUrl,
    headless: config.browser.headless,
    slowMo: config.browser.slowMo,

    // Navigation
    navigationTimeout: config.timeouts.navigation,
    actionTimeout: config.timeouts.default,

    // Evidence collection
    screenshot: config.reporting.enableScreenshots ? 'only-on-failure' : 'off',
    video: config.reporting.enableVideo ? 'retain-on-failure' : 'off',
    trace: config.reporting.enableTraces ? 'retain-on-failure' : 'off',

    // Locale + timezone for deterministic date handling
    locale: 'en-US',
    timezoneId: 'America/New_York',

    // Viewport
    viewport: { width: 1280, height: 720 },

    // Don't let the browser prompt interfere with tests
    bypassCSP: false,
    ignoreHTTPSErrors: true,
  },

  // ── Output ───────────────────────────────────────────────────────────────
  outputDir: 'test-results/artifacts',

  // ── Browser / device projects ─────────────────────────────────────────────
  projects: [
    // ── Desktop browsers ──
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    // ── Mobile viewports ──
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 13'] },
    },

    // ── Branded browsers (requires local installs) ──
    // Uncomment to enable:
    // {
    //   name: 'edge',
    //   use: { ...devices['Desktop Edge'], channel: 'msedge' },
    // },
    // {
    //   name: 'chrome',
    //   use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    // },
  ],
});
