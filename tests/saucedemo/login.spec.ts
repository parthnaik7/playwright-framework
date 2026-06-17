/**
 * @file tests/saucedemo/login.spec.ts
 * @description Login test suite for SauceDemo.
 *
 * Covers:
 *  - Successful login with standard user                @smoke @regression
 *  - Failed login with locked-out user                  @regression
 *  - Failed login with invalid credentials              @regression
 *  - Empty form submission                              @regression
 *  - Error dismissal                                    @regression
 *  - Logout flow                                        @regression
 *
 * Design:
 *  - Imports `test` and `expect` from the custom fixtures (not from @playwright/test
 *    directly) so all page objects and utilities are automatically injected.
 *  - Each test is fully independent — no shared mutable state between tests.
 *  - `test.describe` groups related scenarios; `test.beforeEach` navigates fresh.
 *  - Tags (@smoke, @regression) allow targeted runs via `--grep`.
 */

import { test, expect } from '../../src/fixtures/test-fixtures';
import { Logger } from '../../src/utils/Logger';

const log = Logger.forContext('LoginSpec');

// ─────────────────────────────────────────────────────────────────────────────
// Login test suite
// ─────────────────────────────────────────────────────────────────────────────

test.describe('SauceDemo — Login', () => {
  test.beforeEach(async ({ loginPage }) => {
    // Navigate to a clean login page before every test
    await loginPage.navigate();
    await loginPage.assertLoaded();
  });

  // ── Happy path ─────────────────────────────────────────────────────────

  test('should login successfully with valid standard user credentials @smoke @regression', async ({
    loginPage,
    inventoryPage,
    standardCredentials,
  }) => {
    log.step('Logging in with standard user');
    await loginPage.login(standardCredentials);

    // Assert navigation to inventory page
    await inventoryPage.assertOnInventoryPage();
    log.info('✅ Standard user login successful');

    // Extra assertions for completeness
    await inventoryPage.assertTitle(/Swag Labs/);
    const count = await inventoryPage.getProductCount();
    expect(count, 'Inventory should show 6 products').toBe(6);
  });

  // ── Locked-out user ────────────────────────────────────────────────────

  test('should show error message for locked-out user @regression', async ({
    loginPage,
    lockedCredentials,
  }) => {
    log.step('Attempting login with locked-out user');
    await loginPage.login(lockedCredentials);

    await loginPage.assertErrorVisible();
    const errorText = await loginPage.getErrorText();
    expect(errorText).toContain('Sorry, this user has been locked out');

    // User should remain on the login page
    await loginPage.assertLoginPageVisible();
    log.info('✅ Locked-out user correctly blocked');
  });

  // ── Invalid credentials ────────────────────────────────────────────────

  test('should show error for invalid username and password @regression', async ({ loginPage }) => {
    await loginPage.loginExpectingError(
      { username: 'wrong_user', password: 'wrong_pass' },
      'Username and password do not match',
    );
    await loginPage.assertLoginPageVisible();
  });

  test('should show error when only username is provided @regression', async ({ loginPage }) => {
    await loginPage.loginWith('standard_user', '');
    await loginPage.assertErrorVisible();
    const errorText = await loginPage.getErrorText();
    expect(errorText).toContain('Password is required');
  });

  test('should show error when only password is provided @regression', async ({ loginPage }) => {
    await loginPage.loginWith('', 'secret_sauce');
    await loginPage.assertErrorVisible();
    const errorText = await loginPage.getErrorText();
    expect(errorText).toContain('Username is required');
  });

  // ── Empty form submission ──────────────────────────────────────────────

  test('should show error when submitting empty form @regression', async ({ loginPage }) => {
    log.step('Submitting empty login form');
    await loginPage.click(loginPage.loginButton);

    await loginPage.assertErrorVisible();
    const errorText = await loginPage.getErrorText();
    expect(errorText).toContain('Username is required');
  });

  // ── Error dismissal ────────────────────────────────────────────────────

  test('should be able to dismiss error message @regression', async ({
    loginPage,
    lockedCredentials,
  }) => {
    // Trigger an error first
    await loginPage.login(lockedCredentials);
    await loginPage.assertErrorVisible();

    // Dismiss it
    await loginPage.dismissError();
    await loginPage.assertErrorHidden();
    log.info('✅ Error message dismissed successfully');
  });

  // ── Page elements validation ───────────────────────────────────────────

  test('should display all login page elements correctly @regression', async ({ loginPage }) => {
    log.step('Verifying login page elements');
    await loginPage.assertLoginPageVisible();

    // Check input placeholder text
    await expect(loginPage.usernameInput).toHaveAttribute('placeholder', 'Username');
    await expect(loginPage.passwordInput).toHaveAttribute('placeholder', 'Password');
    await expect(loginPage.passwordInput).toHaveAttribute('type', 'password');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Logout tests (require authenticated session)
// ─────────────────────────────────────────────────────────────────────────────

test.describe('SauceDemo — Logout', () => {
  test('should logout successfully from the inventory page @regression', async ({
    authenticatedPage,
    loginPage,
  }) => {
    // authenticatedPage fixture: the user is already logged in
    log.step('Logging out via header menu');

    // Use the inventory page's header component to logout
    const { InventoryPage } = await import('../../src/pages/InventoryPage');
    const inventoryPage = new InventoryPage(authenticatedPage);
    await inventoryPage.header.logout();

    // Should redirect back to login page
    await loginPage.assertLoginPageVisible();
    await loginPage.assertUrl('/');
    log.info('✅ Logout redirected to login page');
  });

  test('should not be able to access inventory page after logout @regression', async ({
    authenticatedPage,
    loginPage,
  }) => {
    const { InventoryPage } = await import('../../src/pages/InventoryPage');
    const inventoryPage = new InventoryPage(authenticatedPage);

    // Logout first
    await inventoryPage.header.logout();
    await loginPage.assertLoginPageVisible();

    // Attempt direct navigation to inventory — should redirect back to login
    await authenticatedPage.goto('/inventory.html');
    await loginPage.assertLoginPageVisible();
    log.info('✅ Protected route correctly redirected after logout');
  });
});
