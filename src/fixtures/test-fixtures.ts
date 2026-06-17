/**
 * @file src/fixtures/test-fixtures.ts
 * @description Custom Playwright fixtures that extend the base `test` object.
 *
 * Design:
 *  - Fixtures follow the Dependency Injection pattern: each test receives exactly
 *    what it needs, with proper setup and teardown handled automatically.
 *  - Page objects are created fresh per test (function scope) for isolation.
 *  - Screenshots + traces are automatically captured on failure (no boilerplate in tests).
 *  - The `authenticatedPage` fixture creates a pre-logged-in page — tests that
 *    don't need to test login itself should use this for speed.
 *
 * Usage in a test file:
 *   import { test, expect } from '../fixtures/test-fixtures';
 *   test('my test', async ({ loginPage, inventoryPage }) => { ... });
 */

import { test as base, expect, type Page } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { InventoryPage } from '../pages/InventoryPage';
import { CartPage } from '../pages/CartPage';
import { CheckoutPage } from '../pages/CheckoutPage';
import { HeaderComponent } from '../components/HeaderComponent';
import { FooterComponent } from '../components/FooterComponent';
import { ApiClient } from '../services/ApiClient';
import { ScreenshotUtils } from '../utils/ScreenshotUtils';
import { Logger } from '../utils/Logger';
import { envManager } from '../helpers/EnvironmentManager';
import type { IUserCredentials } from '../types/index';

// ─── Fixture type declarations ────────────────────────────────────────────────

/** All page objects + utilities available to tests via fixtures. */
export type PageFixtures = {
  // Page Objects
  loginPage: LoginPage;
  inventoryPage: InventoryPage;
  cartPage: CartPage;
  checkoutPage: CheckoutPage;

  // Components
  headerComponent: HeaderComponent;
  footerComponent: FooterComponent;

  // Pre-authenticated page (skips UI login)
  authenticatedPage: Page;

  // Services
  apiClient: ApiClient;

  // Test data
  standardCredentials: IUserCredentials;
  lockedCredentials: IUserCredentials;
};

// ─── Fixture log ─────────────────────────────────────────────────────────────

const log = Logger.forContext('Fixtures');

// ─── Extended test object ─────────────────────────────────────────────────────

export const test = base.extend<PageFixtures>({
  // ── Credentials ─────────────────────────────────────────────────────────

  standardCredentials: async ({}, use) => {
    const { credentials } = envManager.getConfig();
    await use({
      username: credentials.standardUser,
      password: credentials.standardPassword,
    });
  },

  lockedCredentials: async ({}, use) => {
    const { credentials } = envManager.getConfig();
    await use({
      username: credentials.lockedUser,
      password: credentials.lockedPassword,
    });
  },

  // ── Page Objects ─────────────────────────────────────────────────────────
  // Each is scoped to the test's `page` fixture — they share the same browser tab.

  loginPage: async ({ page }, use) => {
    log.debug('Creating LoginPage fixture');
    await use(new LoginPage(page));
  },

  inventoryPage: async ({ page }, use) => {
    log.debug('Creating InventoryPage fixture');
    await use(new InventoryPage(page));
  },

  cartPage: async ({ page }, use) => {
    log.debug('Creating CartPage fixture');
    await use(new CartPage(page));
  },

  checkoutPage: async ({ page }, use) => {
    log.debug('Creating CheckoutPage fixture');
    await use(new CheckoutPage(page));
  },

  // ── Components ────────────────────────────────────────────────────────────

  headerComponent: async ({ page }, use) => {
    await use(new HeaderComponent(page));
  },

  footerComponent: async ({ page }, use) => {
    await use(new FooterComponent(page));
  },

  // ── Authenticated page fixture ────────────────────────────────────────────
  // Performs a programmatic login via UI and passes the logged-in page to the test.
  // If the test never reads `authenticatedPage`, this fixture never runs.

  authenticatedPage: async ({ page }, use, testInfo) => {
    log.debug('Setting up authenticated page');
    const { credentials } = envManager.getConfig();
    const loginPage = new LoginPage(page);
    const inventoryPage = new InventoryPage(page);

    await loginPage.navigate();
    await loginPage.login({
      username: credentials.standardUser,
      password: credentials.standardPassword,
    });
    await inventoryPage.assertOnInventoryPage();

    log.info('Authenticated page ready');
    await use(page);

    // ── Teardown ────────────────────────────────────────────────────────────
    // On failure: capture a screenshot and attach it to the report.
    if (testInfo.status !== testInfo.expectedStatus) {
      log.warn(`Test failed: "${testInfo.title}" — capturing failure screenshot`);
      const buffer = await ScreenshotUtils.captureOnFailure(page, testInfo.title);
      await testInfo.attach('failure-screenshot', {
        body: buffer,
        contentType: 'image/png',
      });
    }
  },

  // ── API Client ────────────────────────────────────────────────────────────

  apiClient: async ({ request }, use) => {
    log.debug('Creating ApiClient fixture');
    const client = new ApiClient(request, envManager.getApiBaseUrl());
    await use(client);
  },

  // ── Automatic failure screenshot for ALL tests ────────────────────────────
  // Override the base `page` fixture to add teardown behaviour.
  // This means even tests that don't use `authenticatedPage` get screenshots on fail.

  page: async ({ page }, use, testInfo) => {
    await use(page);

    if (testInfo.status === 'failed' || testInfo.status === 'timedOut') {
      try {
        const buffer = await ScreenshotUtils.captureOnFailure(page, testInfo.title);
        await testInfo.attach('failure-screenshot', {
          body: buffer,
          contentType: 'image/png',
        });
        log.warn(`Failure screenshot attached for: "${testInfo.title}"`);
      } catch (err) {
        log.error('Failed to capture failure screenshot', err);
      }
    }
  },
});

// Re-export expect so tests only need one import
export { expect };
