/**
 * @file global-setup.ts
 * @description Runs ONCE before the entire test suite.
 *
 * Responsibilities:
 *  1. Load the correct environment config.
 *  2. Perform a UI login and save browser storage state to disk.
 *     Subsequent tests can load this state and skip the login screen.
 *  3. Create required output directories.
 *  4. Log the active configuration so CI logs are self-documenting.
 *
 * Playwright executes this file via `globalSetup` in playwright.config.ts.
 */

import { chromium, firefox, webkit } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { EnvironmentManager } from './src/helpers/EnvironmentManager';
import { AuthService } from './src/services/AuthService';
import { Logger } from './src/utils/Logger';

const log = Logger.forContext('GlobalSetup');

// ─── Output directories ───────────────────────────────────────────────────────

const OUTPUT_DIRS = [
  'test-results',
  'test-results/logs',
  'test-results/screenshots',
  'test-results/screenshots/failures',
  'test-results/auth',
  'allure-results',
];

async function globalSetup(): Promise<void> {
  log.info('═══════════════════════════════════════════════════════');
  log.info('  🚀 PLAYWRIGHT FRAMEWORK — GLOBAL SETUP');
  log.info('═══════════════════════════════════════════════════════');

  // ── 1. Ensure output directories exist ─────────────────────────────────
  for (const dir of OUTPUT_DIRS) {
    const resolved = path.resolve(process.cwd(), dir);
    if (!fs.existsSync(resolved)) {
      fs.mkdirSync(resolved, { recursive: true });
      log.debug(`Created directory: ${resolved}`);
    }
  }

  // ── 2. Load and log environment config ──────────────────────────────────
  const envManager = EnvironmentManager.getInstance();
  const config = envManager.getConfig();

  log.info(`Environment  : ${config.env.toUpperCase()}`);
  log.info(`Base URL     : ${config.baseUrl}`);
  log.info(`Browser      : ${config.browser.browser}`);
  log.info(`Headless     : ${String(config.browser.headless)}`);
  log.info(`Workers      : ${config.browser.workers}`);
  log.info(`Retries      : ${config.browser.retries}`);
  log.info(`Log level    : ${config.reporting.logLevel}`);

  // ── 3. Seed auth storage state ──────────────────────────────────────────
  // Launch a throw-away browser to perform the login and persist session cookies.
  // All tests can then use storageState: path instead of going through the login UI.

  log.info('Seeding authentication storage state...');

  const browserType = config.browser.browser;
  let browser;
  if (browserType === 'firefox') {
    browser = await firefox.launch({ headless: config.browser.headless });
  } else if (browserType === 'webkit') {
    browser = await webkit.launch({ headless: config.browser.headless });
  } else {
    browser = await chromium.launch({ headless: config.browser.headless });
  }

  try {
    await AuthService.loginAndSaveState(browser, {
      username: config.credentials.standardUser,
      password: config.credentials.standardPassword,
    });
    log.info(`✅ Storage state saved for: ${config.credentials.standardUser}`);
  } catch (err) {
    // Log the error but don't abort setup — tests that don't need auth will still run.
    log.error(
      'Failed to seed storage state. Tests requiring pre-auth will fall back to UI login.',
      err,
    );
  } finally {
    await browser.close();
  }

  // ── 4. Write a run manifest for debugging ───────────────────────────────
  const manifest = {
    startedAt: new Date().toISOString(),
    environment: config.env,
    baseUrl: config.baseUrl,
    browser: config.browser.browser,
    nodeVersion: process.version,
  };

  const manifestPath = path.resolve(process.cwd(), 'test-results', 'run-manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  log.info(`Run manifest written: ${manifestPath}`);

  log.info('═══════════════════════════════════════════════════════');
  log.info('  ✅ GLOBAL SETUP COMPLETE');
  log.info('═══════════════════════════════════════════════════════');
}

export default globalSetup;
