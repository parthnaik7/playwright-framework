/**
 * @file src/pages/LoginPage.ts
 * @description Page Object for the SauceDemo login screen.
 *
 * Design:
 *  - Extends BasePage (Open/Closed: add behaviour without modifying the base).
 *  - Locators are `readonly` — they never change after construction (SOLID ISP).
 *  - Public action methods (`login`, `loginWithInvalidCredentials`) are the only
 *    API surface exposed to tests — implementation details stay private.
 */

import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { BasePage } from './base/BasePage';
import type { IUserCredentials } from '../types/index';

export class LoginPage extends BasePage {
  protected readonly path = '/';

  // ─── Locators ─────────────────────────────────────────────────────────────
  // Using semantic role selectors where possible — they are more resilient to
  // HTML/CSS refactoring than brittle XPath or CSS class selectors.

  public readonly usernameInput = this.page.locator('[data-test="username"]');
  public readonly passwordInput = this.page.locator('[data-test="password"]');
  public readonly loginButton = this.page.locator('[data-test="login-button"]');
  public readonly errorMessage = this.page.locator('[data-test="error"]');
  public readonly errorButton = this.page.locator('.error-button');

  // Logo / header used as the page-loaded indicator
  private readonly logo = this.page.locator('.login_logo');

  public constructor(page: Page) {
    super(page);
  }

  // ─── Template Method implementation ───────────────────────────────────────

  public async isLoaded(): Promise<boolean> {
    return this.logo.isVisible();
  }

  // ─── Actions ──────────────────────────────────────────────────────────────

  /**
   * Fills in credentials and clicks Login.
   * Navigates to the Inventory page on success; remains on Login on failure.
   */
  public async login(credentials: IUserCredentials): Promise<void> {
    this.log.step(`Logging in as "${credentials.username}"`);
    await this.fill(this.usernameInput, credentials.username);
    await this.fill(this.passwordInput, credentials.password);
    await this.click(this.loginButton);
  }

  /**
   * Convenience overload: accepts username + password strings directly
   * so tests can pass literals without constructing an object.
   */
  public async loginWith(username: string, password: string): Promise<void> {
    await this.login({ username, password });
  }

  /** Attempts login and asserts it failed with the given error substring. */
  public async loginExpectingError(
    credentials: IUserCredentials,
    expectedErrorText: string,
  ): Promise<void> {
    this.log.step(`Attempting login expecting error: "${expectedErrorText}"`);
    await this.login(credentials);
    await expect(this.errorMessage).toBeVisible();
    await this.assertContainsText(this.errorMessage, expectedErrorText);
  }

  /** Dismisses the error message banner. */
  public async dismissError(): Promise<void> {
    this.log.step('Dismissing error message');
    await this.click(this.errorButton);
  }

  /** Reads the current error message text. */
  public async getErrorText(): Promise<string> {
    return this.getText(this.errorMessage);
  }

  // ─── Assertions ───────────────────────────────────────────────────────────

  public async assertLoginPageVisible(): Promise<void> {
    this.log.step('Asserting login page is visible');
    await this.assertVisible(this.usernameInput, 'Username input should be visible');
    await this.assertVisible(this.passwordInput, 'Password input should be visible');
    await this.assertVisible(this.loginButton, 'Login button should be visible');
  }

  public async assertErrorVisible(): Promise<void> {
    await this.assertVisible(this.errorMessage, 'Error message should be visible');
  }

  public async assertErrorHidden(): Promise<void> {
    await this.assertHidden(this.errorMessage);
  }
}
