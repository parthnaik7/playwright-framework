/**
 * @file src/services/AuthService.ts
 * @description Manages authentication state — login, logout, session persistence.
 *
 * Design:
 *  - Saves browser storage state after a successful login so subsequent tests
 *    can skip the UI login (huge time saving in CI).
 *  - Follows the Service Layer pattern: all auth concerns are isolated here,
 *    not scattered across test files.
 */

import * as fs from 'fs';
import * as path from 'path';
import type { Browser, BrowserContext, Page } from '@playwright/test';
import { Logger } from '../utils/Logger';
import { LoginPage } from '../pages/LoginPage';
import { InventoryPage } from '../pages/InventoryPage';
import { envManager } from '../helpers/EnvironmentManager';
import type { IUserCredentials } from '../types/index';

const log = Logger.forContext('AuthService');
const STORAGE_STATE_DIR = path.resolve(process.cwd(), 'test-results', 'auth');

export class AuthService {
  // ─── Storage state paths ──────────────────────────────────────────────────

  public static getStorageStatePath(username: string): string {
    return path.join(STORAGE_STATE_DIR, `${username}.json`);
  }

  private static ensureDir(): void {
    if (!fs.existsSync(STORAGE_STATE_DIR)) {
      fs.mkdirSync(STORAGE_STATE_DIR, { recursive: true });
    }
  }

  // ─── UI Login (full browser flow) ────────────────────────────────────────

  /**
   * Performs a full UI login and optionally saves browser storage state to disk.
   * Call this from `globalSetup` to create session files for reuse.
   */
  public static async loginAndSaveState(
    browser: Browser,
    credentials: IUserCredentials,
  ): Promise<string> {
    this.ensureDir();
    const context: BrowserContext = await browser.newContext();
    const page: Page = await context.newPage();

    const loginPage = new LoginPage(page);
    const inventoryPage = new InventoryPage(page);

    log.info(`Performing UI login for: ${credentials.username}`);
    await loginPage.navigate();
    await loginPage.login(credentials);
    await inventoryPage.assertOnInventoryPage();

    const statePath = this.getStorageStatePath(credentials.username);
    await context.storageState({ path: statePath });
    log.info(`Storage state saved: ${statePath}`);

    await context.close();
    return statePath;
  }

  // ─── Fast login (inject storage state) ───────────────────────────────────

  /**
   * Creates a new browser context pre-loaded with saved session cookies/storage.
   * Tests using this method skip the login UI entirely — ~10× faster.
   */
  public static async createAuthenticatedContext(
    browser: Browser,
    username: string,
  ): Promise<BrowserContext> {
    const statePath = this.getStorageStatePath(username);

    if (!fs.existsSync(statePath)) {
      throw new Error(
        `No storage state found for "${username}". Run global setup first.\n` +
          `Expected path: ${statePath}`,
      );
    }

    log.debug(`Loading storage state for: ${username}`);
    return browser.newContext({ storageState: statePath });
  }

  // ─── Session checks ───────────────────────────────────────────────────────

  public static hasStorageState(username: string): boolean {
    return fs.existsSync(this.getStorageStatePath(username));
  }

  public static clearStorageState(username: string): void {
    const statePath = this.getStorageStatePath(username);
    if (fs.existsSync(statePath)) {
      fs.unlinkSync(statePath);
      log.info(`Storage state cleared for: ${username}`);
    }
  }

  // ─── In-test logout via page ──────────────────────────────────────────────

  /**
   * Logs out through the UI — used in tests that explicitly verify logout behaviour.
   */
  public static async logoutViaUI(page: Page): Promise<void> {
    log.step('Logging out via UI');
    const inventoryPage = new InventoryPage(page);
    await inventoryPage.header.logout();
    // After logout SauceDemo redirects back to "/"
    await page.waitForURL(envManager.getBaseUrl() + '/', { timeout: 10_000 });
    log.info('Logout successful');
  }
}
