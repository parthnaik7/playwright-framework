/**
 * @file src/components/HeaderComponent.ts
 * @description Reusable component object for the SauceDemo site header.
 *
 * Design:
 *  - Components are NOT pages — they don't extend BasePage.
 *  - They accept a `Page` reference and encapsulate a repeating UI region
 *    shared by multiple pages (DRY). Any page that includes the header
 *    instantiates this component rather than duplicating locators.
 *  - Follows the Composite pattern: page objects compose components.
 */

import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { Logger } from '../utils/Logger';
import { WaitUtils } from '../utils/WaitUtils';

export class HeaderComponent {
  private readonly page: Page;
  private readonly log: Logger;

  // ─── Locators ─────────────────────────────────────────────────────────────

  public readonly cartIcon = this.page.locator('.shopping_cart_link');
  public readonly cartBadge = this.page.locator('.shopping_cart_badge');
  public readonly burgerMenuButton = this.page.locator('#react-burger-menu-btn');
  public readonly burgerMenuClose = this.page.locator('#react-burger-cross-btn');
  public readonly appLogo = this.page.locator('.app_logo');

  // ─── Burger menu items ────────────────────────────────────────────────────

  private readonly allItemsLink = this.page.locator('#inventory_sidebar_link');
  private readonly aboutLink = this.page.locator('#about_sidebar_link');
  private readonly logoutLink = this.page.locator('#logout_sidebar_link');
  private readonly resetAppStateLink = this.page.locator('#reset_sidebar_link');
  private readonly burgerMenuContainer = this.page.locator('.bm-menu-wrap');

  public constructor(page: Page) {
    this.page = page;
    this.log = Logger.forContext('HeaderComponent');
  }

  // ─── Actions ──────────────────────────────────────────────────────────────

  /** Navigates to the cart page by clicking the cart icon. */
  public async goToCart(): Promise<void> {
    this.log.step('Navigating to cart via header icon');
    await this.cartIcon.click();
  }

  /** Opens the burger/sidebar navigation menu. */
  public async openMenu(): Promise<void> {
    this.log.step('Opening burger menu');
    await this.burgerMenuButton.click();
    // Wait for the slide-in animation to complete
    await this.burgerMenuContainer.waitFor({ state: 'visible' });
  }

  /** Closes the burger menu. */
  public async closeMenu(): Promise<void> {
    this.log.step('Closing burger menu');
    await this.burgerMenuClose.click();
    await this.burgerMenuContainer.waitFor({ state: 'hidden' });
  }

  /** Logs out via the sidebar menu. */
  public async logout(): Promise<void> {
    this.log.step('Logging out via header menu');
    await this.openMenu();
    await this.allItemsLink.waitFor({ state: 'visible' });
    await this.logoutLink.click();
  }

  /** Navigates to "All Items" via sidebar. */
  public async goToAllItems(): Promise<void> {
    this.log.step('Navigating to All Items via menu');
    await this.openMenu();
    await this.allItemsLink.click();
  }

  /** Resets the application state (clears cart, resets button states). */
  public async resetAppState(): Promise<void> {
    this.log.step('Resetting application state via menu');
    await this.openMenu();
    await this.resetAppStateLink.click();
    await this.closeMenu();
  }

  // ─── Read helpers ─────────────────────────────────────────────────────────

  /** Returns the numeric cart item count shown in the badge, or 0 if badge is hidden. */
  public async getCartCount(): Promise<number> {
    const isVisible = await this.cartBadge.isVisible();
    if (!isVisible) {
      return 0;
    }
    const text = await this.cartBadge.textContent();
    return parseInt(text?.trim() ?? '0', 10);
  }

  // ─── Assertions ───────────────────────────────────────────────────────────

  public async assertCartBadgeCount(expected: number): Promise<void> {
    if (expected === 0) {
      // Badge disappears entirely when cart is empty
      await expect(this.cartBadge).toBeHidden();
    } else {
      await expect(this.cartBadge).toBeVisible();
      await expect(this.cartBadge).toHaveText(String(expected));
    }
  }

  public async assertCartBadgeVisible(): Promise<void> {
    await expect(this.cartBadge).toBeVisible();
  }

  public async assertLogoVisible(): Promise<void> {
    await expect(this.appLogo).toBeVisible();
  }

  public async assertMenuOpen(): Promise<void> {
    await expect(this.burgerMenuContainer).toBeVisible();
  }

  /** Waits up to `timeout` ms for the cart badge to show `expected` items. */
  public async waitForCartCount(expected: number, timeout = 5_000): Promise<void> {
    await WaitUtils.waitForCondition(
      async () => (await this.getCartCount()) === expected,
      `cart badge to show ${expected}`,
      timeout,
    );
  }
}
